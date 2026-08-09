import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthenticatedUser } from "./users";

export const addComment = mutation({
  args: {
    content: v.string(),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError("Post not found");

    const commentId = await ctx.db.insert("comments", {
      userId: currentUser?._id,
      postId: args.postId,
      content: args.content,
    });

    // increment comment count by 1
    await ctx.db.patch(args.postId, { comments: post.comments + 1 });

    // create a notification if it's not my own post
    if (post.userId !== currentUser._id) {
      await ctx.db.insert("notifications", {
        receiverId: post.userId,
        senderId: currentUser._id,
        type: "comment",
        postId: args.postId,
        commentId,
      });
    }

    return commentId;
  },
});

export const getComments = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();

    const commentsWithInfo = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: {
            fullname: user!.fullname,
            image: user!.image,
          },
        };
      })
    );

    return commentsWithInfo;
  },
});

// --- NEW MUTATIONS ADDED BELOW ---

export const editComment = mutation({
  args: {
    commentId: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Comment not found");

    // Ensure the person editing is the original author
    if (comment.userId !== currentUser._id) {
      throw new ConvexError("Unauthorized: You can only edit your own comments");
    }

    await ctx.db.patch(args.commentId, {
      content: args.content,
    });
  },
});

export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getAuthenticatedUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError("Comment not found");

    // Ensure the person deleting is the original author
    if (comment.userId !== currentUser._id) {
      throw new ConvexError("Unauthorized: You can only delete your own comments");
    }

    // Decrement the comment count on the post by 1
    const post = await ctx.db.get(comment.postId);
    if (post) {
      await ctx.db.patch(comment.postId, { 
        comments: Math.max(0, post.comments - 1) // Ensures it doesn't go below 0
      });
    }

    // Delete the comment
    await ctx.db.delete(args.commentId);
  },
});
