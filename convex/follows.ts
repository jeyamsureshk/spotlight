import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function getAcceptedFollow(ctx: any, followerId: any, followingId: any) {
  return await ctx.db
    .query("follows")
    .withIndex("by_both", (q: any) =>
      q.eq("followerId", followerId).eq("followingId", followingId)
    )
    .first();
}

async function getFollowRequest(ctx: any, requesterId: any, receiverId: any) {
  return await ctx.db
    .query("followRequests")
    .withIndex("by_pair", (q: any) =>
      q.eq("requesterId", requesterId).eq("receiverId", receiverId)
    )
    .first();
}

function formatConnectionStatus(viewerId: string, profileId: string, accepted: boolean, sent: boolean, received: boolean) {
  if (viewerId === profileId) return { status: "self", isFriends: false };
  if (accepted) return { status: "friends", isFriends: true };
  if (sent) return { status: "sent", isFriends: false };
  if (received) return { status: "received", isFriends: false };
  return { status: "none", isFriends: false };
}

export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q: any) => q.eq("followingId", args.userId))
      .collect();

    const followers = await Promise.all(
      follows
        .filter((follow) => follow.status === "accepted" || follow.status === undefined)
        .map(async (follow) => {
          return await ctx.db.get(follow.followerId);
        })
    );

    return followers.filter((u) => u !== null);
  },
});

export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q: any) => q.eq("followerId", args.userId))
      .collect();

    const following = await Promise.all(
      follows
        .filter((follow) => follow.status === "accepted" || follow.status === undefined)
        .map(async (follow) => {
          return await ctx.db.get(follow.followingId);
        })
    );

    return following.filter((u) => u !== null);
  },
});

export const checkFollowStatus = query({
  args: { viewerId: v.id("users"), profileId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.viewerId.toString() === args.profileId.toString()) {
      return { status: "self", isFriends: false, hasRequested: false, hasIncomingRequest: false };
    }

    const accepted =
      !!(await getAcceptedFollow(ctx, args.viewerId, args.profileId)) ||
      !!(await getAcceptedFollow(ctx, args.profileId, args.viewerId));

    const sent = !!(await getFollowRequest(ctx, args.viewerId, args.profileId));
    const received = !!(await getFollowRequest(ctx, args.profileId, args.viewerId));

    return {
      ...formatConnectionStatus(args.viewerId.toString(), args.profileId.toString(), accepted, sent, received),
      hasRequested: sent,
      hasIncomingRequest: received,
    };
  },
});

export const toggleFollow = mutation({
  args: { viewerId: v.id("users"), profileId: v.id("users") },
  handler: async (ctx, args) => {
    if (args.viewerId.toString() === args.profileId.toString()) return;

    const viewer = await ctx.db.get(args.viewerId);
    const profile = await ctx.db.get(args.profileId);
    if (!viewer || !profile) return;

    const acceptedFromViewer = await getAcceptedFollow(ctx, args.viewerId, args.profileId);
    const acceptedFromProfile = await getAcceptedFollow(ctx, args.profileId, args.viewerId);

    if (acceptedFromViewer || acceptedFromProfile) {
      if (acceptedFromViewer) await ctx.db.delete(acceptedFromViewer._id);
      if (acceptedFromProfile) await ctx.db.delete(acceptedFromProfile._id);

      await ctx.db.patch(viewer._id, {
        following: Math.max(0, (viewer.following || 0) - 1),
        followers: Math.max(0, (viewer.followers || 0) - 1),
      });
      await ctx.db.patch(profile._id, {
        following: Math.max(0, (profile.following || 0) - 1),
        followers: Math.max(0, (profile.followers || 0) - 1),
      });
      return;
    }

    const outgoingRequest = await getFollowRequest(ctx, args.viewerId, args.profileId);
    if (outgoingRequest) {
      await ctx.db.delete(outgoingRequest._id);
      return;
    }

    const incomingRequest = await getFollowRequest(ctx, args.profileId, args.viewerId);
    if (incomingRequest) {
      await ctx.db.delete(incomingRequest._id);
      await ctx.db.insert("follows", {
        followerId: args.viewerId,
        followingId: args.profileId,
        status: "accepted",
      });
      await ctx.db.insert("follows", {
        followerId: args.profileId,
        followingId: args.viewerId,
        status: "accepted",
      });

      await ctx.db.patch(viewer._id, {
        following: (viewer.following || 0) + 1,
        followers: (viewer.followers || 0) + 1,
      });
      await ctx.db.patch(profile._id, {
        following: (profile.following || 0) + 1,
        followers: (profile.followers || 0) + 1,
      });

      await ctx.db.insert("notifications", {
        receiverId: args.profileId,
        senderId: args.viewerId,
        type: "follow",
      });
      return;
    }

    await ctx.db.insert("followRequests", {
      requesterId: args.viewerId,
      receiverId: args.profileId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("notifications", {
      receiverId: args.profileId,
      senderId: args.viewerId,
      type: "follow_request",
    });
  },
});
