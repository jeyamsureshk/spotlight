import { Loader } from "@/components/Loader";
import { COLORS } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient"; // Added for bubble styling
import { useSafeAreaInsets } from "react-native-safe-area-context"; // Added for safe area padding
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet, // Added for new specific styles
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
  const insets = useSafeAreaInsets(); // Hook for Safe Area
  
  // -- REFS & STATES --
  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState("");
  
  // Selection & Edit States
  const [selectedMessages, setSelectedMessages] = useState<Id<"messages">[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<Id<"messages"> | null>(null);

  // -- CONVEX QUERIES & MUTATIONS --
  const conversation = useQuery(
    conversationId ? api.messages.getConversationMessages : undefined,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : undefined
  );
  
  const sendMessage = useMutation(api.messages.sendMessage);
  const editMessage = useMutation(api.messages.editMessage); // You'll need to create this backend function
  const deleteMessage = useMutation(api.messages.deleteMessage); // You'll need to create this backend function

  // -- AUTO SCROLL LOGIC --
  useEffect(() => {
    // Scroll to bottom whenever messages array changes length
    if (conversation?.messages?.length) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation?.messages?.length]);

  if (!conversationId || conversation === undefined) return <Loader />;

  // -- HANDLERS --
  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;

    if (editingMessageId) {
      // Handle Editing
      await editMessage({
        messageId: editingMessageId,
        content,
      });
      setEditingMessageId(null);
    } else {
      // Handle New Message
      await sendMessage({
        conversationId: conversationId as Id<"conversations">,
        content,
      });
    }
    setMessage("");
  };

  const toggleSelection = (id: Id<"messages">) => {
    if (selectedMessages.includes(id)) {
      setSelectedMessages(selectedMessages.filter((msgId) => msgId !== id));
    } else {
      setSelectedMessages([...selectedMessages, id]);
    }
  };

  const handleEditInit = () => {
    if (selectedMessages.length !== 1) return;
    const msgToEdit = conversation.messages.find((m) => m._id === selectedMessages[0]);
    if (msgToEdit) {
      setMessage(msgToEdit.content);
      setEditingMessageId(msgToEdit._id);
      setSelectedMessages([]); // Clear selection UI
    }
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      "Delete Messages",
      `Are you sure you want to delete ${selectedMessages.length} message(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete all selected messages concurrently
            await Promise.all(
              selectedMessages.map((id) => deleteMessage({ messageId: id }))
            );
            setSelectedMessages([]);
          },
        },
      ]
    );
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setMessage("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      {/* CONTEXTUAL HEADER (Changes if messages are selected) */}
      {selectedMessages.length > 0 ? (
        <View style={[styles.header, { backgroundColor: "rgba(37, 99, 235, 0.2)" }]}>
          <TouchableOpacity onPress={() => setSelectedMessages([])}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedMessages.length} Selected</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            {/* Only show Edit if exactly ONE message is selected */}
            {selectedMessages.length === 1 && (
              <TouchableOpacity onPress={handleEditInit}>
                <Ionicons name="pencil" size={22} color={COLORS.white} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleDeleteSelected}>
              <Ionicons name="trash" size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{conversation.otherUser?.username ?? "Chat"}</Text>
          <View style={{ width: 48 }} />
        </View>
      )}

      {/* MESSAGE LIST */}
      <FlatList
        ref={flatListRef}
        data={conversation.messages}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        // Fallback auto-scroll mechanisms for layout changes
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMe = item.senderId.toString() === conversation.currentUserId.toString();
          const isSelected = selectedMessages.includes(item._id);

          return (
            <View style={[chatStyles.messageRow, isMe ? chatStyles.rowRight : chatStyles.rowLeft]}>
              <TouchableOpacity
                activeOpacity={0.8}
                // Only allow selecting your own messages to edit/delete
                onLongPress={() => isMe && toggleSelection(item._id)}
                onPress={() => {
                  // If selection mode is active, standard taps should toggle selection
                  if (selectedMessages.length > 0 && isMe) {
                    toggleSelection(item._id);
                  }
                }}
                style={{ maxWidth: '80%' }}
              >
                {/* NEW STYLING: Premium Gradient Bubble */}
                <LinearGradient
                  colors={
                    isSelected ? (['#fca5a5', '#f87171'] as const)
                      : isMe ? (['#d1faef', '#d1faff'] as const)
                      : (['#d1fae5', '#d1faa5'] as const)
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    chatStyles.bubble,
                    isMe ? chatStyles.bubbleRight : chatStyles.bubbleLeft,
                    isSelected && chatStyles.bubbleSelected
                  ]}
                >
                  <View style={chatStyles.bubbleContent}>
                    <Text style={[chatStyles.messageText, isMe || isSelected ? chatStyles.textLight : chatStyles.textDark]}>
                      {item.content + "  "}
                    </Text>
                    <View style={chatStyles.metaContainer}>
                      <Text style={[chatStyles.timeText, isMe || isSelected ? chatStyles.timeLight : chatStyles.timeDark]}>
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " "}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* INPUT AREA */}
      <View style={{ paddingBottom: 0 }}>
        {/* Editing indicator */}
        {editingMessageId && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 15, paddingBottom: 5 }}>
            <Text style={{ color: COLORS.secondary, fontSize: 12 }}>Editing message...</Text>
            <TouchableOpacity onPress={cancelEdit}>
              <Text style={{ color: COLORS.grey, fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* NEW STYLING: Input Container with Safe Area Padding */}
        <View style={[chatStyles.inputContainer, { paddingBottom: Math.max(insets.bottom, 15) }]}>
          <View style={chatStyles.inputWrapper}>
            <TextInput
              style={chatStyles.textInput}
              value={message}
              onChangeText={setMessage}
              placeholder={editingMessageId ? "Edit your message..." : "Message..."}
              placeholderTextColor="#9ca3af"
              multiline
            />
            <TouchableOpacity 
              onPress={handleSend}
              disabled={!message.trim()}
              style={[chatStyles.sendButton, !message.trim() && chatStyles.sendButtonDisabled]}
            >
              <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------- NEW STYLES (Appended to prevent overwriting logic) ----------------
const chatStyles = StyleSheet.create({
  messageRow: {
    marginBottom: 8,
    width: '100%',
  },
  rowLeft: {
    alignItems: 'flex-start',
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    borderRadius: 20,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 14,
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  bubbleLeft: {
    borderBottomLeftRadius: 4,
  },
  bubbleRight: {
    borderBottomRightRadius: 4,
  },
  bubbleSelected: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  bubbleContent: {
    flexDirection: 'column',
    alignItems: 'flex-start', 
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 6,
    paddingBottom: 2,
  },
  timeText: {
    fontSize: 10,
  },
  // Text Colors
  textLight: { color: '#444' },
  textDark: { color: '#1f2937' },
  timeLight: { color: 'rgba(0,0,0,0.45)' },
  timeDark: { color: 'rgba(0,0,0,0.45)' },

  // Input & Button Styles
  inputContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 6,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
});
