import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  username: varchar("username").unique(),
  bio: text("bio"),
  totalMiles: integer("total_miles").default(0),
  totalConvoys: integer("total_convoys").default(0),
  garageRating: decimal("garage_rating", { precision: 3, scale: 2 }).default("0.00"),
  followers: integer("followers").default(0),
  following: integer("following").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vehicle storage table
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  make: varchar("make").notNull(),
  model: varchar("model").notNull(),
  year: integer("year").notNull(),
  color: varchar("color"),
  engine: varchar("engine"),
  horsepower: integer("horsepower"),
  transmission: varchar("transmission"),
  fuelType: varchar("fuel_type"),
  imageUrl: varchar("image_url"),
  description: text("description"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content"),
  title: varchar("title"),
  type: varchar("type").notNull(), // 'drive', 'garage', 'convoy', 'blog'
  imageUrls: text("image_urls").array(),
  videoUrls: text("video_urls").array(),
  driveLogId: integer("drive_log_id"),
  convoyId: integer("convoy_id"),
  isAiGenerated: boolean("is_ai_generated").default(false),
  aiPrompt: text("ai_prompt"),
  estimatedReadTime: integer("estimated_read_time"), // in minutes
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Drive logs table
export const driveLogs = pgTable("drive_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  title: varchar("title").notNull(),
  startLocation: varchar("start_location").notNull(),
  endLocation: varchar("end_location").notNull(),
  routeName: varchar("route_name"),
  distance: decimal("distance", { precision: 8, scale: 2 }).notNull(),
  duration: integer("duration"), // in minutes
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  avgSpeed: decimal("avg_speed", { precision: 5, scale: 2 }),
  maxSpeed: decimal("max_speed", { precision: 5, scale: 2 }),
  fuelConsumed: decimal("fuel_consumed", { precision: 6, scale: 2 }),
  weatherConditions: varchar("weather_conditions"),
  roadConditions: varchar("road_conditions"),
  pitStops: jsonb("pit_stops"), // Array of stop locations with coordinates
  routeCoordinates: jsonb("route_coordinates"), // GPS coordinates array
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Convoys table
export const convoys = pgTable("convoys", {
  id: serial("id").primaryKey(),
  organizerId: varchar("organizer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  description: text("description"),
  startLocation: varchar("start_location").notNull(),
  endLocation: varchar("end_location"),
  routeName: varchar("route_name"),
  distance: decimal("distance", { precision: 8, scale: 2 }),
  estimatedDuration: integer("estimated_duration"), // in minutes
  startDateTime: timestamp("start_date_time").notNull(),
  maxParticipants: integer("max_participants").default(50),
  currentParticipants: integer("current_participants").default(1),
  meetingPoint: varchar("meeting_point").notNull(),
  weatherAlert: varchar("weather_alert"),
  roadAlert: varchar("road_alert"),
  difficulty: varchar("difficulty").default("easy"), // easy, moderate, hard
  vehicleTypes: text("vehicle_types").array(), // car, motorcycle, truck
  status: varchar("status").default("open"), // open, full, cancelled, completed
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Convoy participants table
export const convoyParticipants = pgTable("convoy_participants", {
  id: serial("id").primaryKey(),
  convoyId: integer("convoy_id").notNull().references(() => convoys.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  vehicleId: integer("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
  status: varchar("status").default("joined"), // joined, left, banned
  joinedAt: timestamp("joined_at").defaultNow(),
  // Real-time location data
  currentLatitude: decimal("current_latitude", { precision: 10, scale: 8 }),
  currentLongitude: decimal("current_longitude", { precision: 11, scale: 8 }),
  lastLocationUpdate: timestamp("last_location_update"),
  isLocationSharing: boolean("is_location_sharing").default(false),
});

// Live convoy updates table for real-time coordination
export const convoyUpdates = pgTable("convoy_updates", {
  id: serial("id").primaryKey(),
  convoyId: integer("convoy_id").notNull().references(() => convoys.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  updateType: varchar("update_type").notNull(), // location, message, status, emergency
  data: jsonb("data"), // flexible data structure for different update types
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post likes table
export const postLikes = pgTable("post_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Post comments table
export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: integer("parent_comment_id"),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Saved posts table
export const savedPosts = pgTable("saved_posts", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Garage votes table
export const garageVotes = pgTable("garage_votes", {
  id: serial("id").primaryKey(),
  voterId: varchar("voter_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  garageOwnerId: varchar("garage_owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User follows table
export const userFollows = pgTable("user_follows", {
  id: serial("id").primaryKey(),
  followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weather alerts table
export const weatherAlerts = pgTable("weather_alerts", {
  id: serial("id").primaryKey(),
  routeName: varchar("route_name").notNull(),
  alertType: varchar("alert_type").notNull(), // rain, snow, wind, construction
  severity: varchar("severity").notNull(), // low, medium, high
  description: text("description").notNull(),
  startLocation: varchar("start_location"),
  endLocation: varchar("end_location"),
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  vehicles: many(vehicles),
  posts: many(posts),
  driveLogs: many(driveLogs),
  organizedConvoys: many(convoys),
  convoyParticipations: many(convoyParticipants),
  postLikes: many(postLikes),
  postComments: many(postComments),
  savedPosts: many(savedPosts),
  garageVotesGiven: many(garageVotes, { relationName: "voter" }),
  garageVotesReceived: many(garageVotes, { relationName: "garageOwner" }),
  followers: many(userFollows, { relationName: "following" }),
  following: many(userFollows, { relationName: "follower" }),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(users, {
    fields: [vehicles.userId],
    references: [users.id],
  }),
  driveLogs: many(driveLogs),
  convoyParticipations: many(convoyParticipants),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  driveLog: one(driveLogs, {
    fields: [posts.driveLogId],
    references: [driveLogs.id],
  }),
  convoy: one(convoys, {
    fields: [posts.convoyId],
    references: [convoys.id],
  }),
  likes: many(postLikes),
  comments: many(postComments),
  savedBy: many(savedPosts),
}));

export const driveLogsRelations = relations(driveLogs, ({ one, many }) => ({
  user: one(users, {
    fields: [driveLogs.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [driveLogs.vehicleId],
    references: [vehicles.id],
  }),
  posts: many(posts),
}));

export const convoysRelations = relations(convoys, ({ one, many }) => ({
  organizer: one(users, {
    fields: [convoys.organizerId],
    references: [users.id],
  }),
  participants: many(convoyParticipants),
  posts: many(posts),
}));

export const convoyParticipantsRelations = relations(convoyParticipants, ({ one }) => ({
  convoy: one(convoys, {
    fields: [convoyParticipants.convoyId],
    references: [convoys.id],
  }),
  user: one(users, {
    fields: [convoyParticipants.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [convoyParticipants.vehicleId],
    references: [vehicles.id],
  }),
}));

export const convoyUpdatesRelations = relations(convoyUpdates, ({ one }) => ({
  convoy: one(convoys, {
    fields: [convoyUpdates.convoyId],
    references: [convoys.id],
  }),
  user: one(users, {
    fields: [convoyUpdates.userId],
    references: [users.id],
  }),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, {
    fields: [postLikes.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [postLikes.userId],
    references: [users.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one, many }) => ({
  post: one(posts, {
    fields: [postComments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [postComments.userId],
    references: [users.id],
  }),
  parentComment: one(postComments, {
    fields: [postComments.parentCommentId],
    references: [postComments.id],
  }),
  replies: many(postComments, { relationName: "parentComment" }),
}));

export const savedPostsRelations = relations(savedPosts, ({ one }) => ({
  post: one(posts, {
    fields: [savedPosts.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [savedPosts.userId],
    references: [users.id],
  }),
}));

export const garageVotesRelations = relations(garageVotes, ({ one }) => ({
  voter: one(users, {
    fields: [garageVotes.voterId],
    references: [users.id],
    relationName: "voter",
  }),
  garageOwner: one(users, {
    fields: [garageVotes.garageOwnerId],
    references: [users.id],
    relationName: "garageOwner",
  }),
}));

export const userFollowsRelations = relations(userFollows, ({ one }) => ({
  follower: one(users, {
    fields: [userFollows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [userFollows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

// Insert schemas
export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  likes: true,
  comments: true,
  shares: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDriveLogSchema = createInsertSchema(driveLogs).omit({
  id: true,
  createdAt: true,
});

export const insertConvoySchema = createInsertSchema(convoys).omit({
  id: true,
  currentParticipants: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDateTime: z.union([z.date(), z.string().transform((str) => new Date(str))]),
  estimatedDuration: z.union([
    z.number(),
    z.string().transform((str) => str === "" ? undefined : Number(str)),
    z.undefined()
  ]).optional(),
  distance: z.union([
    z.string().transform((str) => {
      if (!str || str === "") return undefined;
      // Extract numbers from string like "1000 kms" -> "1000"
      const numStr = str.replace(/[^\d.]/g, '');
      return numStr ? parseFloat(numStr) : undefined;
    }),
    z.number(),
    z.undefined()
  ]).optional(),
});

export const insertPostCommentSchema = createInsertSchema(postComments).omit({
  id: true,
  likes: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;
export type InsertDriveLog = z.infer<typeof insertDriveLogSchema>;
export type DriveLog = typeof driveLogs.$inferSelect;
export type InsertConvoy = z.infer<typeof insertConvoySchema>;
export type Convoy = typeof convoys.$inferSelect;
export type ConvoyParticipant = typeof convoyParticipants.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;
export type WeatherAlert = typeof weatherAlerts.$inferSelect;
export type ConvoyUpdate = typeof convoyUpdates.$inferSelect;
export type InsertConvoyUpdate = typeof convoyUpdates.$inferInsert;
