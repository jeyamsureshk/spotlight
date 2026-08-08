import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { styles } from "@/styles/messages.styles";

export default function ConversationScreen() {
  const params = useLocalSearchParams();
  const conversationId = params?.conversationId
    ? Array.isArray(params.conversationId)
      ? params.conversationId[0]
      : params.conversationId
    : undefined;
  const router = useRouter();
  const [message, setMessage] = useState("");

  const conversation = useQuery(
    conversationId ? api.messages.getConversationMessages : undefined,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : undefined
  );
  const sendMessage = useMutation(api.messages.sendMessage);

  if (!conversationId || conversation === undefined) return <Loader />;

  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;

    await sendMessage({
      conversationId: conversationId as Id<"conversations">,
      content,
    });

    setMessage("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{conversation.otherUser?.username ?? "Chat"}</Text>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={conversation.messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const isMe = item.senderId.toString() === conversation.currentUserId.toString();
          return (
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.messageBubbleRight : styles.messageBubbleLeft,
              ]}
            >
              <Text style={styles.messageText}>{item.content}</Text>
              <Text style={styles.messageTime}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.grey}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
