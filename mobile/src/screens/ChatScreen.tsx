import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { api, ChatMessageResponse } from "../services/api";
import { BASE_URL } from "../services/api/base";
import { Client } from "@stomp/stompjs";

// Polyfill global TextEncoder / TextDecoder if missing (sometimes required for React Native JS engines)
if (typeof TextEncoder === "undefined") {
  class TextEncoder {
    encode(str: string) {
      const arr = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        arr[i] = str.charCodeAt(i);
      }
      return arr;
    }
  }
  (globalThis as any).TextEncoder = TextEncoder;
}

if (typeof TextDecoder === "undefined") {
  class TextDecoder {
    decode(arr: Uint8Array) {
      let str = "";
      for (let i = 0; i < arr.length; i++) {
        str += String.fromCharCode(arr[i]);
      }
      return str;
    }
  }
  (globalThis as any).TextDecoder = TextDecoder as any;
}

interface ChatScreenProps {
  onClose: () => void;
}

type TabType = "GENERAL" | "COORDINATORS";

export default function ChatScreen({ onClose }: ChatScreenProps) {
  const { user, selectedEvent, token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("GENERAL");
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<TabType, number>>({
    GENERAL: 0,
    COORDINATORS: 0,
  });

  const stompClientRef = useRef<Client | null>(null);
  const flatListRef = useRef<FlatList | null>(null);

  // 1. WebSocket URL calculation
  const getWsUrl = useCallback(() => {
    let url = BASE_URL;
    url = url.split("/api/v1")[0];
    if (url.startsWith("https://")) {
      url = url.replace("https://", "wss://");
    } else if (url.startsWith("http://")) {
      url = url.replace("http://", "ws://");
    }
    return `${url}/ws-raw`;
  }, []);

  // 2. Fetch Chat History
  const fetchHistory = useCallback(
    async (tab: TabType) => {
      if (!selectedEvent) return;
      setLoadingHistory(true);
      try {
        if (tab === "GENERAL") {
          const history = await api.getGeneralChat(selectedEvent.id);
          setMessages(history);
        } else {
          const history = await api.getCoordinatorChat(selectedEvent.id);
          setMessages(history);
        }
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      } finally {
        setLoadingHistory(false);
      }
    },
    [selectedEvent]
  );

  useEffect(() => {
    fetchHistory(activeTab);
    // Clear unread badge
    setUnreadCounts((prev) => ({ ...prev, [activeTab]: 0 }));
  }, [activeTab, fetchHistory]);

  // 3. Stomp client connection
  useEffect(() => {
    if (!token || !selectedEvent || !user) return;

    const wsUrl = getWsUrl();
    const client = new Client({
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      webSocketFactory: () => {
        return new (WebSocket as any)(wsUrl, [], {
          headers: {
            "Bypass-Tunnel-Reminder": "true",
          },
        });
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log("Mobile STOMP: " + str);
      },
    });

    client.onConnect = () => {
      setIsConnected(true);

      // Subskrypcja chatu ogólnego
      client.subscribe(`/topic/events/${selectedEvent.id}/chat/general`, (message) => {
        const payload = JSON.parse(message.body) as ChatMessageResponse;
        
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;

          if (activeTab === "GENERAL") {
            return [...prev, payload];
          } else {
            setUnreadCounts((prevUnread) => ({
              ...prevUnread,
              GENERAL: prevUnread.GENERAL + 1,
            }));
            return prev;
          }
        });
      });

      // Subskrypcja wiadomości od koordynatorów do tego zalogowanego wolontariusza
      client.subscribe(`/topic/events/${selectedEvent.id}/chat/user/${user.id}`, (message) => {
        const payload = JSON.parse(message.body) as ChatMessageResponse;

        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;

          if (activeTab === "COORDINATORS") {
            return [...prev, payload];
          } else {
            setUnreadCounts((prevUnread) => ({
              ...prevUnread,
              COORDINATORS: prevUnread.COORDINATORS + 1,
            }));
            return prev;
          }
        });
      });
    };

    client.onDisconnect = () => {
      setIsConnected(false);
      console.log("Mobile STOMP: disconnected");
    };

    client.onStompError = (frame) => {
      console.warn("Mobile STOMP error:", frame.headers["message"]);
      console.warn("Mobile STOMP error body:", frame.body);
    };

    client.onWebSocketClose = (evt) => {
      console.log("Mobile STOMP: WebSocket closed. Code:", evt.code, "Reason:", evt.reason, "WasClean:", evt.wasClean);
    };

    client.onWebSocketError = (err) => {
      console.log("Mobile STOMP: WebSocket error:", err);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token, selectedEvent, user, activeTab, getWsUrl]);

  // 4. Send Message
  const handleSendMessage = () => {
    if (!inputText.trim() || !stompClientRef.current || !isConnected || !selectedEvent) return;

    const client = stompClientRef.current;
    if (activeTab === "GENERAL") {
      client.publish({
        destination: `/app/events/${selectedEvent.id}/chat/general`,
        body: JSON.stringify({
          content: inputText,
          channel: "GENERAL",
        }),
      });
    } else {
      client.publish({
        destination: `/app/events/${selectedEvent.id}/chat/coordinators/send`,
        body: JSON.stringify({
          content: inputText,
          channel: "COORDINATORS",
        }),
      });
    }

    setInputText("");
    Keyboard.dismiss();
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  };

  const renderMessageItem = ({ item }: { item: ChatMessageResponse }) => {
    const isOwn = user && item.senderId === user.id;

    return (
      <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
        {!isOwn && <Text style={styles.senderText}>{item.senderUsername}</Text>}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
            {item.content}
          </Text>
          <Text style={[styles.timeText, isOwn ? styles.timeTextOwn : styles.timeTextOther]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onClose}>
          <Text style={styles.backButtonText}>⬅ Powrót</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Czat Wydarzenia</Text>
        <View style={styles.connectionBadge}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: isConnected ? "#10b981" : "#ef4444" },
            ]}
          />
          <Text style={styles.connectionText}>
            {isConnected ? "Live" : "Offline"}
          </Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === "GENERAL" && styles.tabItemActive]}
          onPress={() => setActiveTab("GENERAL")}
        >
          <Text style={[styles.tabText, activeTab === "GENERAL" && styles.tabTextActive]}>
            📢 Ogólny
          </Text>
          {unreadCounts.GENERAL > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCounts.GENERAL}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === "COORDINATORS" && styles.tabItemActive]}
          onPress={() => setActiveTab("COORDINATORS")}
        >
          <Text style={[styles.tabText, activeTab === "COORDINATORS" && styles.tabTextActive]}>
            🛡 Kontakt z Koordynatorem
          </Text>
          {unreadCounts.COORDINATORS > 0 && (
            <View style={[styles.badge, { backgroundColor: "#10b981" }]}>
              <Text style={styles.badgeText}>{unreadCounts.COORDINATORS}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        {loadingHistory ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Ładowanie wiadomości...</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✉️</Text>
            <Text style={styles.emptyText}>Brak wiadomości w tym kanale</Text>
            <Text style={styles.emptySubText}>Rozpocznij konwersację wpisując tekst poniżej</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={
              isConnected ? "Napisz wiadomość..." : "Brak połączenia..."
            }
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            editable={isConnected}
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!isConnected || !inputText.trim()) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!isConnected || !inputText.trim()}
          >
            <Text style={styles.sendButtonText}>✈️</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a", // slate-900
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155", // slate-700
    backgroundColor: "#1e293b", // slate-800
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: "#334155",
  },
  backButtonText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  connectionText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: "#2563eb",
  },
  tabText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#f8fafc",
  },
  badge: {
    backgroundColor: "#2563eb",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#white",
    fontSize: 9,
    fontWeight: "bold",
  },
  keyboardView: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptySubText: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
    maxWidth: "80%",
  },
  messageRowOwn: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  messageRowOther: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  senderText: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 3,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  bubbleOwn: {
    backgroundColor: "#2563eb",
    borderBottomRightRadius: 0,
  },
  bubbleOther: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderBottomLeftRadius: 0,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  messageTextOwn: {
    color: "#ffffff",
  },
  messageTextOther: {
    color: "#f8fafc",
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  timeTextOwn: {
    color: "#bfdbfe",
  },
  timeTextOther: {
    color: "#94a3b8",
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#334155",
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#334155",
  },
  sendButton: {
    backgroundColor: "#2563eb",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#334155",
  },
  sendButtonText: {
    fontSize: 16,
    color: "#ffffff",
  },
});
