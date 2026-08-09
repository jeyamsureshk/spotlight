import { Id } from "./_generated/dataModel";
import { mutation, MutationCtx, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    username: v.string(),
    fullname: v.string(),
    image: v.string(),
    bio: v.optional(v.string()),
    email: v.string(),
    clerkId: v.string(),
  },

  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) return;

    // create a user in db
    await ctx.db.insert("users", {
      username: args.username,
      fullname: args.fullname,
      email: args.email,
      bio: args.bio,
      image: args.image,
      clerkId: args.clerkId,
      followers: 0,
      following: 0,
      posts: 0,
    });
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    return user;
  },
});

export const updateProfile = mutation({
  args: {
    fullname: v.string(),
    bio: v.optional(v.string()),
    age: v.optional(v.number()),
    phone: v.optional(v.string()),
    gender: v.optional(v.string()),
    dob: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    await ctx.db.patch(currentUser._id, {
      fullname: args.fullname,
      bio: args.bio,
      age: args.age,
      phone: args.phone,
      gender: args.gender,
      dob: args.dob,
    });
  },
});

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthorized");

  const currentUser = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!currentUser) throw new Error("User not found");

  return currentUser;
}

export const getUserProfile = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) throw new Error("User not found");

    return user;
  },
});

export const searchUsersByName = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim().toLowerCase();
    if (!searchTerm) return [];

    const users = await ctx.db.query("users").collect();
    return users.filter((user) =>
      user.username.toLowerCase().includes(searchTerm)
    );
  },
});

export const isFollowing = query({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", args.followingId)
      )
      .first();

    return !!follow;
  },
});

export const toggleFollow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", currentUser._id).eq("followingId", args.followingId)
      )
      .first();

    if (existing) {
      // unfollow or cancel request
      await ctx.db.delete(existing._id);
      
      // FIX: Only subtract from counts if the follow was actually accepted
      if (existing.status === "accepted" || existing.status === undefined) {
        await updateFollowCounts(ctx, currentUser._id, args.followingId, false);
      }
    } else {
      // follow request
      await ctx.db.insert("follows", {
        followerId: currentUser._id,
        followingId: args.followingId,
        status: "pending",
      });

      // create a notification
      await ctx.db.insert("notifications", {
        receiverId: args.followingId,
        senderId: currentUser._id,
        type: "follow",
      });
    }
  },
});

// --- NEW MUTATIONS: Accept or Reject Follow Requests ---

export const acceptFollow = mutation({
  args: { followerId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    
    const followRequest = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", currentUser._id)
      )
      .first();

    if (followRequest && followRequest.status === "pending") {
      await ctx.db.patch(followRequest._id, { status: "accepted" });
      // Increment counts only when accepted
      await updateFollowCounts(ctx, args.followerId, currentUser._id, true);
    }
  }
});

export const rejectFollow = mutation({
  args: { followerId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    
    const followRequest = await ctx.db
      .query("follows")
      .withIndex("by_both", (q) =>
        q.eq("followerId", args.followerId).eq("followingId", currentUser._id)
      )
      .first();

    if (followRequest && followRequest.status === "pending") {
      await ctx.db.delete(followRequest._id);
    }
  }
});

// --------------------------------------------------------

async function updateFollowCounts(
  ctx: MutationCtx,
  followerId: Id<"users">,
  followingId: Id<"users">,
  isFollow: boolean
) {
  const follower = await ctx.db.get(followerId);
  const following = await ctx.db.get(followingId);

  if (follower && following) {
    await ctx.db.patch(followerId, {
      following: Math.max(0, follower.following + (isFollow ? 1 : -1)),
    });
    await ctx.db.patch(followingId, {
      followers: Math.max(0, following.followers + (isFollow ? 1 : -1)),
    });
  }
}
