"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Briefcase,
  LogOut,
  LayoutDashboard,
  Kanban,
  LayoutTemplate,
  User,
  Users,
  Hammer,
  PackageCheck,
  MessagesSquare,
} from "lucide-react";
import { logout } from "@/app/actions/logout";
import { Button } from "@/components/ui/button";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";

const ALL_NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, roles: ["super_admin", "admin"] },
  { href: "/job-board",    label: "Job Board",    icon: Kanban,          roles: ["super_admin", "admin"] },
  { href: "/applications", label: "Applications", icon: Briefcase,       roles: ["super_admin", "admin", "assistant"] },
  { href: "/chat",         label: "Chat",         icon: MessagesSquare,  roles: ["super_admin", "admin", "assistant"] },
  { href: "/prompts",      label: "Prompts",      icon: MessageSquare,   roles: ["super_admin", "admin"] },
  { href: "/templates",    label: "Templates",    icon: LayoutTemplate,  roles: ["super_admin", "admin"] },
  { href: "/builder",       label: "Builder",       icon: Hammer,          roles: ["super_admin", "admin"] },
  { href: "/batch-builder", label: "BatchBuilder",  icon: PackageCheck,    roles: ["super_admin", "admin"] },
  { href: "/profile",      label: "Profile",      icon: User,            roles: ["super_admin", "admin"] },
  { href: "/team",         label: "Team",         icon: Users,           roles: ["super_admin"] },
];

interface SidebarProps {
  role: "super_admin" | "admin" | "assistant";
  userName: string;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const nav = ALL_NAV.filter((item) => item.roles.includes(role));

  // Unread chat badge — polled, and refreshed whenever the route changes.
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/chat/unread")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (alive && d) setUnread(d.total ?? 0); })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 15000);
    return () => { alive = false; window.clearInterval(t); };
  }, [pathname]);

  return (
    <aside className="relative w-56 shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Accent glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_100%_at_0%_0%,oklch(0.6_0.165_250/0.08),transparent_70%)]" />

      {/* Brand */}
      <div className="relative px-5 pt-5 pb-4 flex items-center gap-3">
        <BrandMark size={34} className="drop-shadow-[0_4px_12px_oklch(0.6_0.165_250/0.35)]" />
        <div className="min-w-0">
          <BrandWordmark className="text-[17px] block" />
          <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/40">
            Resume Studio
          </span>
        </div>
      </div>

      <div className="mx-5 h-px bg-linear-to-r from-sidebar-border via-sidebar-foreground/10 to-transparent" />

      {/* Navigation */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/35">
          Workspace
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition-all ${
                active
                  ? "bg-white/[0.06] text-sidebar-foreground font-medium ring-1 ring-inset ring-white/[0.08]"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
              )}
              <span
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "bg-primary/15 text-sky-300"
                    : "text-sidebar-foreground/45 group-hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
              </span>
              {label}
              {href === "/chat" && unread > 0 && (
                <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary text-[10px] font-semibold text-primary-foreground flex items-center justify-center">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-3 border-t border-sidebar-border">
        {userName && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-500 to-blue-600 text-xs font-semibold text-white ring-2 ring-sidebar">
              {userName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              <p className="text-[11px] capitalize text-sidebar-foreground/40">{role.replace("_", " ")}</p>
            </div>
          </div>
        )}
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent px-3"
          >
            <LogOut size={14} />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
