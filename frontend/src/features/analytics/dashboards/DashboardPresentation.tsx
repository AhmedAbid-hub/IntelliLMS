import {
  ArrowUpRight,
  BookOpen,
  Building2,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";
import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTerminology } from "../../../lib/terminology";
import { Stat } from "./dashboardTypes";

export const theme = {
  dark: "#193e2e",

  green: "#176443",

  accent: "#4f9c70",

  muted: "#718579",

  border: "#dce8df",

  pale: "#edf5ef",

  soft: "#f7faf7",

  white: "#ffffff",
  blue: "#4776ba",
  gold: "#b78330",
  plum: "#8661a7",
};

export const panelStyle: React.CSSProperties = {
  background: theme.white,

  border: `1px solid ${theme.border}`,

  borderRadius: 15,

  padding: "24px 26px",

  minWidth: 0,
};

export function validNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatNumber(value: number | null | undefined): string {
  return validNumber(value) ? new Intl.NumberFormat("en").format(value) : "—";
}

export function formatPercentage(value: number | null | undefined): string {
  return validNumber(value) ? `${value.toFixed(1)}%` : "—";
}

export function clampPercentage(value: number | null | undefined): number {
  return validNumber(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function DashboardStats({ stats }: { stats: Stat[] }) {
  const palette = [
    { color: "#176447", tint: "#e8f4eb" },
    { color: "#4776ba", tint: "#eaf1fc" },
    { color: "#b78330", tint: "#fff3df" },
    { color: "#8661a7", tint: "#f2ebfa" },
  ];
  return (
    <div className="stat-grid" style={{ marginBottom: 0, gap: 18 }}>
      {stats.map(
        ({ label, value, description, icon: Icon, color, tint }, index) => {
          const accent = color ?? palette[index % palette.length].color;
          const pale = tint ?? palette[index % palette.length].tint;
          return (
            <article
              key={label}
              className="stat-card"
              style={{
                minHeight: 158,
                padding: "21px 23px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 13,
                background: "#fff",
                border: "1px solid #e2e9e4",
                borderTop: `3px solid ${accent}`,
                borderRadius: 16,
                boxShadow: "0 10px 28px rgba(23, 52, 40, 0.045)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span
                  style={{ fontSize: 12, color: "#60766a", fontWeight: 650 }}
                >
                  {label}
                </span>
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: pale,
                    color: accent,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={19} aria-hidden="true" />
                </span>
              </div>
              <strong
                style={{
                  fontSize: 32,
                  lineHeight: 1.15,
                  margin: 0,
                  color: "#163d30",
                  letterSpacing: "-0.04em",
                }}
              >
                {value}
              </strong>
              <small
                style={{ color: "#728477", fontSize: 11.5, lineHeight: 1.5 }}
              >
                {description}
              </small>
            </article>
          );
        },
      )}
    </div>
  );
}

export function DashboardHero({
  eyebrow,
  title,
  description,
  role,
}: {
  eyebrow: string;
  title: string;
  description: string;
  role: "admin" | "head" | "teacher" | "student" | "platform";
}) {
  const isStudent = role === "student";
  return (
    <header
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        background:
          "linear-gradient(115deg, #103e32 0%, #19543f 65%, #24664c 100%)",
        padding: "clamp(26px, 3vw, 40px)",
        marginBottom: 24,
        boxShadow: "0 18px 38px rgba(20, 65, 46, 0.13)",
        color: "#fff",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: "50%",
          right: -65,
          top: -150,
          boxShadow:
            "0 0 0 44px rgba(255,255,255,0.025), 0 0 0 90px rgba(255,255,255,0.018)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: 790 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            marginBottom: 17,
            color: "#eac68c",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.11em",
            textTransform: "uppercase",
          }}
        >
          <Sparkles size={16} aria-hidden="true" />
          {eyebrow}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(27px, 3vw, 38px)",
            fontWeight: 800,
            lineHeight: 1.16,
            letterSpacing: "-0.035em",
            color: "#fff",
          }}
        >
          {title}
        </h1>
        <p
          style={{
            margin: "13px 0 0",
            color: "#e0eee6",
            lineHeight: 1.7,
            fontSize: 14,
          }}
        >
          {description}
        </p>
        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 3,
            borderRadius: 9,
            background: isStudent ? "#a6c5fa" : "#e8bd77",
            marginTop: 23,
          }}
        />
      </div>
    </header>
  );
}

