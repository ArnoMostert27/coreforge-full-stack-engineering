// src/navigation.js
// LOCKED navigation structure for CoreForge V1.
// Do not add, remove, or reorder items without an explicit decision.
// Items with ready:true are implemented; others render <ComingSoon />.

import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  Columns3,
  Flag,
  Building2,
  FileText,
  Receipt,
  CircleDollarSign,
  GitBranch,
  Rocket,
  BookOpen,
  CalendarClock,
  Network,
  Shield,
  Settings,
  Megaphone,
  Sparkles,
  Bot,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    section: "Core",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
      { to: "/team", label: "Team", icon: Users, ready: false },
    ],
  },
  {
    section: "Work",
    items: [
      { to: "/projects", label: "Projects", icon: FolderKanban, ready: true },
      { to: "/tasks", label: "Tasks", icon: ListChecks, ready: false },
      { to: "/kanban", label: "Kanban", icon: Columns3, ready: false },
      { to: "/milestones", label: "Milestones", icon: Flag, ready: false },
    ],
  },
  {
    section: "Business",
    items: [
      { to: "/clients", label: "Clients", icon: Building2, ready: false },
      { to: "/contracts", label: "Contracts", icon: FileText, ready: false },
      { to: "/invoices", label: "Invoices", icon: Receipt, ready: false },
      { to: "/payments", label: "Payments", icon: CircleDollarSign, ready: false },
    ],
  },
  {
    section: "Engineering",
    items: [
      { to: "/github", label: "GitHub", icon: GitBranch, ready: false },
      { to: "/deployments", label: "Deployments", icon: Rocket, ready: false },
    ],
  },
  {
    section: "Knowledge",
    items: [
      { to: "/documentation", label: "Documentation", icon: BookOpen, ready: false },
      { to: "/meetings", label: "Meetings", icon: CalendarClock, ready: false },
      { to: "/decisions", label: "Decisions", icon: Network, ready: false },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/administration", label: "Administration", icon: Settings, ready: false },
      { to: "/security", label: "Security", icon: Shield, ready: false },
      { to: "/settings", label: "Settings", icon: Settings, ready: false },
      { to: "/announcements", label: "Announcements", icon: Megaphone, ready: false },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { to: "/briefing", label: "Daily Briefing", icon: Sparkles, ready: false },
      { to: "/assistant", label: "Business Assistant", icon: Bot, ready: false },
    ],
  },
];