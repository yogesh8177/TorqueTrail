import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertVehicleSchema,
  insertPostSchema,
  insertDriveLogSchema,
  insertConvoySchema,
  insertPostCommentSchema,
} from "@shared/schema";
import { generateDriveBlog, analyzeVehicleImage, generateRouteRecommendations } from "./openai";
import { calculateReadTime } from "./readTime";
import { generatePublicShareHTML } from "./public-share";
import multer from "multer";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Google Maps configuration endpoint
  app.get('/api/google-maps-config', async (req, res) => {
    try {
      if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ message: "Google Maps API key not configured" });
      }
      
      const scriptUrl = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMap`;
      res.json({ scriptUrl });
    } catch (error) {
      console.error("Error getting Google Maps config:", error);
      res.status(500).json({ message: "Failed to get Google Maps configuration" });
    }
  });

  app.get('/api/user/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get user's drive logs to calculate total kilometers
      const driveLogs = await storage.getUserDriveLogs(userId);
      const totalKilometers = driveLogs.reduce((sum, log) => sum + Number(log.distance), 0);
      
      // Get convoys user has organized or joined
      const userConvoys = await storage.getUserConvoys(userId);
      const convoyParticipations = await storage.getConvoyParticipants(0); // Get all to filter by user
      const joinedConvoys = convoyParticipations.filter(p => p.userId === userId).length;
      
      // Get garage votes for rating
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const garageVotes = await storage.getMonthlyGarageVotes(currentMonth, currentYear);
      const userVotes = garageVotes.find(v => v.userId === userId);
      
      const stats = {
        totalKilometers: Math.round(totalKilometers * 10) / 10, // Round to 1 decimal
        convoysOrganized: userConvoys.length,
        convoysJoined: joinedConvoys,
        totalConvoys: userConvoys.length + joinedConvoys,
        garageRating: userVotes ? userVotes.votes : 0,
        driveLogs: driveLogs.length,
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  // Vehicle routes
  app.post('/api/vehicles', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Handle image upload if present
      let vehicleData = { ...req.body, userId };
      if (req.file) {
        const imagePath = `/uploads/${req.file.filename}`;
        vehicleData.imageUrl = imagePath;
      }
      
      // Convert FormData string values to proper types
      if (vehicleData.year) vehicleData.year = parseInt(vehicleData.year);
      if (vehicleData.horsepower) vehicleData.horsepower = parseInt(vehicleData.horsepower);
      if (vehicleData.isPublic !== undefined) vehicleData.isPublic = vehicleData.isPublic === 'true';
      
      const validatedData = insertVehicleSchema.parse(vehicleData);
      const vehicle = await storage.createVehicle(validatedData);
      res.json(vehicle);
    } catch (error) {
      console.error("Error creating vehicle:", error);
      res.status(500).json({ message: "Failed to create vehicle" });
    }
  });

  app.get('/api/vehicles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vehicles = await storage.getUserVehicles(userId);
      res.json(vehicles);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      res.status(500).json({ message: "Failed to fetch vehicles" });
    }
  });

  app.get('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const vehicle = await storage.getVehicle(vehicleId);
      if (!vehicle) {
        return res.status(404).json({ message: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Error fetching vehicle:", error);
      res.status(500).json({ message: "Failed to fetch vehicle" });
    }
  });

  app.put('/api/vehicles/:id', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      
      // Handle image upload if present
      let updates = { ...req.body };
      if (req.file) {
        const imagePath = `/uploads/${req.file.filename}`;
        updates.imageUrl = imagePath;
      }
      
      // Convert FormData string values to proper types
      if (updates.year) updates.year = parseInt(updates.year);
      if (updates.horsepower) updates.horsepower = parseInt(updates.horsepower);
      if (updates.isPublic !== undefined) updates.isPublic = updates.isPublic === 'true';
      
      const validatedUpdates = insertVehicleSchema.partial().parse(updates);
      const vehicle = await storage.updateVehicle(vehicleId, validatedUpdates);
      res.json(vehicle);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      res.status(500).json({ message: "Failed to update vehicle" });
    }
  });

  app.delete('/api/vehicles/:id', isAuthenticated, async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      await storage.deleteVehicle(vehicleId);
      res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      res.status(500).json({ message: "Failed to delete vehicle" });
    }
  });

  // AI vehicle analysis route
  app.post('/api/vehicles/analyze', isAuthenticated, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }

      console.log("Image received:", req.file.originalname, "Size:", req.file.size);
      const base64Image = req.file.buffer.toString('base64');
      console.log("Calling OpenAI vision API...");
      
      const analysis = await analyzeVehicleImage(base64Image);
      console.log("AI analysis result:", analysis);
      
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing vehicle image:", error);
      res.status(500).json({ 
        message: "Failed to analyze vehicle image", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Post routes
  app.post('/api/posts', isAuthenticated, upload.array('media', 5), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Handle file uploads
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      
      if (req.files) {
        for (const file of req.files) {
          // In a real app, you'd upload to cloud storage and get URLs
          // For now, we'll use base64 data URLs
          const base64 = file.buffer.toString('base64');
          const dataUrl = `data:${file.mimetype};base64,${base64}`;
          
          if (file.mimetype.startsWith('image/')) {
            imageUrls.push(dataUrl);
          } else if (file.mimetype.startsWith('video/')) {
            videoUrls.push(dataUrl);
          }
        }
      }

      // Process tags if provided
      let tagsArray: string[] | undefined;
      if (req.body.tags && req.body.tags.trim()) {
        tagsArray = req.body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }

      // Calculate estimated read time
      const estimatedReadTime = req.body.content ? calculateReadTime(req.body.content, req.body.title) : undefined;

      const postData = insertPostSchema.parse({
        ...req.body,
        userId,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
        vehicleId: req.body.vehicleId ? parseInt(req.body.vehicleId) : undefined,
        isAiGenerated: req.body.isAiGenerated === 'true',
        estimatedReadTime,
        tags: tagsArray,
      });

      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get('/api/posts/feed', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getFeedPosts(limit, offset);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ message: "Failed to fetch feed" });
    }
  });

  app.get('/api/posts/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getUserPosts(userId, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.get('/api/posts/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const posts = await storage.getUserPosts(userId, limit, offset);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching current user posts:", error);
      res.status(500).json({ message: "Failed to fetch user posts" });
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const isLiked = await storage.isPostLikedByUser(postId, userId);
      if (isLiked) {
        await storage.unlikePost(postId, userId);
        res.json({ liked: false });
      } else {
        await storage.likePost(postId, userId);
        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ message: "Failed to toggle post like" });
    }
  });

  app.post('/api/posts/:id/save', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const isSaved = await storage.isPostSavedByUser(postId, userId);
      if (isSaved) {
        await storage.unsavePost(postId, userId);
        res.json({ saved: false });
      } else {
        await storage.savePost(postId, userId);
        res.json({ saved: true });
      }
    } catch (error) {
      console.error("Error toggling post save:", error);
      res.status(500).json({ message: "Failed to toggle post save" });
    }
  });

  app.get('/api/posts/saved', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const savedPosts = await storage.getUserSavedPosts(userId, limit, offset);
      res.json(savedPosts);
    } catch (error) {
      console.error("Error fetching saved posts:", error);
      res.status(500).json({ message: "Failed to fetch saved posts" });
    }
  });

  app.put('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      // First check if the post exists and belongs to the user
      const existingPost = await storage.getPost(postId);
      if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
      }
      
      if (existingPost.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own posts" });
      }

      // Update the post
      const updates: Partial<any> = {};
      if (req.body.title !== undefined) updates.title = req.body.title || null;
      if (req.body.content !== undefined) updates.content = req.body.content;

      const updatedPost = await storage.updatePost(postId, updates);
      res.json(updatedPost);
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ message: "Failed to update post" });
    }
  });

  // Drive log routes
  app.post('/api/drive-logs', isAuthenticated, upload.any(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      console.log('Drive log creation - Request body:', JSON.stringify(req.body, null, 2));
      console.log('Drive log creation - Files:', req.files?.map(f => ({ fieldname: f.fieldname, filename: f.filename })));
      
      // Prepare data for schema validation - let schema handle type conversion
      const cleanData = {
        ...req.body,
        userId,
        startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
        endTime: req.body.endTime && req.body.endTime !== '' ? new Date(req.body.endTime) : null,
        isPublic: req.body.isPublic === 'true' || req.body.isPublic === true,
      };
      
      console.log('Drive log creation - Cleaned data:', JSON.stringify(cleanData, null, 2));
      
      let driveLogData;
      try {
        driveLogData = insertDriveLogSchema.parse(cleanData);
        console.log('Drive log creation - Schema validation passed');
      } catch (validationError) {
        console.error('Drive log creation - Schema validation failed:', validationError);
        return res.status(400).json({ 
          message: "Invalid data provided", 
          details: validationError.issues || validationError.message 
        });
      }
      
      // Handle title image upload if present
      const titleImageFile = req.files?.find((file: any) => file.fieldname === 'titleImage');
      if (titleImageFile) {
        driveLogData.titleImageUrl = `/uploads/${titleImageFile.filename}`;
        console.log('Drive log creation - Title image added:', driveLogData.titleImageUrl);
      }
      
      // Create the drive log first
      console.log('Drive log creation - Creating drive log with data:', JSON.stringify(driveLogData, null, 2));
      let driveLog;
      try {
        driveLog = await storage.createDriveLog(driveLogData);
        console.log('Drive log creation - Successfully created drive log:', driveLog.id);
      } catch (dbError) {
        console.error('Drive log creation - Database error:', dbError);
        return res.status(500).json({ 
          message: "Database error while creating drive log", 
          details: dbError.message || 'Unknown database error' 
        });
      }
      
      // Handle pitstops if provided
      if (req.body.pitstops) {
        try {
          const pitstopsData = JSON.parse(req.body.pitstops);
          
          for (let i = 0; i < pitstopsData.length; i++) {
            const pitstopData = pitstopsData[i];
            
            // Process pitstop images
            const pitstopImageFiles = req.files?.filter((file: any) => 
              file.fieldname.startsWith(`pitstop_${i}_image_`)
            ) || [];
            
            const imageUrls = pitstopImageFiles.map((file: any) => `/uploads/${file.filename}`);
            
            // Create pitstop
            await storage.createPitstop({
              driveLogId: driveLog.id,
              name: pitstopData.name,
              description: pitstopData.description,
              latitude: pitstopData.latitude,
              longitude: pitstopData.longitude,
              address: pitstopData.address,
              placeId: pitstopData.placeId,
              type: pitstopData.type,
              orderIndex: pitstopData.orderIndex,
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              notes: pitstopData.notes,
            });
          }
        } catch (pitstopError) {
          console.error("Error processing pitstops:", pitstopError);
        }
      }
      
      res.json(driveLog);
    } catch (error) {
      console.error("Error creating drive log:", error);
      res.status(500).json({ message: "Failed to create drive log" });
    }
  });

  app.get('/api/drive-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driveLogs = await storage.getUserDriveLogs(userId);
      res.json(driveLogs);
    } catch (error) {
      console.error("Error fetching drive logs:", error);
      res.status(500).json({ message: "Failed to fetch drive logs" });
    }
  });

  app.get('/api/drive-logs/:id', isAuthenticated, async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.id);
      const driveLog = await storage.getDriveLog(driveLogId);
      if (!driveLog) {
        return res.status(404).json({ message: "Drive log not found" });
      }
      res.json(driveLog);
    } catch (error) {
      console.error("Error fetching drive log:", error);
      res.status(500).json({ message: "Failed to fetch drive log" });
    }
  });

  app.post('/api/drive-logs', isAuthenticated, upload.any(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Sanitize and validate data
      const cleanData = {
        ...req.body,
        userId,
        distance: req.body.distance && req.body.distance !== '' ? parseFloat(req.body.distance) : 0,
        vehicleId: req.body.vehicleId && req.body.vehicleId !== '' ? parseInt(req.body.vehicleId) : undefined,
        startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
        endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
      };
      
      const driveLogData = insertDriveLogSchema.parse(cleanData);
      
      // Handle title image upload if present
      const titleImageFile = req.files?.find((file: any) => file.fieldname === 'titleImage');
      if (titleImageFile) {
        driveLogData.titleImageUrl = `/uploads/${titleImageFile.filename}`;
      }
      
      // Create the drive log first
      const driveLog = await storage.createDriveLog(driveLogData);
      
      // Handle pitstops if provided
      if (req.body.pitstops) {
        try {
          const pitstopsData = JSON.parse(req.body.pitstops);
          
          for (let i = 0; i < pitstopsData.length; i++) {
            const pitstopData = pitstopsData[i];
            
            // Process pitstop images
            const pitstopImageFiles = req.files?.filter((file: any) => 
              file.fieldname.startsWith(`pitstop_${i}_image_`)
            ) || [];
            
            const imageUrls = pitstopImageFiles.map((file: any) => `/uploads/${file.filename}`);
            
            // Create pitstop
            await storage.createPitstop({
              driveLogId: driveLog.id,
              name: pitstopData.name,
              description: pitstopData.description,
              latitude: pitstopData.latitude,
              longitude: pitstopData.longitude,
              address: pitstopData.address,
              placeId: pitstopData.placeId,
              type: pitstopData.type,
              orderIndex: pitstopData.orderIndex,
              imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
              notes: pitstopData.notes,
            });
          }
        } catch (pitstopError) {
          console.error("Error processing pitstops:", pitstopError);
        }
      }
      
      res.json(driveLog);
    } catch (error) {
      console.error("Error creating drive log:", error);
      res.status(500).json({ message: "Failed to create drive log" });
    }
  });

  app.put('/api/drive-logs/:id', isAuthenticated, upload.any(), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driveLogId = parseInt(req.params.id);
      
      // Check if drive log exists and belongs to user
      const existingDriveLog = await storage.getDriveLog(driveLogId);
      if (!existingDriveLog || existingDriveLog.userId !== userId) {
        return res.status(404).json({ message: 'Drive log not found' });
      }

      const updateData = { ...req.body };
      
      // Handle title image upload if present
      const titleImageFile = req.files?.find((file: any) => file.fieldname === 'titleImage');
      if (titleImageFile) {
        // Delete old image if it exists
        if (existingDriveLog.titleImageUrl) {
          const oldImagePath = path.join(__dirname, '..', existingDriveLog.titleImageUrl);
          try {
            await fs.unlink(oldImagePath);
          } catch (error) {
            console.log('Old image file not found or already deleted:', oldImagePath);
          }
        }
        updateData.titleImageUrl = `/uploads/${titleImageFile.filename}`;
      }

      // Convert string timestamps to Date objects
      if (updateData.startTime) {
        updateData.startTime = new Date(updateData.startTime);
      }
      if (updateData.endTime) {
        updateData.endTime = new Date(updateData.endTime);
      }

      // Convert vehicleId to number if present
      if (updateData.vehicleId) {
        updateData.vehicleId = parseInt(updateData.vehicleId);
      }

      // Remove undefined values and empty strings
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });

      const updatedDriveLog = await storage.updateDriveLog(driveLogId, updateData);
      res.json(updatedDriveLog);
    } catch (error) {
      console.error('Error updating drive log:', error);
      res.status(500).json({ message: 'Failed to update drive log' });
    }
  });

  app.patch('/api/drive-logs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driveLogId = parseInt(req.params.id);
      
      // Check if drive log exists and belongs to user
      const existingDriveLog = await storage.getDriveLog(driveLogId);
      if (!existingDriveLog || existingDriveLog.userId !== userId) {
        return res.status(404).json({ message: 'Drive log not found' });
      }

      const updateData = { ...req.body };
      
      // Convert vehicleId to number if present
      if (updateData.vehicleId) {
        updateData.vehicleId = parseInt(updateData.vehicleId);
      }

      // Convert distance to number if present
      if (updateData.distance) {
        updateData.distance = parseFloat(updateData.distance);
      }

      // Convert date strings to Date objects
      if (updateData.startTime && typeof updateData.startTime === 'string') {
        updateData.startTime = new Date(updateData.startTime);
      }
      if (updateData.endTime && typeof updateData.endTime === 'string') {
        updateData.endTime = new Date(updateData.endTime);
      }

      // Remove undefined values and empty strings
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });

      const updatedDriveLog = await storage.updateDriveLog(driveLogId, updateData);
      res.json(updatedDriveLog);
    } catch (error) {
      console.error('Error updating drive log:', error);
      res.status(500).json({ message: 'Failed to update drive log' });
    }
  });

  app.delete('/api/drive-logs/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driveLogId = parseInt(req.params.id);
      
      // Check if drive log exists and belongs to user
      const existingDriveLog = await storage.getDriveLog(driveLogId);
      if (!existingDriveLog || existingDriveLog.userId !== userId) {
        return res.status(404).json({ message: 'Drive log not found' });
      }

      await storage.deleteDriveLog(driveLogId);
      res.json({ message: 'Drive log deleted successfully' });
    } catch (error) {
      console.error('Error deleting drive log:', error);
      res.status(500).json({ message: 'Failed to delete drive log' });
    }
  });

  // Get all pitstops for pitstop counts
  app.get('/api/all-pitstops', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Get all drive logs for the user first
      const userDriveLogs = await storage.getUserDriveLogs(userId);
      const allPitstops = [];
      
      for (const driveLog of userDriveLogs) {
        const pitstops = await storage.getPitstopsByDriveLog(driveLog.id);
        allPitstops.push(...pitstops);
      }
      
      res.json(allPitstops);
    } catch (error) {
      console.error('Error fetching all pitstops:', error);
      res.status(500).json({ message: 'Failed to fetch pitstops' });
    }
  });

  // Get pitstops for a drive log
  app.get('/api/pitstops/:driveLogId', isAuthenticated, async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.driveLogId);
      const pitstops = await storage.getPitstopsByDriveLog(driveLogId);
      res.json(pitstops);
    } catch (error) {
      console.error('Error fetching pitstops:', error);
      res.status(500).json({ message: 'Failed to fetch pitstops' });
    }
  });

  // Create pitstop
  app.post('/api/pitstops', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Verify the drive log belongs to the user
      const driveLog = await storage.getDriveLog(req.body.driveLogId);
      if (!driveLog || driveLog.userId !== userId) {
        return res.status(404).json({ message: 'Drive log not found' });
      }

      const pitstop = await storage.createPitstop(req.body);
      res.json(pitstop);
    } catch (error) {
      console.error('Error creating pitstop:', error);
      res.status(500).json({ message: 'Failed to create pitstop' });
    }
  });

  // Update pitstop
  app.patch('/api/pitstops/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pitstopId = parseInt(req.params.id);
      
      // Verify the pitstop belongs to the user through the drive log
      const pitstop = await storage.getPitstop(pitstopId);
      if (!pitstop) {
        return res.status(404).json({ message: 'Pitstop not found' });
      }
      
      const driveLog = await storage.getDriveLog(pitstop.driveLogId);
      if (!driveLog || driveLog.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const updatedPitstop = await storage.updatePitstop(pitstopId, req.body);
      res.json(updatedPitstop);
    } catch (error) {
      console.error('Error updating pitstop:', error);
      res.status(500).json({ message: 'Failed to update pitstop' });
    }
  });

  // Upload images for pitstop
  app.post('/api/pitstops/:id/images', isAuthenticated, upload.array('images', 3), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pitstopId = parseInt(req.params.id);
      
      // Verify the pitstop belongs to the user through the drive log
      const pitstop = await storage.getPitstop(pitstopId);
      if (!pitstop) {
        return res.status(404).json({ message: 'Pitstop not found' });
      }
      
      const driveLog = await storage.getDriveLog(pitstop.driveLogId);
      if (!driveLog || driveLog.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No images uploaded' });
      }

      // Generate URLs for uploaded images
      const imageUrls = files.map(file => `/uploads/${file.filename}`);
      
      // Get existing images and append new ones
      const existingImages = pitstop.imageUrls || [];
      const totalImages = [...existingImages, ...imageUrls];
      
      // Limit to 3 images total
      if (totalImages.length > 3) {
        return res.status(400).json({ message: 'Maximum 3 images per pitstop' });
      }

      // Update pitstop with new image URLs
      const updatedPitstop = await storage.updatePitstop(pitstopId, {
        imageUrls: totalImages
      });

      res.json({ 
        message: 'Images uploaded successfully',
        imageUrls: imageUrls,
        pitstop: updatedPitstop
      });
    } catch (error) {
      console.error('Error uploading pitstop images:', error);
      res.status(500).json({ message: 'Failed to upload images' });
    }
  });

  // Delete pitstop
  app.delete('/api/pitstops/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const pitstopId = parseInt(req.params.id);
      
      // Verify the pitstop belongs to the user through the drive log
      const pitstop = await storage.getPitstop(pitstopId);
      if (!pitstop) {
        return res.status(404).json({ message: 'Pitstop not found' });
      }
      
      const driveLog = await storage.getDriveLog(pitstop.driveLogId);
      if (!driveLog || driveLog.userId !== userId) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      await storage.deletePitstop(pitstopId);
      res.json({ message: 'Pitstop deleted successfully' });
    } catch (error) {
      console.error('Error deleting pitstop:', error);
      res.status(500).json({ message: 'Failed to delete pitstop' });
    }
  });

  // AI blog generation route
  app.post('/api/drive-logs/:id/generate-blog', isAuthenticated, async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.id);
      const driveLog = await storage.getDriveLog(driveLogId);
      
      if (!driveLog) {
        return res.status(404).json({ message: "Drive log not found" });
      }

      // Get associated vehicle info
      const vehicle = driveLog.vehicleId ? await storage.getVehicle(driveLog.vehicleId) : null;

      const blogRequest = {
        images: req.body.images || [], // Base64 encoded images from frontend
        driveData: {
          distance: Number(driveLog.distance),
          duration: driveLog.duration || 0,
          startLocation: driveLog.startLocation,
          endLocation: driveLog.endLocation,
          routeName: driveLog.routeName || undefined,
          pitStops: driveLog.pitStops as any[] || [],
          weatherConditions: driveLog.weatherConditions || undefined,
          vehicleMake: vehicle?.make,
          vehicleModel: vehicle?.model,
          notes: driveLog.notes || undefined,
        },
      };

      const blog = await generateDriveBlog(blogRequest);
      res.json(blog);
    } catch (error) {
      console.error("Error generating AI blog:", error);
      res.status(500).json({ message: "Failed to generate AI blog" });
    }
  });

  // Convoy routes
  app.post('/api/convoys', isAuthenticated, async (req: any, res) => {
    try {
      const organizerId = req.user.claims.sub;
      const convoyData = insertConvoySchema.parse({ ...req.body, organizerId });
      const convoy = await storage.createConvoy(convoyData);
      res.json(convoy);
    } catch (error) {
      console.error("Error creating convoy:", error);
      res.status(500).json({ message: "Failed to create convoy" });
    }
  });

  app.get('/api/convoys/upcoming', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const convoys = await storage.getUpcomingConvoys(limit);
      res.json(convoys);
    } catch (error) {
      console.error("Error fetching upcoming convoys:", error);
      res.status(500).json({ message: "Failed to fetch upcoming convoys" });
    }
  });

  app.get('/api/convoys/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const convoys = await storage.getUserConvoys(userId);
      res.json(convoys);
    } catch (error) {
      console.error("Error fetching user convoys:", error);
      res.status(500).json({ message: "Failed to fetch user convoys" });
    }
  });

  app.get('/api/convoys/:id', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const convoy = await storage.getConvoy(convoyId);
      if (!convoy) {
        return res.status(404).json({ message: "Convoy not found" });
      }
      res.json(convoy);
    } catch (error) {
      console.error("Error fetching convoy:", error);
      res.status(500).json({ message: "Failed to fetch convoy" });
    }
  });

  app.post('/api/convoys/:id/join', isAuthenticated, async (req: any, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const vehicleId = req.body.vehicleId ? parseInt(req.body.vehicleId) : undefined;
      
      await storage.joinConvoy(convoyId, userId, vehicleId);
      res.json({ message: "Successfully joined convoy" });
    } catch (error) {
      console.error("Error joining convoy:", error);
      res.status(500).json({ message: "Failed to join convoy" });
    }
  });

  app.post('/api/convoys/:id/leave', isAuthenticated, async (req: any, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      await storage.leaveConvoy(convoyId, userId);
      res.json({ message: "Successfully left convoy" });
    } catch (error) {
      console.error("Error leaving convoy:", error);
      res.status(500).json({ message: "Failed to leave convoy" });
    }
  });

  app.get('/api/convoys/:id/participants', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const participants = await storage.getConvoyParticipants(convoyId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching convoy participants:", error);
      res.status(500).json({ message: "Failed to fetch convoy participants" });
    }
  });

  // Server-side rendered public sharing page for social media crawlers
  app.get("/share/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`Share route accessed for ID: ${id}, User-Agent: ${req.get('User-Agent')}`);
      
      if (isNaN(id)) {
        console.log(`Invalid ID provided: ${req.params.id}`);
        return res.status(404).send("Drive log not found");
      }

      // Always serve server-side HTML with meta tags for all requests
      // This ensures social media crawlers get the proper meta tags
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      console.log(`Generating HTML for drive log ${id} with baseUrl: ${baseUrl}`);
      
      const html = await generatePublicShareHTML(id, baseUrl);
      
      // Check if we got the not found HTML
      if (html.includes('Drive Log Not Found')) {
        console.log(`Drive log ${id} not found or not public`);
        return res.status(404).send(html);
      }
      
      // Set cache-busting headers for social media crawlers
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Last-Modified', new Date().toUTCString());
      
      console.log(`Successfully serving share page for drive log ${id}`);
      res.send(html);
    } catch (error) {
      console.error("Error generating public share page:", error);
      res.status(500).send("Error loading drive log");
    }
  });

  // Public API routes (no authentication required)
  app.get('/api/public/drive-logs/:id', async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.id);
      const driveLog = await storage.getDriveLogWithPitstops(driveLogId);
      
      if (!driveLog || !driveLog.isPublic) {
        return res.status(404).json({ message: 'Drive log not found or not public' });
      }

      // Get user information
      const user = await storage.getUser(driveLog.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get vehicle information if available
      let vehicle = null;
      if (driveLog.vehicleId) {
        vehicle = await storage.getVehicle(driveLog.vehicleId);
      }

      // Format the response for public sharing with title image and complete data
      const publicDriveLog = {
        id: driveLog.id,
        title: driveLog.title,
        description: driveLog.description,
        startLocation: driveLog.startLocation,
        endLocation: driveLog.endLocation,
        distance: driveLog.distance,
        route: driveLog.route,
        startTime: driveLog.startTime,
        endTime: driveLog.endTime,
        titleImageUrl: driveLog.titleImageUrl,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        vehicle: vehicle ? {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
        } : null,
        pitstops: driveLog.pitstops.map(pitstop => ({
          id: pitstop.id,
          name: pitstop.name,
          description: pitstop.description,
          latitude: pitstop.latitude,
          longitude: pitstop.longitude,
          address: pitstop.address,
          type: pitstop.type,
          imageUrls: pitstop.imageUrls,
        })),
      };
      
      res.json(publicDriveLog);
    } catch (error) {
      console.error('Error fetching public drive log:', error);
      res.status(500).json({ message: 'Failed to fetch drive log' });
    }
  });

  app.get('/api/public/pitstops/:driveLogId', async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.driveLogId);
      const pitstops = await storage.getPitstopsByDriveLog(driveLogId);
      res.json(pitstops);
    } catch (error) {
      console.error('Error fetching public pitstops:', error);
      res.status(500).json({ message: 'Failed to fetch pitstops' });
    }
  });

  app.get('/api/public/vehicles/:id', async (req, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const vehicle = await storage.getVehicle(vehicleId);
      
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      // Remove sensitive user data for public view
      const publicVehicle = {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        color: vehicle.color,
        type: vehicle.type,
      };
      
      res.json(publicVehicle);
    } catch (error) {
      console.error('Error fetching public vehicle:', error);
      res.status(500).json({ message: 'Failed to fetch vehicle' });
    }
  });

  // Simple in-memory storage for public likes (in production, use database)
  const publicLikes = new Map<string, Set<string>>();

  app.post('/api/public/drive-logs/:id/like', async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.id);
      const clientId = req.body.clientId;
      
      if (!clientId) {
        return res.status(400).json({ message: 'Client ID required' });
      }
      
      // Check if drive log exists
      const driveLog = await storage.getDriveLog(driveLogId);
      if (!driveLog) {
        return res.status(404).json({ message: 'Drive log not found' });
      }
      
      const driveLogKey = driveLogId.toString();
      
      // Initialize likes set for this drive log if not exists
      if (!publicLikes.has(driveLogKey)) {
        publicLikes.set(driveLogKey, new Set());
      }
      
      const likesSet = publicLikes.get(driveLogKey)!;
      let hasLiked = false;
      
      // Toggle like status
      if (likesSet.has(clientId)) {
        likesSet.delete(clientId);
        hasLiked = false;
      } else {
        likesSet.add(clientId);
        hasLiked = true;
      }
      
      const likeCount = likesSet.size;
      
      res.json({
        liked: hasLiked,
        likeCount: likeCount,
        message: hasLiked ? 'Drive log liked' : 'Like removed'
      });
    } catch (error) {
      console.error('Error handling like:', error);
      res.status(500).json({ message: 'Failed to handle like' });
    }
  });

  app.get('/api/public/drive-logs/:id/likes', async (req, res) => {
    try {
      const driveLogId = parseInt(req.params.id);
      const clientId = req.query.clientId as string;
      
      // Check if drive log exists
      const driveLog = await storage.getDriveLog(driveLogId);
      if (!driveLog) {
        return res.status(404).json({ message: 'Drive log not found' });
      }
      
      const driveLogKey = driveLogId.toString();
      const likesSet = publicLikes.get(driveLogKey) || new Set();
      
      res.json({
        liked: clientId ? likesSet.has(clientId) : false,
        likeCount: likesSet.size
      });
    } catch (error) {
      console.error('Error fetching likes:', error);
      res.status(500).json({ message: 'Failed to fetch likes' });
    }
  });

  // Comment routes
  app.post('/api/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      const commentData = insertPostCommentSchema.parse({
        ...req.body,
        postId,
        userId,
      });
      
      const comment = await storage.createComment(commentData);
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/posts/:id/comments', isAuthenticated, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // AI blog generation endpoint
  app.post('/api/ai/generate-blog', isAuthenticated, upload.array('media', 5), async (req: any, res) => {
    try {
      console.log('AI blog generation request:', { body: req.body, files: req.files?.length || 0 });
      const { vehicleId, userContext } = req.body;
      
      // Images are optional for AI blog generation
      if (!userContext || !userContext.trim()) {
        return res.status(400).json({ message: "User context is required for AI blog generation" });
      }
      
      // Get vehicle information
      const vehicle = vehicleId ? await storage.getVehicle(parseInt(vehicleId)) : null;
      
      // Convert images to base64
      const base64Images = req.files && Array.isArray(req.files) 
        ? await Promise.all(req.files.map(async (file: any) => {
            try {
              if (file.buffer) {
                return file.buffer.toString('base64');
              } else if (file.path) {
                const fs = require('fs');
                const fileBuffer = fs.readFileSync(file.path);
                return fileBuffer.toString('base64');
              }
              return null;
            } catch (error) {
              console.error('Error processing file:', error);
              return null;
            }
          })).then(results => results.filter(img => img !== null))
        : [];
      
      // Generate AI blog using OpenAI
      const blogResult = await generateDriveBlog({
        images: base64Images,
        driveData: {
          distance: 0,
          duration: 0,
          startLocation: "Garage",
          endLocation: "Showcase",
          vehicleMake: vehicle?.make || "Unknown",
          vehicleModel: vehicle?.model || "Unknown",
          notes: userContext,
        }
      });
      
      res.json({
        title: blogResult.title,
        content: blogResult.content,
        excerpt: blogResult.excerpt,
        tags: blogResult.tags,
        estimatedReadTime: blogResult.estimatedReadTime,
      });
    } catch (error) {
      console.error("Error generating AI blog:", error);
      res.status(500).json({ message: "Failed to generate AI blog" });
    }
  });

  // Garage voting routes
  app.post('/api/garage/:userId/vote', isAuthenticated, async (req: any, res) => {
    try {
      const garageOwnerId = req.params.userId;
      const voterId = req.user.claims.sub;
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      await storage.voteForGarage(voterId, garageOwnerId, month, year);
      res.json({ message: "Vote cast successfully" });
    } catch (error) {
      console.error("Error voting for garage:", error);
      res.status(500).json({ message: "Failed to vote for garage" });
    }
  });

  app.get('/api/garage/votes/monthly', isAuthenticated, async (req, res) => {
    try {
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      const votes = await storage.getMonthlyGarageVotes(month, year);
      res.json(votes);
    } catch (error) {
      console.error("Error fetching monthly garage votes:", error);
      res.status(500).json({ message: "Failed to fetch monthly garage votes" });
    }
  });

  // Weather alerts route
  app.get('/api/weather/alerts', isAuthenticated, async (req, res) => {
    try {
      const alerts = await storage.getActiveWeatherAlerts();
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching weather alerts:", error);
      res.status(500).json({ message: "Failed to fetch weather alerts" });
    }
  });

  // Leaderboard routes
  app.get('/api/leaderboard/contributors', isAuthenticated, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const contributors = await storage.getTopContributors(limit);
      res.json(contributors);
    } catch (error) {
      console.error("Error fetching top contributors:", error);
      res.status(500).json({ message: "Failed to fetch top contributors" });
    }
  });

  // Route recommendations route
  app.post('/api/routes/recommend', isAuthenticated, async (req, res) => {
    try {
      const { location, preferences } = req.body;
      
      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }
      
      const recommendations = await generateRouteRecommendations(location, preferences || {});
      res.json(recommendations);
    } catch (error) {
      console.error("Error generating route recommendations:", error);
      res.status(500).json({ message: "Failed to generate route recommendations" });
    }
  });

  // Get individual convoy
  app.get('/api/convoys/:id', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const convoy = await storage.getConvoy(convoyId);
      if (!convoy) {
        return res.status(404).json({ message: "Convoy not found" });
      }
      res.json(convoy);
    } catch (error) {
      console.error("Error fetching convoy:", error);
      res.status(500).json({ message: "Failed to fetch convoy" });
    }
  });

  // Get convoy participants
  app.get('/api/convoys/:id/participants', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const participants = await storage.getConvoyParticipants(convoyId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching convoy participants:", error);
      res.status(500).json({ message: "Failed to fetch convoy participants" });
    }
  });

  // Check if user is participant
  app.get('/api/convoys/:id/is-participant', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const userId = req.user?.claims?.sub;
      const participants = await storage.getConvoyParticipants(convoyId);
      const isParticipant = participants.some(p => p.userId === userId);
      res.json(isParticipant);
    } catch (error) {
      console.error("Error checking participant status:", error);
      res.status(500).json({ message: "Failed to check participant status" });
    }
  });

  // Real-time convoy coordination routes
  app.get('/api/convoys/:id/updates', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const updates = await storage.getConvoyUpdates(convoyId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching convoy updates:", error);
      res.status(500).json({ message: "Failed to fetch convoy updates" });
    }
  });

  app.get('/api/convoys/:id/participants/active', isAuthenticated, async (req, res) => {
    try {
      const convoyId = parseInt(req.params.id);
      const participants = await storage.getActiveConvoyParticipants(convoyId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching active participants:", error);
      res.status(500).json({ message: "Failed to fetch active participants" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time convoy coordination
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active convoy connections
  const convoyConnections = new Map<number, Map<string, WebSocket>>();
  
  wss.on('connection', (ws: WebSocket, request) => {
    console.log('WebSocket connection established');
    
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);
        const { type, convoyId, userId, payload } = data;
        
        switch (type) {
          case 'join_convoy':
            // Add user to convoy room
            if (!convoyConnections.has(convoyId)) {
              convoyConnections.set(convoyId, new Map());
            }
            convoyConnections.get(convoyId)!.set(userId, ws);
            
            // Broadcast join notification
            broadcastToConvoy(convoyId, {
              type: 'user_joined',
              userId,
              timestamp: new Date().toISOString()
            }, userId);
            break;
            
          case 'location_update':
            // Update user location in database
            await storage.updateParticipantLocation(convoyId, userId, payload.latitude, payload.longitude);
            
            // Store convoy update
            await storage.createConvoyUpdate({
              convoyId,
              userId,
              updateType: 'location',
              latitude: payload.latitude,
              longitude: payload.longitude,
              data: payload
            });
            
            // Broadcast location to other convoy members
            broadcastToConvoy(convoyId, {
              type: 'location_update',
              userId,
              latitude: payload.latitude,
              longitude: payload.longitude,
              timestamp: new Date().toISOString()
            }, userId);
            break;
            
          case 'convoy_message':
            // Store message
            await storage.createConvoyUpdate({
              convoyId,
              userId,
              updateType: 'message',
              data: { message: payload.message }
            });
            
            // Broadcast message to convoy
            broadcastToConvoy(convoyId, {
              type: 'convoy_message',
              userId,
              message: payload.message,
              timestamp: new Date().toISOString()
            });
            break;
            
          case 'emergency_alert':
            // Store emergency alert
            await storage.createConvoyUpdate({
              convoyId,
              userId,
              updateType: 'emergency',
              latitude: payload.latitude,
              longitude: payload.longitude,
              data: { type: payload.emergencyType, message: payload.message }
            });
            
            // Broadcast emergency to convoy with high priority
            broadcastToConvoy(convoyId, {
              type: 'emergency_alert',
              userId,
              emergencyType: payload.emergencyType,
              message: payload.message,
              latitude: payload.latitude,
              longitude: payload.longitude,
              timestamp: new Date().toISOString()
            });
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      // Remove user from all convoy rooms
      convoyConnections.forEach((convoyUsers, convoyId) => {
        convoyUsers.forEach((userWs, userId) => {
          if (userWs === ws) {
            convoyUsers.delete(userId);
            // Notify convoy of user disconnect
            broadcastToConvoy(convoyId, {
              type: 'user_left',
              userId,
              timestamp: new Date().toISOString()
            }, userId);
          }
        });
      });
    });
  });
  
  function broadcastToConvoy(convoyId: number, message: any, excludeUserId?: string) {
    const convoyUsers = convoyConnections.get(convoyId);
    if (convoyUsers) {
      convoyUsers.forEach((ws, userId) => {
        if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  }

  return httpServer;
}