export function StructureOverview({
  counts,
  kind,
  terms,
}: {
  counts: Record<string, number>;
  kind?: string;
  terms: ReturnType<typeof useTerminology>;
}) {
  const title =
    kind === "school"
      ? "Classes and school year"
      : kind === "college"
        ? "Programs and study years"
        : "Programs and semesters";
  const icons = [Building2, GraduationCap, BookOpen, Layers3];
  const accents = ["#176447", "#4776ba", "#b78330", "#8661a7"];
  const backgrounds = ["#e8f4eb", "#eaf1fc", "#fff3df", "#f2ebfa"];
  return (
    <section
      aria-label="Academic structure overview"
      style={{
        ...panelStyle,
        marginTop: 22,
        boxShadow: "0 10px 30px rgba(23,52,40,.04)",
      }}
    >
      <PanelHeading
        icon={Layers3}
        title={title}
        description="Your institute's current academic setup at a glance."
        action={
          <DashboardLink to="/institute-setup">
            Continue institute setup
          </DashboardLink>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
          gap: 12,
        }}
      >
        {Object.entries(counts).map(([key, count], index) => {
          const Icon = icons[index % icons.length];
          const accent = accents[index % accents.length];
          const path = key === "batch" ? "/batches" : `/${key}s`;
          const label = terms.label(key, true);
          return (
            <Link
              key={key}
              to={path}
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                borderRadius: 13,
                border: "1px solid #e7ede9",
                background: "#fcfdfc",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: 33,
                    height: 33,
                    borderRadius: 9,
                    background: backgrounds[index % backgrounds.length],
                    color: accent,
                  }}
                >
                  <Icon size={17} aria-hidden="true" />
                </span>
                <ArrowUpRight size={15} color={accent} aria-hidden="true" />
              </div>
              <div>
                <strong
                  style={{
                    display: "block",
                    fontSize: 23,
                    color: "#193e2e",
                    lineHeight: 1.2,
                  }}
                >
                  {formatNumber(count)}
                </strong>
                <span
                  style={{
                    display: "block",
                    marginTop: 5,
                    color: "#687e71",
                    fontSize: 12,
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
      <div
        style={{
          borderTop: "1px solid #e9eee9",
          marginTop: 21,
          paddingTop: 17,
          display: "flex",
          flexWrap: "wrap",
          gap: "10px 22px",
        }}
      >
        <DashboardLink to="/student-admission">Admit a student</DashboardLink>
        <DashboardLink to="/memberships?role=student">
          Review student placements
        </DashboardLink>
        <DashboardLink to="/grades">Review released results</DashboardLink>
      </div>
    </section>
  );
}

export function DashboardLink({
  to,

  children,
}: {
  to: string;

  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}

      <ArrowUpRight
        size={15}

        aria-hidden="true"
      />
    </Link>
  );
}

export function PanelHeading({
  icon: Icon,

  title,

  description,

  action,
}: {
  icon: typeof BookOpen;

  title: string;

  description: string;

  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",

        justifyContent: "space-between",

        alignItems: "flex-start",

        flexWrap: "wrap",

        gap: 14,

        marginBottom: 23,
      }}
    >
      <div
        style={{
          display: "flex",

          alignItems: "flex-start",

          gap: 12,
        }}
      >
        <div
          style={{
            width: 42,

            height: 42,

            borderRadius: 12,

            background: theme.pale,

            color: theme.green,

            display: "grid",

            placeItems: "center",

            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>

        <div>
          <h2
            style={{
              margin: 0,

              color: theme.dark,

              fontSize: 17,

              fontWeight: 750,
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: "6px 0 0",

              color: theme.muted,

              fontSize: 12,

              lineHeight: 1.6,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {action}
    </div>
  );
}

export function ProgressBar({
  value,

  label,
}: {
  value: number | null | undefined;

  label: string;
}) {
  const available = validNumber(value);

  return (
    <div
      role="progressbar"

      aria-label={label}

      aria-valuemin={0}

      aria-valuemax={100}

      aria-valuenow={available ? clampPercentage(value) : undefined}

      style={{
        height: 9,

        background: "#e8f0e9",

        borderRadius: 999,

        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${available ? clampPercentage(value) : 0}%`,

          height: "100%",

          background: theme.accent,

          borderRadius: 999,

          transition: "width 200ms ease",
        }}
      />
    </div>
  );
}
