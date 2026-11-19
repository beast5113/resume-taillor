"use client";

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
} from "lucide-react";
import { logout } from "@/app/actions/logout";
import { Button } from "@/components/ui/button";
import { BrandMark, BrandWordmark } from "@/components/BrandMark";

const ALL_NAV = [
  { href: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard, roles: ["admin"] },
  { href: "/job-board",    label: "Job Board",    icon: Kanban,          roles: ["admin"]},
  { href: "/applications", label: "Applications", icon: Briefcase,       roles: ["admin", "assistant"] },
  { href: "/prompts",      label: "Prompts",      icon: MessageSquare,   roles: ["admin"] },
  { href: "/templates",    label: "Templates",    icon: LayoutTemplate,  roles: ["admin"] },
  { href: "/builder",       label: "Builder",       icon: Hammer,          roles: ["admin"] },
  { href: "/batch-builder", label: "BatchBuilder",  icon: PackageCheck,    roles: ["admin"] },
  { href: "/profile",      label: "Profile",      icon: User,            roles: ["admin"] },
  { href: "/team",         label: "Team",         icon: Users,           roles: ["admin"] },
];

interface SidebarProps {
  role: "admin" | "assistant";
  userName: string;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();
  const nav = ALL_NAV.filter((item) => item.roles.includes(role));

  return (
    <aside className="relative w-56 shrink-0 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Accent glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_100%_at_0%_0%,oklch(0.585_0.215_287/0.14),transparent_70%)]" />

      {/* Brand */}
      <div className="relative px-5 pt-5 pb-4 flex items-center gap-3">
        <BrandMark size={34} className="drop-shadow-[0_4px_14px_oklch(0.585_0.215_287/0.55)]" />
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
                  ? "bg-linear-to-r from-primary/20 to-primary/5 text-sidebar-foreground font-medium ring-1 ring-inset ring-primary/25"
                  : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-linear-to-b from-violet-400 to-cyan-300 shadow-[0_0_10px_oklch(0.585_0.215_287/0.9)]" />
              )}
              <span
                className={`flex size-7 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "bg-primary/25 text-violet-200"
                    : "bg-sidebar-accent/40 text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="relative p-3 border-t border-sidebar-border">
        {userName && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-violet-500 to-cyan-400 text-xs font-semibold text-white ring-2 ring-sidebar">
              {userName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
              <p className="text-[11px] capitalize text-sidebar-foreground/40">{role}</p>
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
