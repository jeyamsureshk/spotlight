// styles/create.styles.ts
import { StyleSheet, Dimensions, Platform } from "react-native";
import { COLORS } from "@/constants/theme";

const { width } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Standard Instagram dark/black background
  },
  contentContainer: {
    flex: 1,
  },
  
  /* --- HEADER (IG Style) --- */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 56, // Fixed height for consistent IG feel
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.15)", // Subtle separator line
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700", // Bolder text for IG headers
    color: COLORS.white,
  },
  contentDisabled: {
    opacity: 0.6,
  },
  shareButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
    alignItems: "flex-end", // Align to the right edge
    justifyContent: "center",
  },
  shareButtonDisabled: {
    opacity: 0.4,
  },
  shareText: {
    color: "#0095F6", // Signature Instagram Blue for "Share" or "Next"
    fontSize: 16,
    fontWeight: "600",
  },
  shareTextDisabled: {
    color: COLORS.grey,
  },

  /* --- EMPTY STATE --- */
  emptyImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)", // Very subtle dark grey
  },
  emptyImageText: {
    color: COLORS.grey,
    fontSize: 16,
    fontWeight: "500",
  },

  /* --- CONTENT --- */
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  /* --- IMAGE PREVIEW --- */
  imageSection: {
    width: width,
    height: width, // 1:1 Aspect Ratio default
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.8)", // Darker translucent background
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20, // More rounded pill shape like IG
    gap: 6,
  },
  changeImageText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },

  /* --- CAPTION INPUT (IG Style) --- */
  inputSection: {
    flex: 1,
  },
  captionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255, 255, 255, 0.1)", // Separator below caption like IG
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginTop: 2, // Slight adjustment to align perfectly with the first line of text
  },
  captionInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15, // Standard IG text size
    minHeight: 40,
    paddingTop: 8,
    lineHeight: 20,
    textAlignVertical: "top", // Ensures text starts at the top of multiline inputs on Android
  },
});
