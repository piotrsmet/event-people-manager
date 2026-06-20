"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { EventMemberResponse } from "../../types/event";
import {
  getGeneralChat,
  getCoordinatorThread,
  getProfile,
  ChatMessageResponse,
} from "../actions/chat";

interface ChatManagerProps {
  eventId: string;
  token: string;
  members: EventMemberResponse[];
}

type ChatTarget = "GENERAL" | EventMemberResponse;

export default function ChatManager({ eventId, token, members }: ChatManagerProps) {
  const [activeTarget, setActiveTarget] = useState<ChatTarget>("GENERAL");
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [messages, setMessages] = useState<ChatMessageResponse[]>([]);
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMessageResponse[]>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [inputText, setInputText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const stompClientRef = useRef<Client | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch profile to know current user ID
  useEffect(() => {
    async function loadProfile() {
      const res = await getProfile();
      if (res.success && res.data) {
        setCurrentUser(res.data);
      }
    }
    loadProfile();
  }, []);

  // 2. Fetch history on active target change
  const loadChatHistory = useCallback(async (target: ChatTarget) => {
    setLoadingHistory(true);
    try {
      if (target === "GENERAL") {
        const res = await getGeneralChat(eventId);
        if (res.success && res.data) {
          setMessages(res.data);
        }
      } else {
        const res = await getCoordinatorThread(eventId, target.userId);
        if (res.success && res.data) {
          setMessages(res.data);
        }
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadChatHistory(activeTarget);
    // Clear unread count for current active target
    const targetKey = activeTarget === "GENERAL" ? "GENERAL" : activeTarget.userId;
    setUnreadCounts((prev) => ({ ...prev, [targetKey]: 0 }));
  }, [activeTarget, loadChatHistory]);

  // 3. Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loadingHistory]);

  // 4. WebSocket setup
  useEffect(() => {
    if (!token) return;

    // Połączenie przez SockJS do endpointu /ws na backendzie (localhost:8080)
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8080/ws"),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log("STOMP Chat: " + str);
      },
    });

    client.onConnect = () => {
      setIsConnected(true);

      // Subskrypcja chatu ogólnego
      client.subscribe(`/topic/events/${eventId}/chat/general`, (message) => {
        const payload = JSON.parse(message.body) as ChatMessageResponse;
        
        setMessages((prev) => {
          // Unikaj duplikowania własnych wiadomości
          if (prev.some((m) => m.id === payload.id)) return prev;
          
          if (activeTarget === "GENERAL") {
            return [...prev, payload];
          } else {
            // Jeśli nie mamy otwartego ogólnego chatu, zwiększamy licznik nieprzeczytanych
            setUnreadCounts((prevUnread) => ({
              ...prevUnread,
              GENERAL: (prevUnread.GENERAL || 0) + 1,
            }));
            return prev;
          }
        });
      });

      // Subskrypcja chatu z koordynatorami (jako koordynator odbieramy wszystkie wiadomości)
      client.subscribe(`/topic/events/${eventId}/chat/coordinators`, (message) => {
        const payload = JSON.parse(message.body) as ChatMessageResponse;
        
        // Określamy klucz wątku (dla koordynatora kluczem jest id wolontariusza)
        const volunteerId = payload.senderId === payload.recipientId 
          ? payload.senderId 
          : (payload.recipientId === null ? payload.senderId : payload.recipientId);

        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;

          // Jeśli ten wątek jest aktualnie otwarty
          if (activeTarget !== "GENERAL" && activeTarget.userId === volunteerId) {
            return [...prev, payload];
          } else {
            // Jeśli inny wątek, zwiększamy licznik nieprzeczytanych dla danego wolontariusza
            setUnreadCounts((prevUnread) => ({
              ...prevUnread,
              [volunteerId]: (prevUnread[volunteerId] || 0) + 1,
            }));
            return prev;
          }
        });
      });
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error("Broker reported error in Chat: " + frame.headers["message"]);
    };

    client.activate();
    stompClientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [eventId, token, activeTarget]);

  // 5. Send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !stompClientRef.current || !isConnected) return;

    const client = stompClientRef.current;
    if (activeTarget === "GENERAL") {
      client.publish({
        destination: `/app/events/${eventId}/chat/general`,
        body: JSON.stringify({
          content: inputText,
          channel: "GENERAL",
        }),
      });
    } else {
      client.publish({
        destination: `/app/events/${eventId}/chat/coordinators/send`,
        body: JSON.stringify({
          content: inputText,
          recipientId: activeTarget.userId,
          channel: "COORDINATORS",
        }),
      });
    }

    setInputText("");
  };

  // Filter members based on search and exclude coordinates themselves (or show all)
  const filteredMembers = members.filter((m) => {
    const isSelf = currentUser && m.userId === currentUser.id;
    const matchesSearch = m.username.toLowerCase().includes(searchQuery.toLowerCase());
    return !isSelf && matchesSearch;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case "COORDINATOR":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "SECURITY":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (_) {
      return "";
    }
  };

  return (
    <div className="dashboard-panel flex h-[600px] overflow-hidden bg-panel-bg/50 backdrop-blur-md">
      {/* Sidebar (List of chats) */}
      <div className="w-1/3 border-r border-panel-border flex flex-col h-full bg-panel-bg/25">
        {/* Title and Connection status */}
        <div className="p-4 border-b border-panel-border flex justify-between items-center">
          <h3 className="font-semibold text-text-main flex items-center gap-2">
            💬 Pokoje rozmów
          </h3>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? "bg-status-ok animate-pulse" : "bg-danger-red"
              }`}
            />
            <span className="text-[10px] text-text-muted">
              {isConnected ? "Połączono" : "Brak połączenia"}
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-panel-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Szukaj członka zespołu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dashboard-bg/50 border border-panel-border rounded-md py-1.5 pl-3 pr-8 text-xs text-text-main placeholder-text-muted focus:outline-none focus:border-primary-blue transition-colors"
            />
            <span className="absolute right-3 top-2 text-text-muted text-xs">🔍</span>
          </div>
        </div>

        {/* Chats lists */}
        <div className="flex-1 overflow-y-auto space-y-1 p-2">
          {/* General Chat Item */}
          <button
            onClick={() => setActiveTarget("GENERAL")}
            className={`w-full text-left p-3 rounded-md transition-all duration-200 flex items-center justify-between ${
              activeTarget === "GENERAL"
                ? "bg-primary-blue/15 border-l-4 border-primary-blue text-text-main"
                : "text-text-muted hover:bg-panel-border/30 hover:text-text-main"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-primary-blue/20 flex items-center justify-center text-primary-blue text-lg">
                📢
              </div>
              <div>
                <p className="text-sm font-medium">Kanał ogólny</p>
                <p className="text-xs opacity-75">Wszyscy uczestnicy</p>
              </div>
            </div>
            {unreadCounts.GENERAL > 0 && (
              <span className="bg-primary-blue text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-lg shadow-blue-500/30">
                {unreadCounts.GENERAL}
              </span>
            )}
          </button>

          <div className="pt-2 px-2 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Wątki prywatne (Direct)
            </span>
          </div>

          {/* Members Chat Items */}
          {filteredMembers.length === 0 ? (
            <p className="text-center py-6 text-xs text-text-muted">Brak członków zespołu</p>
          ) : (
            filteredMembers.map((member) => {
              const isSelected = activeTarget !== "GENERAL" && activeTarget.userId === member.userId;
              const hasUnread = unreadCounts[member.userId] > 0;
              const initials = member.username.substring(0, 2).toUpperCase();

              return (
                <button
                  key={member.userId}
                  onClick={() => setActiveTarget(member)}
                  className={`w-full text-left p-3 rounded-md transition-all duration-200 flex items-center justify-between ${
                    isSelected
                      ? "bg-panel-border/50 text-text-main border-l-4 border-primary-blue"
                      : "text-text-muted hover:bg-panel-border/30 hover:text-text-main"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-panel-border flex items-center justify-center font-bold text-xs text-text-main border border-panel-border">
                      {initials}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-main">{member.username}</p>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleColor(
                          member.role
                        )}`}
                      >
                        {member.role === "SECURITY" ? "🛡️ Ochrona" : member.role === "COORDINATOR" ? "👑 Koordynator" : "🙋 Wolontariusz"}
                      </span>
                    </div>
                  </div>
                  {hasUnread && (
                    <span className="bg-status-ok text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-lg shadow-emerald-500/30 animate-pulse">
                      {unreadCounts[member.userId]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col h-full bg-dashboard-bg/15">
        {/* Chat Header */}
        <div className="p-4 border-b border-panel-border flex items-center justify-between bg-panel-bg/25">
          <div className="flex items-center space-x-3">
            {activeTarget === "GENERAL" ? (
              <>
                <span className="text-xl">📢</span>
                <div>
                  <h4 className="font-semibold text-text-main">Kanał Ogólny</h4>
                  <p className="text-xs text-text-muted">Komunikacja ze wszystkimi uczestnikami</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-panel-border flex items-center justify-center font-bold text-sm text-text-main">
                  {activeTarget.username.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-text-main">{activeTarget.username}</h4>
                  <p className="text-xs text-text-muted">
                    Prywatna rozmowa ze sztabem koordynatorów
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingHistory ? (
            <div className="h-full flex flex-col items-center justify-center space-y-2">
              <div className="w-6 h-6 border-2 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
              <p className="text-text-muted text-xs">Wczytywanie historii...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-text-muted">
              <span className="text-4xl mb-2">✉️</span>
              <p className="text-sm">Brak wiadomości w tym wątku.</p>
              <p className="text-xs opacity-75">Napisz coś, aby rozpocząć rozmowę.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwnMessage = currentUser && msg.senderId === currentUser.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                >
                  {/* Sender Name */}
                  {!isOwnMessage && (
                    <span className="text-[10px] text-text-muted mb-1 ml-1">
                      {msg.senderUsername}
                    </span>
                  )}
                  {/* Bubble */}
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2.5 shadow-sm text-sm ${
                      isOwnMessage
                        ? "bg-primary-blue text-white rounded-br-none"
                        : "bg-panel-bg border border-panel-border text-text-main rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    <div className="flex justify-end items-center mt-1">
                      <span
                        className={`text-[9px] ${
                          isOwnMessage ? "text-blue-200" : "text-text-muted"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-panel-border bg-panel-bg/30 flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder={
              isConnected
                ? "Napisz wiadomość..."
                : "Brak połączenia - wysyłanie niedostępne"
            }
            disabled={!isConnected}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 bg-dashboard-bg border border-panel-border rounded-md px-4 py-2.5 text-sm text-text-main placeholder-text-muted focus:outline-none focus:border-primary-blue disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isConnected || !inputText.trim()}
            className="px-4 py-2.5 bg-primary-blue hover:bg-primary-hover disabled:bg-panel-border disabled:text-text-muted text-white rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <span>Wyślij</span>
            <span>✈️</span>
          </button>
        </form>
      </div>
    </div>
  );
}
