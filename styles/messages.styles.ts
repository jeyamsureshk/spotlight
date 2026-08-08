import { StyleSheet } from "react-native";
import { COLORS } from "@/constants/theme";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "JetBrainsMono-Medium",
    color: COLORS.primary,
  },
  backButton: {
    color: COLORS.primary,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    marginBottom: 12,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.surfaceLight,
  },
  conversationInfo: {
    flex: 1,
  },
  username: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  lastMessage: {
    color: COLORS.grey,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    color: COLORS.white,
    fontSize: 22,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.grey,
    textAlign: "center",
    fontSize: 16,
  },
  messagesList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 18,
    marginVertical: 6,
  },
  messageBubbleLeft: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.surface,
  },
  messageBubbleRight: {
    alignSelf: "flex-end",
    backgroundColor: COLORS.primary,
  },
  messageText: {
    color: COLORS.white,
    fontSize: 15,
  },
  messageTime: {
    marginTop: 4,
    color: COLORS.grey,
    fontSize: 11,
    textAlign: "right",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0.5,
    borderTopColor: COLORS.surface,
    backgroundColor: COLORS.background,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 24,
    paddingHorizontal: 16,
    color: COLORS.white,
    backgroundColor: COLORS.surface,
  },
  sendButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
  },
  sendButtonText: {
    color: COLORS.background,
    fontWeight: "700",
  },
});
