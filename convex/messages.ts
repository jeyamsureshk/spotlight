import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

function normalizeParticipantIds(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

async function areFriends(ctx: any, userA: any, userB: any) {
  const following = await ctx.db
    .query("follows")
    .withIndex("by_both", (q: any) =>
      q.eq("followerId", userA).eq("followingId", userB)
    )
    .first();

  const reverse = await ctx.db
    .query("follows")
    .withIndex("by_both", (q: any) =>
      q.eq("followerId", userB).eq("followingId", userA)
    )
    .first();

  return (
    !!following && (following.status === "accepted" || following.status === undefined) &&
    !!reverse && (reverse.status === "accepted" || reverse.status === undefined)
  );
}

export const createOrGetConversation = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    if (currentUser._id.toString() === args.otherUserId.toString()) {
      throw new Error("Cannot create a conversation with yourself");
    }

    const friends = await areFriends(ctx, currentUser._id, args.otherUserId);
    if (!friends) {
      throw new Error("You can only message friends after your follow request is accepted.");
    }

    const [userA, userB] = normalizeParticipantIds(
      currentUser._id.toString(),
      args.otherUserId.toString()
    ).map((id) => (id === currentUser._id.toString() ? currentUser._id : args.otherUserId));

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_participants", (q) => q.eq("userA", userA).eq("userB", userB))
      .first();

    if (existing) {
      return existing._id;
    }

    const conversationId = await ctx.db.insert("conversations", {
      userA,
      userB,
      lastMessageAt: Date.now(),
    });

    return conversationId;
  },
});

export const getConversations = query({
  handler: async (ctx) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const conversationsA = await ctx.db
      .query("conversations")
      .withIndex("by_userA", (q) => q.eq("userA", currentUser._id))
      .order("desc")
      .collect();

    const conversationsB = await ctx.db
      .query("conversations")
      .withIndex("by_userB", (q) => q.eq("userB", currentUser._id))
      .order("desc")
      .collect();

    const conversations = [...conversationsA, ...conversationsB];

    const results = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId =
          conversation.userA.toString() === currentUser._id.toString()
            ? conversation.userB
            : conversation.userA;

        const otherUser = await ctx.db.get(otherUserId);

        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .order("desc")
          .first();

        return {
          ...conversation,
          otherUser: otherUser
            ? {
                _id: otherUser._id,
                username: otherUser.username,
                image: otherUser.image,
              }
            : null,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
        };
      })
    );

    return results.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const getConversationMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const isParticipant =
      conversation.userA.toString() === currentUser._id.toString() ||
      conversation.userB.toString() === currentUser._id.toString();
    if (!isParticipant) {
      throw new Error("Unauthorized");
    }

    const otherUserId =
      conversation.userA.toString() === currentUser._id.toString()
        ? conversation.userB
        : conversation.userA;

    const otherUser = await ctx.db.get(otherUserId);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    const messagesWithSender = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender
            ? {
                _id: sender._id,
                username: sender.username,
                image: sender.image,
              }
            : null,
        };
      })
    );

    return {
      conversation,
      otherUser: otherUser
        ? {
            _id: otherUser._id,
            username: otherUser.username,
            image: otherUser.image,
          }
        : null,
      messages: messagesWithSender,
      currentUserId: currentUser._id,
    };
  },
});

export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const isParticipant =
      conversation.userA.toString() === currentUser._id.toString() ||
      conversation.userB.toString() === currentUser._id.toString();
    if (!isParticipant) {
      throw new Error("Unauthorized");
    }

    const otherUserId =
      conversation.userA.toString() === currentUser._id.toString()
        ? conversation.userB
        : conversation.userA;

    const friends = await areFriends(ctx, currentUser._id, otherUserId);
    if (!friends) {
      throw new Error("You can only message friends after your follow request is accepted.");
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUser._id,
      content: args.content,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
  },
});

// --- NEW MUTATIONS ADDED BELOW ---

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Ensure the person editing is the original sender
    if (message.senderId.toString() !== currentUser._id.toString()) {
      throw new Error("Unauthorized: You can only edit your own messages");
    }

    await ctx.db.patch(args.messageId, {
      content: args.content,
    });
  },
});

export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Ensure the person deleting is the original sender
    if (message.senderId.toString() !== currentUser._id.toString()) {
      throw new Error("Unauthorized: You can only delete your own messages");
    }

    await ctx.db.delete(args.messageId);
  },
});
