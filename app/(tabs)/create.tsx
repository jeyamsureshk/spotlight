import { COLORS } from "@/constants/theme";
import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const { width } = Dimensions.get("window");

export default function CreateScreen() {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets(); // Ensures header doesn't overlap the notch

  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Enables the native crop editor
      // 👇 FIX: Removed `aspect: [1, 1]` to allow independent, free-form cropping
      quality: 0.8,
    });

    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const generateUploadUrl = useMutation(api.posts.generateUploadUrl);
  const createPost = useMutation(api.posts.createPost);

  const handleShare = async () => {
    if (!selectedImage) return;

    try {
      setIsSharing(true);
      const uploadUrl = await generateUploadUrl();

      const uploadResult = await FileSystem.uploadAsync(uploadUrl, selectedImage, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        mimeType: "image/jpeg",
      });

      if (uploadResult.status !== 200) throw new Error("Upload failed");

      const { storageId } = JSON.parse(uploadResult.body);
      await createPost({ storageId, caption });

      setSelectedImage(null);
      setCaption("");

      router.push("/(tabs)");
    } catch (error) {
      console.log("Error sharing post");
    } finally {
      setIsSharing(false);
    }
  };

  // --- EMPTY STATE UI ---
  if (!selectedImage) {
    return (
      <View style={[uiStyles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        <View style={uiStyles.header}>
          <TouchableOpacity onPress={() => router.back()} style={uiStyles.iconButton}>
            <Ionicons name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={uiStyles.headerTitle}>New Post</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={uiStyles.emptyStateContainer}>
          <TouchableOpacity style={uiStyles.uploadCircle} onPress={pickImage}>
            <Ionicons name="camera-outline" size={48} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={uiStyles.emptyStateTitle}>Share a Photo</Text>
          <Text style={uiStyles.emptyStateSubtext}>Choose a photo from your camera roll to share with your friends.</Text>
          
          <TouchableOpacity style={uiStyles.primaryButton} onPress={pickImage}>
            <Text style={uiStyles.primaryButtonText}>Select from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- COMPOSE POST UI ---
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[uiStyles.container, { paddingTop: insets.top }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={uiStyles.contentContainer}>
        {/* HEADER */}
        <View style={uiStyles.header}>
          <TouchableOpacity
            onPress={() => {
              setSelectedImage(null);
              setCaption("");
            }}
            disabled={isSharing}
            style={uiStyles.iconButton}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={isSharing ? COLORS.grey : COLORS.white}
            />
          </TouchableOpacity>
          <Text style={uiStyles.headerTitle}>New Post</Text>
          
          <TouchableOpacity
            style={uiStyles.shareButton}
            disabled={isSharing || !selectedImage}
            onPress={handleShare}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#0095F6" />
            ) : (
              <Text style={[uiStyles.shareText, (!selectedImage || isSharing) && uiStyles.shareTextDisabled]}>
                Share
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={uiStyles.scrollContent}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[uiStyles.content, isSharing && uiStyles.contentDisabled]}>
            
            {/* IMAGE SECTION */}
            <View style={uiStyles.imageSection}>
              <Image
                source={selectedImage}
                style={uiStyles.previewImage}
                contentFit="contain" // Keeps the free-form crop fully visible
                transition={300}
              />
              <TouchableOpacity
                style={uiStyles.changeImageButton}
                onPress={pickImage}
                disabled={isSharing}
              >
                <Ionicons name="pencil" size={16} color={COLORS.white} />
                <Text style={uiStyles.changeImageText}>Edit</Text>
              </TouchableOpacity>
            </View>

            {/* INPUT SECTION */}
            <View style={uiStyles.inputSection}>
              <View style={uiStyles.captionContainer}>
                {user?.imageUrl && (
                  <Image
                    source={{ uri: user.imageUrl }}
                    style={uiStyles.userAvatar}
                    contentFit="cover"
                  />
                )}
                <TextInput
                  style={uiStyles.captionInput}
                  placeholder="Write a caption..."
                  placeholderTextColor={COLORS.grey}
                  multiline
                  maxLength={500}
                  value={caption}
                  onChangeText={setCaption}
                  editable={!isSharing}
                />
              </View>
            </View>
            
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------- HIGH-QUALITY UI STYLES ----------------
const uiStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000", // Instagram dark mode background
  },
  contentContainer: {
    flex: 1,
  },
  
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.15)",
  },
  iconButton: {
    padding: 8,
    minWidth: 44,
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
  },
  shareButton: {
    padding: 8,
    minWidth: 44,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  shareText: {
    color: "#0095F6", // Instagram Blue
    fontSize: 16,
    fontWeight: "600",
  },
  shareTextDisabled: {
    color: "rgba(0, 149, 246, 0.4)", // Faded blue
  },

  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  uploadCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  emptyStateSubtext: {
    color: COLORS.grey,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: "#0095F6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },

  // Compose State
  contentDisabled: {
    opacity: 0.5,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
  },
  imageSection: {
    width: width,
    height: width, // Max height is 1:1, but 'contain' allows other ratios to fit nicely
    backgroundColor: "#111", // Slightly lighter than black to frame the photo
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changeImageButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  changeImageText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  
  // Input Section
  inputSection: {
    padding: 16,
    flex: 1,
  },
  captionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    marginTop: 2, // Aligns perfectly with top of text
  },
  captionInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    minHeight: 40,
    lineHeight: 20,
    textAlignVertical: "top", // Fixes Android multiline alignment
  },
});
