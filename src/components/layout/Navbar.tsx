"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeGetUser } from "@/lib/supabase/getUser";
import { useTheme } from "@/context/ThemeContext";
import { Bell, Shield, LogOut, User, ChevronDown, Code2, Menu, X, Settings, Sun, Moon, MessageCircle } from "lucide-react";
import type { Profile } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    safeGetUser().then(async (user) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      const { count } = await supabase.from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("is_read", false);
      setUnreadCount(count || 0);

      const { data: dmCount } = await supabase.rpc("get_unread_dm_count", { p_user_id: user.id });
      if (typeof dmCount === "number") setUnreadMsgCount(dmCount);
    });
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { window.removeEventListener("scroll", handleScroll); document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };
  const dashboardHref = profile ? `/dashboard/${profile.role}` : "/auth/signin";
  const NAV_LINKS = [{ href: "/hackathons", label: "Hackathons" }, { href: "/participants", label: "Participants" }, { href: "/community", label: "Community" }, { href: "/about", label: "About" }, { href: "/mentors", label: "Mentors" }, { href: "/projects", label: "Projects" }];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass border-b border-white/5" : ""}`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Code2 size={22} className="text-accent" />
          <span className="font-display font-bold text-lg gradient-text tracking-wide">SMART HUNRISTAN</span>
          <span className="hidden md:block text-[10px] text-muted font-medium tracking-widest uppercase ml-1 mt-0.5">Hackathon Platform</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors relative ${isActive(link.href)
                  ? "text-accent font-medium"
                  : "hover:text-accent"
                }`}
            >
              {link.label}
              {isActive(link.href) && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></div>
              )}
            </Link>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun size={18} className="text-muted hover:text-accent" />
            ) : (
              <Moon size={18} className="text-muted hover:text-accent" />
            )}
          </button>

          {profile ? (
            <>
              <Link href="/messages" className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                <MessageCircle size={18} className="text-muted" />
                {unreadMsgCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent2 text-bg text-xs rounded-full flex items-center justify-center font-bold">{unreadMsgCount > 9 ? "9+" : unreadMsgCount}</span>}
              </Link>
              <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
                <Bell size={18} className="text-muted" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-bg text-xs rounded-full flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </Link>
              {profile.role === "admin" && <Link href="/dashboard/admin" className="p-2 rounded-lg hover:bg-accent2/10 transition-colors"><Shield size={18} className="text-accent2" /></Link>}
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 glass rounded-lg px-3 py-2 hover:border-accent/20 transition-all">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent2 flex items-center justify-center text-xs font-bold text-bg">{profile.full_name?.[0]?.toUpperCase()}</div>
                  <span className="text-sm">{profile.full_name.split(" ")[0]}</span>
                  <ChevronDown size={14} className={`text-muted transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 min-w-[220px] bg-black/70 backdrop-blur-2xl rounded-xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-white/10 z-50 animate-slide-up">
                    {/* User info header */}
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="text-sm font-semibold truncate">{profile.full_name}</div>
                      <div className="text-xs text-muted truncate mt-0.5">{profile.email}</div>
                      <div className="text-xs text-accent/70 capitalize mt-0.5">{profile.role}</div>
                    </div>

                    {/* Create Hackathon — organizer only */}
                    {profile.role === "organizer" && (
                      <Link
                        href="/hackathons/create"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors border-b border-white/5 text-accent"
                      >
                        <span className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center text-xs font-bold">+</span>
                        <span>Create Hackathon</span>
                      </Link>
                    )}

                    {/* Dashboard */}
                    <Link
                      href={dashboardHref}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                      <User size={14} className="text-accent shrink-0" />
                      <span>Dashboard</span>
                    </Link>

                    {/* Profile & Settings */}
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors"
                    >
                      <Settings size={14} className="text-muted shrink-0" />
                      <span>Profile &amp; Settings</span>
                    </Link>

                    <div className="border-t border-white/5" />

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={14} className="shrink-0" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/auth/signin" className="text-sm text-muted hover:text-text transition-colors px-4 py-2">Sign In</Link>
              <Link href="/auth/signup" className="btn-primary text-sm !py-2 !px-5">Get Started</Link>
            </>
          )}
        </div>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
      {mobileOpen && (
        <div className="md:hidden glass border-t border-white/5 px-6 py-4 space-y-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`block text-sm py-2 transition-colors ${isActive(link.href)
                  ? "text-accent font-medium"
                  : "text-muted hover:text-accent"
                }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {/* Theme toggle for mobile */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 text-sm py-2 text-muted hover:text-accent transition-colors mt-2"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          <div className="pt-3 border-t border-white/5 mt-3">
            {profile ? (
              <div className="space-y-2">
                <Link href={dashboardHref} className="block text-sm text-accent py-1" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <button onClick={handleSignOut} className="text-sm text-red-400">Sign Out</button>
              </div>
            ) : (
              <div className="flex gap-3">
                <Link href="/auth/signin" className="btn-secondary text-sm !py-2 !px-4" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link href="/auth/signup" className="btn-primary text-sm !py-2 !px-4" onClick={() => setMobileOpen(false)}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
