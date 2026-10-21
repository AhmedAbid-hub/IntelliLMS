import {
  Activity,
  Building2,
  CheckCircle2,
  GraduationCap,
  Layers3,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { type CSSProperties } from "react";
import { type PlatformSummary } from "../PlatformDashboard";

export type StatItem = {
  key: string;
  label: string;
  value: number | string;
  description: string;
  icon: typeof Building2;
  tone?: "green" | "amber" | "neutral";
};

export const panelStyle: CSSProperties = {
  border: "1px solid #dce8df",
  borderRadius: 14,
  background: "#ffffff",
  boxShadow: "0 2px 10px rgba(20, 54, 37, 0.025)",
  overflow: "hidden",
};

export const mutedStyle: CSSProperties = {
  color: "#718378",
  fontSize: 13,
  lineHeight: 1.6,
};

export function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  ) {
    return Number(value);
  }

  return undefined;
}

export function readNumber(
  source: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const result = numberValue(source[key]);

    if (result !== undefined) {
      return result;
    }
  }

  return undefined;
}

export function humanize(value: unknown): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function readableStatus(value: unknown): string {
  if (value === true) return "Active";
  if (value === false) return "Inactive";

  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }

  return humanize(value);
}

export function StatusPill({ active }: { active: boolean | null }) {
  const unknown = active === null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: unknown ? "#f2f4f2" : active ? "#eaf7ee" : "#fff3e7",
        color: unknown ? "#65756b" : active ? "#176447" : "#9a6225",
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {unknown ? (
        <Activity size={13} aria-hidden="true" />
      ) : active ? (
        <CheckCircle2 size={13} aria-hidden="true" />
      ) : (
        <XCircle size={13} aria-hidden="true" />
      )}

      {unknown ? "Unknown" : active ? "Active" : "Inactive"}
    </span>
  );
}

export function StatCard({ item }: { item: StatItem }) {
  const Icon = item.icon;
  const tone = item.tone ?? "green";

  const background =
    tone === "amber" ? "#fff4e5" : tone === "neutral" ? "#eef2ef" : "#e8f4ec";

  const color =
    tone === "amber" ? "#986522" : tone === "neutral" ? "#526b5d" : "#176447";

  return (
    <div
      className="stat-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minWidth: 0,
        minHeight: 150,
        padding: "19px 21px",
        border: "1px solid #dce8df",
        borderRadius: 14,
        background: "#ffffff",
        boxShadow: "0 2px 10px rgba(20, 54, 37, 0.025)",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#536b5c",
            lineHeight: 1.5,
            textTransform: "none",
          }}
        >
          {item.label}
        </span>

        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background,
            color,
            flexShrink: 0,
          }}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
      </div>

      <strong
        style={{
          display: "block",
          fontSize:
            typeof item.value === "string" && item.value.length > 8 ? 19 : 30,
          fontWeight: 750,
          lineHeight: 1.15,
          color: "#123e2c",
          fontVariantNumeric: "tabular-nums",
          overflowWrap: "anywhere",
        }}
      >
        {typeof item.value === "number"
          ? item.value.toLocaleString()
          : item.value}
      </strong>

      <span
        style={{
          ...mutedStyle,
          fontSize: 12,
          marginTop: "auto",
        }}
      >
        {item.description}
      </span>
    </div>
  );
}

export function buildPlatformStats(data: PlatformSummary): {
  primary: StatItem[];
  secondary: StatItem[];
} {
  const total = readNumber(data, [
    "institutes",
    "total_institutes",
    "institute_count",
  ]);

  const active = readNumber(data, ["active_institutes", "institutes_active"]);

  const inactive = readNumber(data, [
    "inactive_institutes",
    "institutes_inactive",
  ]);

  const administrators = readNumber(data, [
    "institute_administrators",
    "institute_admins",
    "admin_accounts",
    "administrators",
  ]);

  const resolvedInactive =
    inactive !== undefined
      ? inactive
      : total !== undefined && active !== undefined
        ? Math.max(0, total - active)
        : undefined;

  const primary: StatItem[] = [
    {
      key: "institutes",
      label: "Total institutions",
      value: total ?? "—",
      description: "Registered institutions",
      icon: Building2,
    },
    {
      key: "active",
      label: "Active institutions",
      value: active ?? "—",
      description: "Institutions currently enabled",
      icon: CheckCircle2,
    },
    {
      key: "inactive",
      label: "Inactive institutions",
      value: resolvedInactive ?? "—",
      description: "Institutions currently disabled",
      icon: XCircle,
      tone: "amber",
    },
    {
      key: "administrators",
      label: "Institute administrators",
      value: administrators ?? "—",
      description:
        administrators === undefined
          ? "Count not available from the platform API"
          : "Distinct active administrators in active institutions",
      icon: ShieldCheck,
    },
  ];

  const secondary: StatItem[] = [];

  const users = readNumber(data, ["users", "total_users"]);

  const memberships = readNumber(data, ["memberships", "total_memberships"]);

  if (users !== undefined) {
    secondary.push({
      key: "users",
      label: "Total user accounts",
      value: users,
      description: "All account types across the platform",
      icon: Users,
      tone: "neutral",
    });
  }

  if (memberships !== undefined) {
    secondary.push({
      key: "memberships",
      label: "Institute memberships",
      value: memberships,
      description: "Recorded institution memberships",
      icon: Layers3,
      tone: "neutral",
    });
  }

  return { primary, secondary };
}

export function buildInstituteStats(data: PlatformSummary): StatItem[] {
  const items: StatItem[] = [];
  const roles = data.roles ?? {};

  const roleIcons: Record<string, typeof Users> = {
    admin: ShieldCheck,
    institute_admin: ShieldCheck,
    teacher: GraduationCap,
    student: Users,
    head: Users,
  };

  const labels: Record<string, string> = {
    admin: "Administrators",
    institute_admin: "Administrators",
    head: "Department heads",
    teacher: "Teachers",
    student: "Students",
  };

  for (const [key, value] of Object.entries(roles)) {
    const count = numberValue(value);

    if (count === undefined) continue;

    items.push({
      key: `role-${key}`,
      label: labels[key] || humanize(key),
      value: count,
      description: "Institute membership total",
      icon: roleIcons[key] || Users,
      tone: "neutral",
    });
  }

  const courses = numberValue(data.courses);

  if (courses !== undefined) {
    items.push({
      key: "courses",
      label: "Courses",
      value: courses,
      description: "Courses recorded for this institution",
      icon: GraduationCap,
    });
  }

  const enrollments = numberValue(data.enrollments);

  if (enrollments !== undefined) {
    items.push({
      key: "enrollments",
      label: "Enrollments",
      value: enrollments,
      description: "Recorded course enrollments",
      icon: Layers3,
    });
  }

  return items;
}

export function SecondaryStatistics({ items }: { items: StatItem[] }) {
  if (!items.length) return null;

  return (
    <section
      aria-label="Additional platform statistics"
      style={{
        ...panelStyle,
        padding: "15px 20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#536b5c",
            marginRight: 4,
          }}
        >
          Additional platform totals
        </span>

        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              title={item.description}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                padding: "8px 12px",
                borderRadius: 9,
                border: "1px solid #e3ebe5",
                background: "#f8faf8",
              }}
            >
              <Icon size={16} color="#52735d" aria-hidden="true" />

              <span
                style={{
                  fontSize: 12,
                  color: "#536b5c",
                }}
              >
                {item.label}
              </span>

              <strong
                style={{
                  fontSize: 15,
                  color: "#173c2d",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {typeof item.value === "number"
                  ? item.value.toLocaleString()
                  : item.value}
              </strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
