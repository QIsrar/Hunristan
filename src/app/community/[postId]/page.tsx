"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Send, ThumbsUp, MessageSquare, Loader2,
  Megaphone, Users, Trophy, Lightbulb,
} from "lucide-react";
import toast from "react-hot-toast";

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  discussion:   { label: "Discussion",       color: "text-accent",    bg: "bg-accent/10" },
  team_request: { label: "Looking for Team", color: "text-accent2",   bg: "bg-accent2/10" },
  showcase:     { label: "Showcase",         color: "text-accent3",   bg: "bg-accent3/10" },
  announcement: { label: "Announcement",     color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function PostDetailPage() {
  const { postId } = useParams() as { postId: string };
  const router = useRouter();
  const supabase = createClient();

  const [myId, setMyId]         = useState<string | null>(null);
  const [post, setPost]         = useState<any>(null);
  const [replies, setReplies]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [reply, setReply]       = useState("");
  const [sending, setSending]   = useState(false);

  useEffect(() => {
    (async () => {
      const user = await safeGetUser();
      if (user) setMyId(user.id);
    })();
    fetchPost();

    const ch = supabase.channel(`post:${postId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_replies",
        filter: `post_id=eq.${postId}` }, () => fetchPost())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId]);

  async function fetchPost() {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("community_posts").select("*, profiles(id, full_name, university)").eq("id", postId).single(),
      supabase.from("community_replies").select("*, profiles(id, full_name, university)").eq("post_id", postId).order("created_at"),
    ]);
    setPost(p);
    setReplies(r || []);
    setLoading(false);
  }

  async function sendReply() {
    if (!myId) { toast.error("Sign in first"); return; }
    if (!reply.trim()) return;
    setSending(true);
    const { error } = await supabase.from("community_replies").insert({
      post_id: postId, author_id: myId, content: reply.trim(),
    });
    if (error) toast.error(error.message);
    else { setReply(""); fetchPost(); }
    setSending(false);
  }

  async function upvotePost() {
    if (!myId) { toast.error("Sign in to upvote"); return; }
    await supabase.from("community_upvotes").insert({ user_id: myId, post_id: postId });
    await supabase.from("community_posts").update({ upvotes: (post?.upvotes || 0) + 1 }).eq("id", postId);
    fetchPost();
  }

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-accent" />
    </div>
  );

  if (!post) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <p className="text-muted">Post not found.</p>
    </div>
  );

  const meta = TYPE_META[post.post_type] || TYPE_META.discussion;
  const isMe = post.author_id === myId;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">

        {/* Back */}
        <button onClick={() => router.push("/community")}
          className="flex items-center gap-1.5 text-muted hover:text-text text-sm mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to Community
        </button>

        {/* Post card */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color} ${meta.bg}`}>{meta.label}</span>
            <span className="text-xs text-muted">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>

          <h1 className="font-display text-2xl font-bold mb-3">{post.title}</h1>
          <p className="text-muted text-sm leading-relaxed whitespace-pre-wrap mb-5">{post.content}</p>

          {/* Author + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-bg ${isMe ? "bg-accent" : "bg-gradient-to-br from-accent/50 to-accent2/50"}`}>
                {post.profiles?.full_name?.[0] || "?"}
              </div>
              <div>
                {post.profiles?.id && !isMe ? (
                  <a href={`/users/${post.profiles.id}`}
                    className="font-medium hover:text-accent transition-colors">{post.profiles?.full_name}</a>
                ) : (
                  <p className={`font-medium ${isMe ? "text-accent" : "text-text"}`}>{post.profiles?.full_name}</p>
                )}
                {post.profiles?.university && <p className="text-xs text-muted">{post.profiles.university}</p>}
              </div>
            </div>
            <button onClick={upvotePost}
              className="flex items-center gap-2 px-4 py-2 glass rounded-xl hover:text-accent transition-colors text-sm">
              <ThumbsUp size={14} /> {post.upvotes || 0} upvotes
            </button>
          </div>
        </div>

        {/* Replies */}
        <h2 className="font-semibold text-sm text-muted uppercase tracking-wide mb-4">
          {replies.length} Repl{replies.length !== 1 ? "ies" : "y"}
        </h2>

        <div className="space-y-3 mb-6">
          {replies.map(r => {
            const rIsMe = r.author_id === myId;
            return (
              <div key={r.id} className={`glass rounded-xl p-4 ${rIsMe ? "border-accent/20" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg shrink-0 ${rIsMe ? "bg-accent" : "bg-gradient-to-br from-accent/40 to-accent2/40"}`}>
                    {r.profiles?.full_name?.[0] || "?"}
                  </div>
                  {r.profiles?.id && !rIsMe ? (
                    <a href={`/users/${r.profiles.id}`}
                      className={`text-sm font-medium hover:text-accent transition-colors`}>{r.profiles?.full_name}</a>
                  ) : (
                    <span className={`text-sm font-medium ${rIsMe ? "text-accent" : "text-text"}`}>{r.profiles?.full_name}</span>
                  )}
                  <span className="text-xs text-muted">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                </div>
                <p className="text-sm text-muted leading-relaxed pl-8">{r.content}</p>
              </div>
            );
          })}
          {replies.length === 0 && (
            <p className="text-center text-muted text-sm py-6">No replies yet — be the first to respond!</p>
          )}
        </div>

        {/* Reply input */}
        {myId ? (
          <div className="glass rounded-2xl p-4 flex gap-3 items-end">
            <textarea value={reply} onChange={e => setReply(e.target.value)}
              rows={3} className="input-glass flex-1 resize-none text-sm"
              placeholder="Write a reply..."
              onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) sendReply(); }} />
            <button onClick={sendReply} disabled={sending || !reply.trim()}
              className="btn-primary flex items-center gap-2 shrink-0 disabled:opacity-50">
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Reply
            </button>
          </div>
        ) : (
          <div className="text-center py-6 glass rounded-2xl text-sm text-muted">
            <a href="/auth/signin" className="text-accent hover:underline">Sign in</a> to reply
          </div>
        )}
      </div>
    </div>
  );
}
