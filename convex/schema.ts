import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(), //johndoe
    fullname: v.string(), // John Doe
    email: v.string(),
    bio: v.optional(v.string()),
    image: v.string(),
    followers: v.number(),
    following: v.number(),
    posts: v.number(),
    clerkId: v.string(),
    age: v.optional(v.number()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    dob: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  posts: defineTable({
    userId: v.id("users"),
    imageUrl: v.string(),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    likes: v.number(),
    comments: v.number(),
  }).index("by_user", ["userId"]),

  likes: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),

  comments: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
    content: v.string(),
  }).index("by_post", ["postId"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    status: v.optional(v.union(v.literal("pending"), v.literal("accepted"))),
  })
    .index("by_follower", ["followerId"])
    .index("by_following", ["followingId"])
    .index("by_both", ["followerId", "followingId"]), // Crucial index for the queries to work

  followRequests: defineTable({
    requesterId: v.id("users"),
    receiverId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_receiver", ["receiverId"])
    .index("by_requester", ["requesterId"])
    .index("by_pair", ["requesterId", "receiverId"]),

  notifications: defineTable({
    receiverId: v.id("users"),
    senderId: v.id("users"),
    type: v.union(
      v.literal("like"),
      v.literal("comment"),
      v.literal("follow"),
      v.literal("follow_request")
    ),
    postId: v.optional(v.id("posts")),
    commentId: v.optional(v.id("comments")),
    read: v.optional(v.boolean()),
  })
    .index("by_receiver", ["receiverId"])
    .index("by_post", ["postId"]),

  conversations: defineTable({
    userA: v.id("users"),
    userB: v.id("users"),
    lastMessageAt: v.number(),
  })
    .index("by_participants", ["userA", "userB"])
    .index("by_userA", ["userA"])
    .index("by_userB", ["userB"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  bookmarks: defineTable({
    userId: v.id("users"),
    postId: v.id("posts"),
  })
    .index("by_user", ["userId"])
    .index("by_post", ["postId"])
    .index("by_user_and_post", ["userId", "postId"]),
});
