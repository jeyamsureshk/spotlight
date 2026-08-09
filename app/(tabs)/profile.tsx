import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { styles } from "@/styles/profile.styles";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  Alert,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
} from "react-native";

export default function Profile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { signOut, userId: clerkUserId } = useAuth();

  const profileUserId = Array.isArray(params.profileId)
    ? params.profileId[0]
    : params.profileId || clerkUserId;
  const isOwnProfile = profileUserId === clerkUserId;

  const [listType, setListType] = useState<"followers" | "following" | null>(null);

  const loggedInUser = useQuery(api.users.getUserByClerkId, clerkUserId ? { clerkId: clerkUserId } : "skip");
  const currentUser = useQuery(api.users.getUserByClerkId, profileUserId ? { clerkId: profileUserId } : "skip");

  const [selectedPost, setSelectedPost] = useState<Doc<"posts"> | null>(null);
  
  const posts = useQuery(
    api.posts.getPostsByUser, 
    currentUser?._id ? { userId: currentUser._id } : "skip"
  );

  const followersList = useQuery(api.follows.getFollowers, currentUser?._id ? { userId: currentUser._id } : "skip");
  const followingList = useQuery(api.follows.getFollowing, currentUser?._id ? { userId: currentUser._id } : "skip");

  const activeListData = listType === "followers" ? followersList : listType === "following" ? followingList : null;

  const followStatus = useQuery(
    api.follows.checkFollowStatus,
    !isOwnProfile && loggedInUser?._id && currentUser?._id
      ? { viewerId: loggedInUser._id, profileId: currentUser._id }
      : "skip"
  );

  const isFriends = followStatus?.isFriends ?? false;
  const hasRequested = followStatus?.hasRequested ?? false;
  const hasIncomingRequest = followStatus?.hasIncomingRequest ?? false;

  const toggleFollow = useMutation(api.follows.toggleFollow);
  const createConversation = useMutation(api.messages.createOrGetConversation);

  const handleFollowToggle = async () => {
    if (!loggedInUser?._id || !currentUser?._id) return;

    if (isFriends) {
      Alert.alert(
        "Remove Friend",
        "Are you sure you want to remove this friend? This will unfollow them.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unfollow",
            style: "destructive",
            onPress: async () => {
              await toggleFollow({ viewerId: loggedInUser._id, profileId: currentUser._id });
            },
          },
        ]
      );
      return;
    }

    await toggleFollow({ viewerId: loggedInUser._id, profileId: currentUser._id });
  };

  const handleSendMessage = async () => {
    if (!loggedInUser?._id || !currentUser?._id) return;
    const conversationId = await createConversation({ otherUserId: currentUser._id });
    if (conversationId) {
      router.push(`/message/${conversationId.toString()}`);
    }
  };

  if (!currentUser || posts === undefined) return <Loader />;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.username}>{currentUser.username}</Text>
        </View>
        <View style={styles.headerRight}>
          {isOwnProfile && (
            <TouchableOpacity style={styles.headerIcon} onPress={() => signOut()}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileInfo}>
          {/* AVATAR & STATS */}
          <View style={styles.avatarAndStats}>
            <View style={styles.avatarContainer}>
              <Image
                source={currentUser.image}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            </View>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{currentUser.posts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              
              <TouchableOpacity style={styles.statItem} onPress={() => setListType("followers")}>
                <Text style={styles.statNumber}>{currentUser.followers}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.statItem} onPress={() => setListType("following")}>
                <Text style={styles.statNumber}>{currentUser.following}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.name}>{currentUser.fullname}</Text>
          {currentUser.bio && <Text style={styles.bio}>{currentUser.bio}</Text>}

          {/* ACTION BUTTONS */}
          <View style={[styles.actionButtons, { flexDirection: "row", gap: 10 }]}>
            {isOwnProfile ? (
              // Navigate to the new edit-profile page
              <TouchableOpacity style={styles.editButton} onPress={() => router.push("/edit-profile")}>
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.editButton,
                    {
                      flex: 1,
                      backgroundColor:
                        isFriends || hasRequested || hasIncomingRequest
                          ? COLORS.grey
                          : COLORS.primary,
                    },
                  ]}
                  onPress={handleFollowToggle}
                >
                  <Text style={styles.editButtonText}>
                    {isFriends
                      ? "Friends"
                      : hasIncomingRequest
                      ? "Accept Request"
                      : hasRequested
                      ? "Request Sent"
                      : "Follow"}
                  </Text>
                </TouchableOpacity>

                {isFriends && (
                  <TouchableOpacity style={[styles.messageButton, { flex: 1 }]} onPress={handleSendMessage}>
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>

        {!isOwnProfile && !isFriends ? (
          <View style={{ alignItems: "center", padding: 32 }}>
            <Ionicons name="lock-closed" size={46} color={COLORS.primary} />
            <Text style={{ color: COLORS.white, marginTop: 16, textAlign: "center", fontSize: 16 }}>
              This user’s posts are private until your follow request is accepted.
            </Text>
          </View>
        ) : posts.length === 0 ? (
          <NoPostsFound />
        ) : null}

        {(!isOwnProfile && !isFriends) ? null : (
          <FlatList
            data={posts}
            numColumns={3}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.gridItem} onPress={() => setSelectedPost(item)}>
                <Image
                  source={item.imageUrl}
                  style={styles.gridImage}
                  contentFit="cover"
                  transition={200}
                />
              </TouchableOpacity>
            )}
          />
        )}
      </ScrollView>

      {/* SELECTED IMAGE MODAL */}
      <Modal visible={!!selectedPost} animationType="fade" transparent={true} onRequestClose={() => setSelectedPost(null)}>
        <View style={styles.modalBackdrop}>
          {selectedPost && (
            <View style={styles.postDetailContainer}>
              <View style={styles.postDetailHeader}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
              <Image source={selectedPost.imageUrl} cachePolicy={"memory-disk"} style={styles.postDetailImage} />
            </View>
          )}
        </View>
      </Modal>

      {/* FOLLOWERS / FOLLOWING LIST MODAL */}
      <Modal visible={!!listType} animationType="slide" transparent={true} onRequestClose={() => setListType(null)}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { height: '75%', marginTop: 'auto', paddingBottom: 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {listType === "followers" ? "Followers" : "Following"}
              </Text>
              <TouchableOpacity onPress={() => setListType(null)}>
                <Ionicons name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            {activeListData === undefined ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Loader /></View>
            ) : activeListData?.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="people-outline" size={48} color={COLORS.primary} />
                <Text style={{ color: COLORS.white, marginTop: 10, fontSize: 16 }}>No {listType} to show yet.</Text>
              </View>
            ) : (
              <FlatList
                data={activeListData}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#333' }}
                    onPress={() => {
                      setListType(null);
                      // 👇 FIX: Changed item.clerkId to item._id
                      router.push(`/user/${item._id}`);
                    }}
                  >
                    <Image source={item.image} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 15 }} contentFit="cover" />
                    <View>
                      <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: 'bold' }}>{item.fullname}</Text>
                      <Text style={{ color: COLORS.grey, fontSize: 14 }}>@{item.username}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function NoPostsFound() {
  return (
    <View style={{ height: "100%", backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
      <Ionicons name="images-outline" size={48} color={COLORS.primary} />
      <Text style={{ fontSize: 20, color: COLORS.white }}>No posts yet</Text>
    </View>
  );
}
