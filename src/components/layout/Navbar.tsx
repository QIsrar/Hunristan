"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bell, Shield, LogOut, User, ChevronDown, Code2, Menu, X, Settings } from "lucide-react";
import type { Profile } from "@/types";

export default function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data);
      const { count } = await supabase.from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id).eq("is_read", false);
      setUnreadCount(count || 0);
    });
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { window.removeEventListener("scroll", handleScroll); document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = "/"; };
  const dashboardHref = profile ? `/dashboard/${profile.role}` : "/auth/signin";
  const NAV_LINKS = [{ href: "/hackathons", label: "Hackathons" }, { href: "/about", label: "About" }, { href: "/mentors", label: "Mentors" }, { href: "/projects", label: "Projects" }];

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
              className={`transition-colors relative ${
                isActive(link.href) 
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
          {profile ? (
            <>
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
                  <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl overflow-hidden shadow-2xl border border-white/8 z-50 animate-slide-up">
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="text-sm font-medium truncate">{profile.full_name}</div>
                      <div className="text-xs text-muted truncate">{profile.email}</div>
                    </div>
                    <Link href={dashboardHref} onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"><User size={14} className="text-accent" /> Dashboard</Link>
                    <Link href="/profile" onClick={() => setDropdownOpen(false)} className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-white/5 transition-colors"><Settings size={14} className="text-muted" /> Profile & Settings</Link>
                    <div className="border-t border-white/5" />
                    <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"><LogOut size={14} /> Sign Out</button>
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
              className={`block text-sm py-2 transition-colors ${
                isActive(link.href)
                  ? "text-accent font-medium"
                  : "text-muted hover:text-accent"
              }`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
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
