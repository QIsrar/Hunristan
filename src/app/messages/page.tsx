"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import Navbar from "@/components/layout/Navbar";
import { formatDistanceToNow, format } from "date-fns";
import { Send, Loader2, Search, ArrowLeft, MessageSquare, CheckCircle2 } from "lucide-react";

interface Conversation {
  other_id: string;
  other_name: string;
  other_uni: string | null;
  last_message: string;
  last_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  from_id: string;
  to_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get("user_id");
  const supabase = createClient();

  const [myId, setMyId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(initialUserId || null);
  const [activeUserMeta, setActiveUserMeta] = useState<{ full_name: string; university: string | null } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [msgInput, setMsgInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load user & conversations
  useEffect(() => {
    async function init() {
      const u = await safeGetUser();
      if (!u) {
        router.push("/auth/signin");
        return;
      }
      setMyId(u.id);

      // Fetch conversations
      const { data: convos } = await supabase.rpc("get_dm_conversations", { p_user_id: u.id });
      let loadedConvos = (convos as Conversation[]) || [];

      // If we opened with a specific user_id, ensure they are in the sidebar
      if (initialUserId && initialUserId !== u.id) {
        const existing = loadedConvos.find(c => c.other_id === initialUserId);
        if (!existing) {
          // Fetch their info and prepend a dummy empty conversation
          const { data: prof } = await supabase.from("profiles").select("full_name, university").eq("id", initialUserId).single();
          if (prof) {
            loadedConvos = [
              {
                other_id: initialUserId,
                other_name: prof.full_name,
                other_uni: prof.university,
                last_message: "New conversation",
                last_at: new Date().toISOString(),
                unread_count: 0
              },
              ...loadedConvos
            ];
          }
        }
      }

      setConversations(loadedConvos);
      setLoading(false);
    }
    init();
  }, [initialUserId, router]);

  // Fetch messages for active user
  useEffect(() => {
    if (!myId || !activeUserId) return;

    // Set meta for active user
    const c = conversations.find(x => x.other_id === activeUserId);
    if (c) {
      setActiveUserMeta({ full_name: c.other_name, university: c.other_uni });
    } else {
      supabase.from("profiles").select("full_name, university").eq("id", activeUserId).single().then(({ data }) => {
        if (data) setActiveUserMeta(data);
      });
    }

    // Fetch message history
    async function fetchMessages() {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(from_id.eq.${myId},to_id.eq.${activeUserId}),and(from_id.eq.${activeUserId},to_id.eq.${myId})`)
        .order("created_at", { ascending: true });
      
      if (data) {
        setMessages(data as Message[]);
        // Mark as read
        const unreadIds = data.filter(m => m.to_id === myId && !m.read).map(m => m.id);
        if (unreadIds.length > 0) {
          await supabase.from("direct_messages").update({ read: true }).in("id", unreadIds);
          setConversations(prev => prev.map(cv => cv.other_id === activeUserId ? { ...cv, unread_count: 0 } : cv));
        }
      }
    }
    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`dm_${activeUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.from_id === myId && newMsg.to_id === activeUserId) ||
            (newMsg.from_id === activeUserId && newMsg.to_id === myId)
          ) {
            setMessages(prev => [...prev, newMsg]);
            if (newMsg.to_id === myId) {
              supabase.from("direct_messages").update({ read: true }).eq("id", newMsg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myId, activeUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = async () => {
    if (!msgInput.trim() || !myId || !activeUserId) return;
    setSending(true);
    const content = msgInput.trim();
    setMsgInput("");

    // Optimistic insert
    const optimisticMsg: Message = {
      id: Math.random().toString(),
      from_id: myId,
      to_id: activeUserId,
      content,
      read: false,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);

    const { error } = await supabase.from("direct_messages").insert({
      from_id: myId,
      to_id: activeUserId,
      content
    });

    if (error) {
      console.error(error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg grid-bg flex flex-col">
      <Navbar />
      <div className="flex-1 pt-16 flex overflow-hidden max-w-7xl mx-auto w-full px-4 py-6 gap-6">
        
        {/* Sidebar */}
        <div className={`w-full md:w-80 flex flex-col glass rounded-2xl overflow-hidden shrink-0 transition-all ${activeUserId ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h2 className="font-display font-bold text-lg">Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <MessageSquare size={32} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No messages yet.</p>
                <p className="text-xs mt-1">Visit a participant's profile to start chatting.</p>
              </div>
            ) : (
              conversations.map(c => (
                <button
                  key={c.other_id}
                  onClick={() => setActiveUserId(c.other_id)}
                  className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${activeUserId === c.other_id ? "bg-accent/10 border border-accent/20" : "hover:bg-white/5 border border-transparent"}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/50 to-accent2/50 flex items-center justify-center font-bold text-sm shrink-0">
                    {c.other_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <span className="font-medium text-sm truncate pr-2">{c.other_name}</span>
                      <span className="text-[10px] text-muted shrink-0">{formatDistanceToNow(new Date(c.last_at), { addSuffix: true })}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-xs truncate ${c.unread_count > 0 ? "text-text font-medium" : "text-muted"}`}>{c.last_message}</span>
                      {c.unread_count > 0 && (
                        <span className="w-4 h-4 rounded-full bg-accent text-bg text-[9px] font-bold flex items-center justify-center shrink-0 ml-2">
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={`flex-1 flex flex-col glass rounded-2xl overflow-hidden ${!activeUserId ? "hidden md:flex" : "flex"}`}>
          {!activeUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted">
              <MessageSquare size={48} className="mb-4 opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border/50 bg-surface/30 flex items-center gap-3">
                <button className="md:hidden p-2 -ml-2 rounded-lg hover:bg-white/5" onClick={() => setActiveUserId(null)}>
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent/50 to-accent2/50 flex items-center justify-center font-bold text-sm">
                  {activeUserMeta?.full_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <h3 className="font-semibold">{activeUserMeta?.full_name || "Loading..."}</h3>
                  <p className="text-xs text-muted">{activeUserMeta?.university || "Participant"}</p>
                </div>
              </div>

              {/* Messages Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted text-sm text-center">
                    <p>This is the beginning of your conversation with {activeUserMeta?.full_name?.split(" ")[0]}.</p>
                    <p className="text-xs mt-1">Say hi!</p>
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isMe = m.from_id === myId;
                    const showDate = i === 0 || new Date(messages[i-1].created_at).toDateString() !== new Date(m.created_at).toDateString();
                    return (
                      <div key={m.id}>
                        {showDate && (
                          <div className="flex justify-center my-4">
                            <span className="text-[10px] text-muted bg-surface/50 px-2 py-1 rounded-full uppercase tracking-wider">
                              {format(new Date(m.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-accent text-bg rounded-br-sm" : "bg-surface/80 border border-border/50 text-text rounded-bl-sm"}`}>
                            <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                          </div>
                        </div>
                        <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
                          <span className="text-[10px] text-muted flex items-center gap-1">
                            {format(new Date(m.created_at), "h:mm a")}
                            {isMe && m.read && <CheckCircle2 size={10} className="text-accent ml-1" />}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 bg-surface/30 border-t border-border/50">
                <form 
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-end gap-2"
                >
                  <textarea
                    className="flex-1 input-glass resize-none py-3 px-4 min-h-[48px] max-h-32 text-sm"
                    placeholder="Type a message..."
                    rows={1}
                    value={msgInput}
                    onChange={(e) => {
                      setMsgInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button 
                    type="submit" 
                    disabled={!msgInput.trim() || sending}
                    className="h-12 w-12 rounded-xl bg-accent text-bg flex items-center justify-center shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
                  >
                    <Send size={18} className={msgInput.trim() ? "translate-x-0.5 -translate-y-0.5" : ""} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg flex items-center justify-center"><Loader2 size={32} className="text-accent animate-spin" /></div>}>
      <MessagesContent />
    </Suspense>
  );
}
