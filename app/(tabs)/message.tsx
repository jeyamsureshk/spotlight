import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View, Image } from "react-native";
import { styles } from "@/styles/messages.styles";

export default function MessageScreen() {
  const router = useRouter();
  const conversations = useQuery(api.messages.getConversations);

  if (conversations === undefined) return <Loader />;
  if (conversations.length === 0) return <NoMessagesFound />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.conversationItem}
            onPress={() => router.push(`/message/${item._id}`)}
          >
            <View style={styles.avatarContainer}>
              <Image source={{ uri: item.otherUser?.image }} style={styles.avatar} />
            </View>
            <View style={styles.conversationInfo}>
              <Text style={styles.username}>{item.otherUser?.username ?? "Unknown"}</Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {item.lastMessage?.content ?? "No messages yet"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

function NoMessagesFound() {
  return (
    <View style={[styles.container, styles.emptyContainer]}>
      <Text style={styles.emptyTitle}>No messages yet</Text>
      <Text style={styles.emptySubtitle}>Start a conversation from a user profile.</Text>
    </View>
  );
}
