import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  View,
  Text,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Keyboard,
  Alert,
} from "react-native";
import Comment from "./Comment";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";

type CommentsModalProps = {
  postId: Id<"posts">;
  visible: boolean;
  onClose: () => void;
};

export default function CommentsModal({ onClose, postId, visible }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<Id<"comments"> | null>(null);

  const comments = useQuery(api.comments.getComments, { postId });
  const addComment = useMutation(api.comments.addComment);
  const editComment = useMutation(api.comments.editComment);
  const deleteComment = useMutation(api.comments.deleteComment);
  
  const insets = useSafeAreaInsets();
  const { user } = useUser(); 

  // Fetch current user from your DB to check ownership for Edit/Delete
  const currentUser = useQuery(api.users.getUserByClerkId, user ? { clerkId: user.id } : "skip");

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      if (editingCommentId) {
        // Handle Edit
        await editComment({
          commentId: editingCommentId,
          content: newComment.trim(),
        });
        setEditingCommentId(null);
      } else {
        // Handle New Comment
        await addComment({
          content: newComment.trim(),
          postId,
        });
      }

      setNewComment("");
      Keyboard.dismiss(); 
    } catch (error) {
      console.log("Error saving comment:", error);
    }
  };

const handleLongPress = (comment: any) => {
    // 👇 FIX: Changed comment.author._id to comment.userId
    if (currentUser?._id !== comment.userId) return;

    Alert.alert(
      "Comment Options",
      "What would you like to do?",
      [
        {
          text: "Edit",
          onPress: () => {
            setNewComment(comment.content);
            setEditingCommentId(comment._id);
          },
        },
        // ... rest of the alert options remain exactly the same
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment({ commentId: comment._id });
            } catch (error) {
              console.log("Error deleting comment:", error);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setNewComment("");
    Keyboard.dismiss();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={uiStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={uiStyles.sheetContainer}
        >
          {/* DRAG HANDLE */}
          <View style={uiStyles.dragHandle} />

          {/* HEADER */}
          <View style={uiStyles.header}>
            <Text style={uiStyles.modalTitle}>Comments</Text>
          </View>

          {/* COMMENTS LIST */}
          {comments === undefined ? (
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Loader />
            </View>
          ) : comments.length === 0 ? (
            <View style={uiStyles.emptyContainer}>
              <Text style={uiStyles.emptyText}>No comments yet.</Text>
              <Text style={uiStyles.emptySubtext}>Start the conversation.</Text>
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item._id}
              contentContainerStyle={uiStyles.commentsList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled" // Important so touches register while keyboard is up
              renderItem={({ item }) => (
                <TouchableOpacity 
                  activeOpacity={0.7} 
                  delayLongPress={250}
                  onLongPress={() => handleLongPress(item)}
                >
                  <Comment comment={item} />
                </TouchableOpacity>
              )}
            />
          )}

          {/* INSTAGRAM-STYLE INPUT AREA */}
          <View style={[uiStyles.inputSection, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            
            {/* Editing Indicator */}
            {editingCommentId && (
              <View style={uiStyles.editingBanner}>
                <Text style={uiStyles.editingText}>Editing comment...</Text>
                <TouchableOpacity onPress={cancelEdit}>
                  <Text style={uiStyles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={uiStyles.inputRow}>
              {user?.imageUrl && (
                <Image 
                  source={{ uri: user.imageUrl }} 
                  style={uiStyles.currentUserAvatar} 
                  contentFit="cover" 
                />
              )}
              
              <View style={uiStyles.inputWrapper}>
                <TextInput
                  style={uiStyles.input}
                  placeholder="Add a comment..."
                  placeholderTextColor={COLORS.grey}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={200}
                />
                <TouchableOpacity 
                  onPressIn={handleAddComment} // 👇 FIX: onPressIn triggers immediately before keyboard hides
                  disabled={!newComment.trim()}
                  style={uiStyles.postButtonContainer}
                >
                  <Text style={[uiStyles.postButton, !newComment.trim() && uiStyles.postButtonDisabled]}>
                    {editingCommentId ? "Save" : "Post"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ---------------- HIGH-QUALITY IG STYLES ----------------
const uiStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)", 
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: COLORS.background || "#000",
    height: "85%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)", 
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  commentsList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  emptySubtext: {
    color: COLORS.grey,
    fontSize: 14,
  },
  
  // Input Styles
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: COLORS.background || "#000",
  },
  editingBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  editingText: {
    color: "#0095F6",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelText: {
    color: COLORS.grey,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  currentUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginBottom: 2, 
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "rgba(255, 255, 255, 0.1)", 
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 40,
    maxHeight: 100, 
  },
  input: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    maxHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
  },
  postButtonContainer: {
    marginLeft: 12,
    marginBottom: 2,
  },
  postButton: {
    color: "#0095F6",
    fontSize: 15,
    fontWeight: "bold",
  },
  postButtonDisabled: {
    color: "rgba(0, 149, 246, 0.4)",
  },
});
