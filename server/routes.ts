import type { Express } from "express";
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
import multer from "multer";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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

  // Vehicle routes
  app.post('/api/vehicles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const vehicleData = insertVehicleSchema.parse({ ...req.body, userId });
      const vehicle = await storage.createVehicle(vehicleData);
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

  app.put('/api/vehicles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const vehicleId = parseInt(req.params.id);
      const updates = insertVehicleSchema.partial().parse(req.body);
      const vehicle = await storage.updateVehicle(vehicleId, updates);
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

      const postData = insertPostSchema.parse({
        ...req.body,
        userId,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
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

  // Drive log routes
  app.post('/api/drive-logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const driveLogData = insertDriveLogSchema.parse({ ...req.body, userId });
      const driveLog = await storage.createDriveLog(driveLogData);
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
