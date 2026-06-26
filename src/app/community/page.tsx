"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare, Plus, ThumbsUp, Users, Megaphone, Lightbulb,
  Trophy, Search, Filter, ArrowLeft, Send, Loader2, ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

const POST_TYPES = [
  { value: "all",           label: "All Posts",        icon: MessageSquare,  color: "text-muted" },
  { value: "discussion",    label: "Discussion",       icon: MessageSquare,  color: "text-accent" },
  { value: "team_request",  label: "Looking for Team", icon: Users,          color: "text-accent2" },
  { value: "showcase",      label: "Showcase",         icon: Trophy,         color: "text-accent3" },
  { value: "announcement",  label: "Announcement",     icon: Megaphone,      color: "text-amber-400" },
];

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  discussion:   { label: "Discussion",        color: "text-accent",    bg: "bg-accent/10" },
  team_request: { label: "Looking for Team",  color: "text-accent2",   bg: "bg-accent2/10" },
  showcase:     { label: "Showcase",          color: "text-accent3",   bg: "bg-accent3/10" },
  announcement: { label: "Announcement",      color: "text-amber-400", bg: "bg-amber-500/10" },
};

export default function CommunityPage() {
  const supabase = createClient();
  const [myId, setMyId]       = useState<string | null>(null);
  const [myName, setMyName]   = useState<string>("");
  const [posts, setPosts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New post form
  const [newTitle,   setNewTitle]   = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType,    setNewType]    = useState<string>("discussion");

  useEffect(() => {
    (async () => {
      const user = await safeGetUser();
      if (user) {
        setMyId(user.id);
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        setMyName(prof?.full_name || "");
      }
    })();
    fetchPosts();

    // Realtime
    const ch = supabase.channel("community_feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, () => fetchPosts())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("community_posts")
      .select("*, profiles(full_name, university, avatar_url), community_replies(count)")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  }

  async function submitPost() {
    if (!myId) { toast.error("Sign in first"); return; }
    if (!newTitle.trim() || !newContent.trim()) { toast.error("Title and content required"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("community_posts").insert({
      author_id: myId,
      title: newTitle.trim(),
      content: newContent.trim(),
      post_type: newType,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Post published!");
      setCreating(false);
      setNewTitle(""); setNewContent(""); setNewType("discussion");
      fetchPosts();
    }
    setSubmitting(false);
  }

  async function upvote(postId: string) {
    if (!myId) { toast.error("Sign in to upvote"); return; }
    const { error } = await supabase.from("community_upvotes").insert({ user_id: myId, post_id: postId });
    if (!error) {
      await supabase.from("community_posts").update({ upvotes: posts.find(p => p.id === postId)?.upvotes + 1 }).eq("id", postId);
      fetchPosts();
    }
  }

  const filtered = posts.filter(p => {
    const matchType = filter === "all" || p.post_type === filter;
    const matchSearch = !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.content?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3 mb-2">
            <MessageSquare size={28} className="text-accent" />
            Community
          </h1>
          <p className="text-muted text-sm">Connect with participants, form teams, discuss ideas and showcase your work.</p>
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="input-glass pl-9 w-full text-sm"
              placeholder="Search posts..." />
          </div>
          {/* New post button */}
          {myId && (
            <button onClick={() => setCreating(v => !v)}
              className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus size={16} /> New Post
            </button>
          )}
        </div>

        {/* Type filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {POST_TYPES.map(t => (
            <button key={t.value} onClick={() => setFilter(t.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                filter === t.value ? "bg-accent text-bg font-medium" : "glass text-muted hover:text-text"
              }`}>
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>

        {/* New post form */}
        {creating && (
          <div className="glass rounded-2xl p-5 mb-6 space-y-4 border border-accent/20">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Lightbulb size={15} className="text-accent" /> Create Post
            </h3>

            {/* Post type */}
            <div className="flex gap-2 flex-wrap">
              {POST_TYPES.filter(t => t.value !== "all").map(t => (
                <button key={t.value} type="button" onClick={() => setNewType(t.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all ${
                    newType === t.value ? "bg-accent text-bg font-medium" : "glass text-muted hover:text-text"
                  }`}>
                  <t.icon size={11} /> {t.label}
                </button>
              ))}
            </div>

            <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
              className="input-glass w-full" placeholder="Post title..." />
            <textarea value={newContent} onChange={e => setNewContent(e.target.value)}
              rows={4} className="input-glass w-full resize-none text-sm"
              placeholder={
                newType === "team_request"
                  ? "Tell others about yourself, your skills, and what kind of team you're looking for..."
                  : newType === "showcase"
                    ? "Share your project, achievements or what you built..."
                    : "Share your thoughts, questions or ideas..."
              } />

            <div className="flex justify-end gap-3">
              <button onClick={() => setCreating(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={submitPost} disabled={submitting} className="btn-primary text-sm flex items-center gap-2">
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Publish
              </button>
            </div>
          </div>
        )}

        {/* Posts list */}
        {loading ? (
          <div className="text-center py-20 text-muted animate-pulse">Loading community...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <MessageSquare size={40} className="text-muted mx-auto mb-3" />
            <p className="text-muted">No posts yet — be the first to share!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(post => {
              const meta = TYPE_META[post.post_type] || TYPE_META.discussion;
              const replyCount = post.community_replies?.[0]?.count || 0;
              const isMe = post.author_id === myId;
              return (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="block glass rounded-2xl p-5 hover:border-accent/20 transition-all group">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.is_pinned && (
                        <span className="text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded-full">📌 Pinned</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color} ${meta.bg}`}>
                        {meta.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap shrink-0">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-text group-hover:text-accent transition-colors mb-1 leading-snug">
                    {post.title}
                  </h3>

                  {/* Content preview */}
                  <p className="text-sm text-muted line-clamp-2 mb-4">{post.content}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-bg shrink-0 ${isMe ? "bg-accent" : "bg-gradient-to-br from-accent/50 to-accent2/50"}`}>
                        {post.profiles?.full_name?.[0] || "?"}
                      </div>
                      <span className={isMe ? "text-accent" : ""}>{post.profiles?.full_name || "Unknown"}</span>
                      {post.profiles?.university && <span>· {post.profiles.university}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={e => { e.preventDefault(); upvote(post.id); }}
                        className="flex items-center gap-1 hover:text-accent transition-colors">
                        <ThumbsUp size={12} /> {post.upvotes || 0}
                      </button>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={12} /> {replyCount}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
