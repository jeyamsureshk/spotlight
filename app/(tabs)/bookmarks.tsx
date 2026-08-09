import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { styles } from "@/styles/feed.styles";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";

export default function Bookmarks() {
  const router = useRouter();
  const { userId: clerkUserId } = useAuth();
  const [searchText, setSearchText] = useState("");

  const bookmarkedPosts = useQuery(api.bookmarks.getBookmarkedPosts);
  const loggedInUser = useQuery(
    api.users.getUserByClerkId,
    clerkUserId ? { clerkId: clerkUserId } : "skip"
  );
  const searchResults = useQuery(
    api.users.searchUsersByName,
    searchText.trim().length > 0 ? { query: searchText } : "skip"
  );

  if (bookmarkedPosts === undefined) return <Loader />;

  const isSearching = searchText.trim().length > 0;
  const showNoResults = isSearching && searchResults !== undefined && searchResults.length === 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          placeholderTextColor={COLORS.grey}
          value={searchText}
          onChangeText={setSearchText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      {isSearching ? (
        <View style={{ flex: 1 }}>
          {searchResults === undefined ? (
            <Loader />
          ) : showNoResults ? (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No users found.</Text>
            </View>
          ) : (
            <FlatList
              data={searchResults?.filter((item) => item._id !== loggedInUser?._id) ?? []}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ padding: 8 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userResultItem}
                  onPress={() => router.push(`/user/${item._id}`)}
                >
                  <Text style={styles.userResultName}>{item.username}</Text>
                  <Text style={styles.userResultSubtext}>{item.fullname}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : bookmarkedPosts.length === 0 ? (
        <NoBookmarksFound />
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: 8,
            flexDirection: "row",
            flexWrap: "wrap",
          }}
        >
          {bookmarkedPosts.map((post) => {
            if (!post) return null;
            return (
              <View key={post._id} style={{ width: "33.33%", padding: 1 }}>
                <Image
                  source={post.imageUrl}
                  style={{ width: "100%", aspectRatio: 1 }}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function NoBookmarksFound() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
      }}
    >
      <Text style={{ color: COLORS.primary, fontSize: 22 }}>No bookmarked posts yet</Text>
    </View>
  );
}
