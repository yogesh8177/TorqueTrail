import {
  users,
  vehicles,
  posts,
  driveLogs,
  convoys,
  convoyParticipants,
  postLikes,
  postComments,
  garageVotes,
  userFollows,
  weatherAlerts,
  type User,
  type UpsertUser,
  type Vehicle,
  type InsertVehicle,
  type Post,
  type InsertPost,
  type DriveLog,
  type InsertDriveLog,
  type Convoy,
  type InsertConvoy,
  type ConvoyParticipant,
  type PostComment,
  type InsertPostComment,
  type WeatherAlert,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gte, lte, inArray, count } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Vehicle operations
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getUserVehicles(userId: string): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;
  
  // Post operations
  createPost(post: InsertPost): Promise<Post>;
  getFeedPosts(limit?: number, offset?: number): Promise<Post[]>;
  getUserPosts(userId: string, limit?: number, offset?: number): Promise<Post[]>;
  getPost(id: number): Promise<Post | undefined>;
  likePost(postId: number, userId: string): Promise<void>;
  unlikePost(postId: number, userId: string): Promise<void>;
  isPostLikedByUser(postId: number, userId: string): Promise<boolean>;
  
  // Drive log operations
  createDriveLog(driveLog: InsertDriveLog): Promise<DriveLog>;
  getUserDriveLogs(userId: string): Promise<DriveLog[]>;
  getDriveLog(id: number): Promise<DriveLog | undefined>;
  
  // Convoy operations
  createConvoy(convoy: InsertConvoy): Promise<Convoy>;
  getUpcomingConvoys(limit?: number): Promise<Convoy[]>;
  getUserConvoys(userId: string): Promise<Convoy[]>;
  getConvoy(id: number): Promise<Convoy | undefined>;
  joinConvoy(convoyId: number, userId: string, vehicleId?: number): Promise<void>;
  leaveConvoy(convoyId: number, userId: string): Promise<void>;
  getConvoyParticipants(convoyId: number): Promise<ConvoyParticipant[]>;
  
  // Comment operations
  createComment(comment: InsertPostComment): Promise<PostComment>;
  getPostComments(postId: number): Promise<PostComment[]>;
  
  // Garage voting operations
  voteForGarage(voterId: string, garageOwnerId: string, month: number, year: number): Promise<void>;
  getMonthlyGarageVotes(month: number, year: number): Promise<{userId: string, votes: number}[]>;
  
  // Weather alerts
  getActiveWeatherAlerts(): Promise<WeatherAlert[]>;
  
  // Leaderboard operations
  getTopContributors(limit?: number): Promise<{user: User, points: number}[]>;
  
  // Real-time convoy operations
  updateParticipantLocation(convoyId: number, userId: string, latitude: number, longitude: number): Promise<void>;
  createConvoyUpdate(update: InsertConvoyUpdate): Promise<ConvoyUpdate>;
  getConvoyUpdates(convoyId: number, limit?: number): Promise<ConvoyUpdate[]>;
  getActiveConvoyParticipants(convoyId: number): Promise<ConvoyParticipant[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Vehicle operations
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values(vehicle).returning();
    return newVehicle;
  }

  async getUserVehicles(userId: string): Promise<Vehicle[]> {
    return await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.userId, userId))
      .orderBy(desc(vehicles.createdAt));
  }

  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Post operations
  async createPost(post: InsertPost): Promise<Post> {
    const [newPost] = await db.insert(posts).values(post).returning();
    return newPost;
  }

  async getFeedPosts(limit = 20, offset = 0): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUserPosts(userId: string, limit = 20, offset = 0): Promise<Post[]> {
    return await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getPost(id: number): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async likePost(postId: number, userId: string): Promise<void> {
    await db.insert(postLikes).values({ postId, userId }).onConflictDoNothing();
    
    // Update like count
    await db
      .update(posts)
      .set({ 
        likes: sql`${posts.likes} + 1` 
      })
      .where(eq(posts.id, postId));
  }

  async unlikePost(postId: number, userId: string): Promise<void> {
    await db
      .delete(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    
    // Update like count
    await db
      .update(posts)
      .set({ 
        likes: sql`GREATEST(${posts.likes} - 1, 0)` 
      })
      .where(eq(posts.id, postId));
  }

  async isPostLikedByUser(postId: number, userId: string): Promise<boolean> {
    const [like] = await db
      .select()
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)));
    return !!like;
  }

  // Drive log operations
  async createDriveLog(driveLog: InsertDriveLog): Promise<DriveLog> {
    const [newDriveLog] = await db.insert(driveLogs).values(driveLog).returning();
    
    // Update user's total miles
    await db
      .update(users)
      .set({
        totalMiles: sql`${users.totalMiles} + ${driveLog.distance}`,
      })
      .where(eq(users.id, driveLog.userId));
    
    return newDriveLog;
  }

  async getUserDriveLogs(userId: string): Promise<DriveLog[]> {
    return await db
      .select()
      .from(driveLogs)
      .where(eq(driveLogs.userId, userId))
      .orderBy(desc(driveLogs.startTime));
  }

  async getDriveLog(id: number): Promise<DriveLog | undefined> {
    const [driveLog] = await db.select().from(driveLogs).where(eq(driveLogs.id, id));
    return driveLog;
  }

  // Convoy operations
  async createConvoy(convoy: InsertConvoy): Promise<Convoy> {
    const [newConvoy] = await db.insert(convoys).values(convoy).returning();
    
    // Auto-join the organizer
    await db.insert(convoyParticipants).values({
      convoyId: newConvoy.id,
      userId: convoy.organizerId,
    });
    
    return newConvoy;
  }

  async getUpcomingConvoys(limit = 20): Promise<Convoy[]> {
    return await db
      .select()
      .from(convoys)
      .where(and(
        gte(convoys.startDateTime, new Date()),
        eq(convoys.status, "open")
      ))
      .orderBy(convoys.startDateTime)
      .limit(limit);
  }

  async getUserConvoys(userId: string): Promise<Convoy[]> {
    const userConvoyIds = await db
      .select({ convoyId: convoyParticipants.convoyId })
      .from(convoyParticipants)
      .where(eq(convoyParticipants.userId, userId));
    
    if (userConvoyIds.length === 0) return [];
    
    return await db
      .select()
      .from(convoys)
      .where(inArray(convoys.id, userConvoyIds.map(c => c.convoyId)))
      .orderBy(desc(convoys.startDateTime));
  }

  async getConvoy(id: number): Promise<Convoy | undefined> {
    const [convoy] = await db.select().from(convoys).where(eq(convoys.id, id));
    return convoy;
  }

  async joinConvoy(convoyId: number, userId: string, vehicleId?: number): Promise<void> {
    await db.insert(convoyParticipants).values({
      convoyId,
      userId,
      vehicleId,
    });
    
    // Update participant count
    await db
      .update(convoys)
      .set({
        currentParticipants: sql`${convoys.currentParticipants} + 1`,
      })
      .where(eq(convoys.id, convoyId));
      
    // Update user's total convoys
    await db
      .update(users)
      .set({
        totalConvoys: sql`${users.totalConvoys} + 1`,
      })
      .where(eq(users.id, userId));
  }

  async leaveConvoy(convoyId: number, userId: string): Promise<void> {
    await db
      .delete(convoyParticipants)
      .where(and(
        eq(convoyParticipants.convoyId, convoyId),
        eq(convoyParticipants.userId, userId)
      ));
    
    // Update participant count
    await db
      .update(convoys)
      .set({
        currentParticipants: sql`GREATEST(${convoys.currentParticipants} - 1, 0)`,
      })
      .where(eq(convoys.id, convoyId));
  }

  async getConvoyParticipants(convoyId: number): Promise<ConvoyParticipant[]> {
    return await db
      .select()
      .from(convoyParticipants)
      .where(eq(convoyParticipants.convoyId, convoyId))
      .orderBy(convoyParticipants.joinedAt);
  }

  // Comment operations
  async createComment(comment: InsertPostComment): Promise<PostComment> {
    const [newComment] = await db.insert(postComments).values(comment).returning();
    
    // Update post comment count
    await db
      .update(posts)
      .set({
        comments: sql`${posts.comments} + 1`,
      })
      .where(eq(posts.id, comment.postId));
    
    return newComment;
  }

  async getPostComments(postId: number): Promise<PostComment[]> {
    return await db
      .select()
      .from(postComments)
      .where(eq(postComments.postId, postId))
      .orderBy(postComments.createdAt);
  }

  // Garage voting operations
  async voteForGarage(voterId: string, garageOwnerId: string, month: number, year: number): Promise<void> {
    await db.insert(garageVotes).values({
      voterId,
      garageOwnerId,
      month,
      year,
    }).onConflictDoNothing();
  }

  async getMonthlyGarageVotes(month: number, year: number): Promise<{userId: string, votes: number}[]> {
    const results = await db
      .select({
        userId: garageVotes.garageOwnerId,
        votes: count(garageVotes.id),
      })
      .from(garageVotes)
      .where(and(
        eq(garageVotes.month, month),
        eq(garageVotes.year, year)
      ))
      .groupBy(garageVotes.garageOwnerId)
      .orderBy(desc(count(garageVotes.id)));
    
    return results.map(r => ({ userId: r.userId, votes: Number(r.votes) }));
  }

  // Weather alerts
  async getActiveWeatherAlerts(): Promise<WeatherAlert[]> {
    return await db
      .select()
      .from(weatherAlerts)
      .where(and(
        eq(weatherAlerts.isActive, true),
        gte(weatherAlerts.expiresAt, new Date())
      ))
      .orderBy(desc(weatherAlerts.createdAt));
  }

  // Leaderboard operations
  async getTopContributors(limit = 10): Promise<{user: User, points: number}[]> {
    // Calculate points based on posts, likes, and convoys
    const results = await db
      .select({
        user: users,
        postCount: count(posts.id),
        totalLikes: sql<number>`COALESCE(SUM(${posts.likes}), 0)`,
        totalConvoys: users.totalConvoys,
      })
      .from(users)
      .leftJoin(posts, eq(posts.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(sql`COALESCE(SUM(${posts.likes}), 0) + COUNT(${posts.id}) * 10 + ${users.totalConvoys} * 50`))
      .limit(limit);
    
    return results.map(r => ({
      user: r.user,
      points: Number(r.totalLikes) + Number(r.postCount) * 10 + (r.totalConvoys || 0) * 50,
    }));
  }
}

export const storage = new DatabaseStorage();
