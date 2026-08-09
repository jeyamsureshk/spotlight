import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { styles } from "@/styles/profile.styles";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useUser } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, Pressable, FlatList } from "react-native";

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const { user } = useUser();

  const loggedInUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  const profile = useQuery(api.users.getUserProfile, { id: id as Id<"users"> });
  const posts = useQuery(api.posts.getPostsByUser, { userId: id as Id<"users"> });
  const followStatus = useQuery(
    api.follows.checkFollowStatus,
    loggedInUser?._id && id
      ? { viewerId: loggedInUser._id, profileId: id as Id<"users"> }
      : "skip"
  );

  const toggleFollow = useMutation(api.follows.toggleFollow);
  const createConversation = useMutation(api.messages.createOrGetConversation);

  const isFriends = followStatus?.isFriends ?? false;
  const hasRequested = followStatus?.hasRequested ?? false;
  const hasIncomingRequest = followStatus?.hasIncomingRequest ?? false;

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  };

  const handleSendMessage = async () => {
    if (!id || !isFriends) return;
    const conversationId = await createConversation({ otherUserId: id as Id<"users"> });
    if (conversationId) {
      router.push(`/message/${conversationId.toString()}`);
    }
  };

  if (profile === undefined || posts === undefined || followStatus === undefined) return <Loader />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          <View style={styles.avatarAndStats}>
            {/* AVATAR */}
            <Image
              source={profile.image}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />

            {/* STATS */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          <Text style={styles.name}>{profile.fullname}</Text>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          <View style={[styles.actionButtons, { flexDirection: "row", gap: 8 }]}> 
            <Pressable
              style={[
                styles.followButton,
                { flex: 1 },
                (isFriends || hasRequested || hasIncomingRequest) && styles.followingButton,
              ]}
              onPress={() => {
                if (loggedInUser?._id && id) {
                  toggleFollow({ viewerId: loggedInUser._id, profileId: id as Id<"users"> });
                }
              }}
            >
              <Text
                style={[
                  styles.followButtonText,
                  (isFriends || hasRequested || hasIncomingRequest) && styles.followingButtonText,
                ]}
              >
                {isFriends
                  ? "Friends"
                  : hasIncomingRequest
                  ? "Accept Request"
                  : hasRequested
                  ? "Request Sent"
                  : "Follow"}
              </Text>
            </Pressable>
            {isFriends && (
              <Pressable style={[styles.messageButton, { flex: 1 }]} onPress={handleSendMessage}>
                <Text style={styles.messageButtonText}>Message</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.postsGrid}>
          {!isFriends ? (
            <View style={styles.noPostsContainer}>
              <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
              <Text style={[styles.noPostsText, { color: COLORS.white, textAlign: "center" }]}>This user’s posts are private until your follow request is accepted.</Text>
            </View>
          ) : posts.length === 0 ? (
            <View style={styles.noPostsContainer}>
              <Ionicons name="images-outline" size={48} color={COLORS.grey} />
              <Text style={styles.noPostsText}>No posts yet</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              numColumns={3}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.gridItem}>
                  <Image
                    source={item.imageUrl}
                    style={styles.gridImage}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item._id}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
