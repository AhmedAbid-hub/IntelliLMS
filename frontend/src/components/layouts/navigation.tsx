import {
  Bell,
  BookOpen,
  BrainCircuit,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  FileCheck2,
  History,
  LayoutDashboard,
  School,
  Settings,
  ShieldCheck,
  UserRoundCheck,
  Users,
} from "lucide-react";

export const navItems = [
  {
    path: "/academic-history",

    label: "Academic history",

    icon: History,

    roles: ["student"],
  },

  {
    path: "/academic-reviews",

    label: "Academic reviews",

    icon: ShieldCheck,

    roles: ["admin", "head", "teacher"],
  },

  {
    path: "/platform-audit",

    label: "Platform audit",

    icon: History,

    roles: ["superadmin"],
  },

  {
    path: "/platform-settings",

    label: "Platform settings",

    icon: Settings,

    roles: ["superadmin"],
  },

  {
    path: "/platform",

    label: "Platform overview",

    icon: LayoutDashboard,

    roles: ["superadmin"],
  },

  {
    path: "/",

    label: "Overview",

    icon: LayoutDashboard,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/institutes",

    label: "Institutes",

    icon: Building2,

    roles: ["superadmin"],
  },

  {
    path: "/platform-users",

    label: "Institute administrators",

    icon: Users,

    roles: ["superadmin"],
  },

  // Academic management

  {
    path: "/academics",

    label: "Academic management",

    icon: School,

    roles: ["admin"],
  },

  // New Departments & Programs page

  {
    path: "/departments-programs",

    label: "Departments & Programs",

    icon: Building2,

    roles: ["admin"],
  },

  {
    path: "/memberships",

    label: "People",

    icon: Users,

    roles: ["admin", "head", "teacher"],
  },

  {
    path: "/teacher-appointments",

    label: "Teacher appointments",

    icon: UserRoundCheck,

    roles: ["admin", "head"],
  },

  {
    path: "/offerings",

    label: "My courses",

    icon: BookOpen,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/assignments",

    label: "Assignments",

    icon: ClipboardList,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/quizzes",

    label: "Quizzes",

    icon: FileCheck2,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/attendance-sessions",

    label: "Attendance",

    icon: ShieldCheck,

    roles: ["admin", "head", "teacher"],
  },

  {
    path: "/attendance",

    label: "My attendance",

    icon: ShieldCheck,

    roles: ["student"],
  },

  {
    path: "/grades",

    label: "Gradebook",

    icon: ChartNoAxesCombined,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/analytics",

    label: "Academic progress",

    icon: ChartNoAxesCombined,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/institute-settings",

    label: "Institute settings",

    icon: Settings,

    roles: ["admin"],
  },

  {
    path: "/timetable",

    label: "Timetable",

    icon: CalendarDays,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/predictions",

    label: "Learning insights",

    icon: BrainCircuit,

    roles: ["admin", "head", "teacher"],
  },

  {
    path: "/announcements",

    label: "Announcements",

    icon: Bell,

    roles: ["admin", "head", "teacher", "student"],
  },

  {
    path: "/audit",

    label: "Audit history",

    icon: History,

    roles: ["admin"],
  },
];

export const navGroups = [
  {
    title: "Workspace",

    paths: ["/", "/platform", "/announcements", "/timetable"],
  },

  {
    title: "Academic management",

    paths: [
      "/academics",

      "/departments-programs",

      "/memberships",

      "/teacher-appointments",

      "/offerings",

      "/assignments",

      "/quizzes",

      "/attendance-sessions",

      "/attendance",

      "/grades",

      "/academic-history",
    ],
  },

  {
    title: "Insights & reporting",

    paths: ["/analytics", "/predictions", "/academic-reviews"],
  },

  {
    title: "Administration",

    paths: ["/institute-settings", "/audit"],
  },
];

export const superAdminGroups = [
  {
    title: "Platform overview",

    paths: ["/platform"],
  },

  {
    title: "Platform management",

    paths: ["/institutes", "/platform-users"],
  },

  {
    title: "Administration & security",

    paths: ["/platform-settings", "/platform-audit"],
  },
];

export function getRoleLabel(role: string) {
  switch (role) {
    case "superadmin":
      return "Super Administrator";

    case "admin":
      return "Institute Administrator";

    case "head":
      return "Department Head";

    case "teacher":
      return "Faculty Member";

    case "student":
      return "Student";

    default:
      return "Workspace Member";
  }
}
