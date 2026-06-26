"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, Loader2, MessageSquare, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DiscussionMessage {
  id: string;
  problem_id: string;
  hackathon_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  is_organizer: boolean;
  is_pinned: boolean;
  created_at: string;
  profiles?: { full_name: string; role: string };
}

interface DiscussionProps {
  problemId: string;
  hackathonId: string;
  userId: string;
}

export default function Discussion({ problemId, hackathonId, userId }: DiscussionProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userRole, setUserRole] = useState<string>("participant");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get user role
    supabase.from("profiles").select("role").eq("id", userId).single()
      .then(({ data }) => { if (data) setUserRole(data.role); });

    // Load messages
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`discussion:${problemId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "discussion_messages",
        filter: `problem_id=eq.${problemId}`,
      }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [problemId]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("discussion_messages")
      .select("*, profiles(full_name, role)")
      .eq("problem_id", problemId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100);
    if (data) setMessages(data as DiscussionMessage[]);
    setLoading(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || sending) return;
    setSending(true);

    const isOrganizer = userRole === "organizer" || userRole === "admin";
    const { error } = await supabase.from("discussion_messages").insert({
      problem_id: problemId,
      hackathon_id: hackathonId,
      user_id: userId,
      content: newMessage.trim(),
      is_organizer: isOrganizer,
    });

    if (!error) {
      setNewMessage("");
      fetchMessages();
    }
    setSending(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="text-accent animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-display font-semibold mb-3 text-sm">
        Problem Discussion
        <span className="ml-2 text-xs text-muted font-normal">{messages.length} messages</span>
      </h2>

      {messages.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={28} className="text-muted/20 mx-auto mb-2" />
          <p className="text-muted text-xs">No discussion yet. Ask a question!</p>
        </div>
      ) : (
        <div className="space-y-3 mb-3 flex-1 overflow-y-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl border text-xs ${
                msg.is_pinned
                  ? "border-accent/25 bg-accent/5"
                  : msg.is_organizer
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-border bg-surface/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-semibold">
                  {msg.profiles?.full_name || "Anonymous"}
                </span>
                {msg.is_organizer && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[10px] font-medium">
                    Organizer
                  </span>
                )}
                {msg.is_pinned && (
                  <span className="flex items-center gap-1 text-accent text-[10px]">
                    <Pin size={9} /> Pinned
                  </span>
                )}
                <span className="text-muted ml-auto">
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-muted leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={sendMessage} className="flex gap-2 mt-auto">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask a question or share a hint..."
          className="input-glass text-xs py-2 flex-1"
          maxLength={500}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-accent hover:bg-accent/20 transition-colors text-xs disabled:opacity-40"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
        </button>
      </form>
    </div>
  );
}
