"use client";
import { useEffect, useState } from "react";
import { safeGetUser } from "@/lib/supabase/getUser";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import { Bell, CheckCheck, Code2, Trophy, CreditCard, Megaphone, TrendingUp, Loader2 } from "lucide-react";
import type { Notification } from "@/types";
import { formatDistanceToNow } from "date-fns";

const NOTIF_ICONS: Record<string, any> = {
  submission_result: Code2,
  hackathon_start: Trophy,
  payment_update: CreditCard,
  announcement: Megaphone,
  rank_change: TrendingUp,
};

const NOTIF_COLORS: Record<string, string> = {
  submission_result: "text-accent bg-accent/10",
  hackathon_start: "text-accent3 bg-accent3/10",
  payment_update: "text-green-400 bg-green-400/10",
  announcement: "text-accent2 bg-accent2/10",
  rank_change: "text-yellow-400 bg-yellow-400/10",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let userId: string | null = null;

    async function load() {
      const user = await safeGetUser();
      if (!user) return router.push("/auth/signin");
      userId = user.id;

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
      setLoading(false);

      // Mark all as read after 2s
      setTimeout(async () => {
        await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
        setNotifications(n => n.map(notif => ({ ...notif, is_read: true })));
      }, 2000);

      // Realtime: listen for new notifications
      const channel = supabase
        .channel(`notifications:${user.id}`)
        .on("postgres_changes", {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as any, ...prev]);
        })
        .subscribe();

      return channel;
    }

    const channelPromise = load();
    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      }).catch(() => {});
    };
  }, []);

  const markAllRead = async () => {
    const user = await safeGetUser();
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
    setNotifications(n => n.map(notif => ({ ...notif, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-bg grid-bg">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Bell size={26} className="text-accent" /> Notifications
            </h1>
            {unreadCount > 0 && <p className="text-muted text-sm mt-1">{unreadCount} unread</p>}
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-2 text-sm text-accent hover:underline">
              <CheckCheck size={16} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 size={32} className="text-accent animate-spin mx-auto" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Bell size={48} className="text-muted/20 mx-auto mb-4" />
            <p className="text-muted font-display">All quiet here</p>
            <p className="text-muted text-sm mt-1">You'll see submission results, rank changes, and announcements here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = NOTIF_ICONS[n.type] || Bell;
              const colorClass = NOTIF_COLORS[n.type] || "text-muted bg-white/5";
              const [iconColor, iconBg] = colorClass.split(" ");

              return (
                <div key={n.id}
                  className={`glass rounded-xl p-4 flex items-start gap-4 transition-all ${!n.is_read ? "border border-accent/20 bg-accent/3" : "opacity-70"}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                    <Icon size={16} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-muted shrink-0">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                    </div>
                    <p className="text-muted text-xs mt-0.5 leading-relaxed">{n.message}</p>
                    {n.link && (
                      <Link href={n.link} className="text-xs text-accent hover:underline mt-1 inline-block">
                        {n.type === "submission_result" ? "Open Arena →" :
                         n.type === "payment_received" ? "Review Payment →" :
                         n.type === "payment_verified" ? "Enter Arena →" :
                         n.type === "payment_rejected" ? "Resubmit Payment →" :
                         n.type === "registration_confirmed" ? "View Hackathon →" :
                         "View details →"}
                      </Link>
                    )}
                  </div>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}