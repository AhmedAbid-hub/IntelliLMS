
import type { ReactNode } from "react";
import { Inbox, Sparkles } from "lucide-react";
import { useAuth } from "../features/auth/Auth";

export { Loading, ErrorState } from "./Feedback";

export function Empty({
  children = "No records yet. Add your first record to get started.",
}: {
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Inbox size={30} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  const { role } = useAuth();

  const defaultEyebrow =
    role === "superadmin"
      ? "PLATFORM ADMINISTRATION"
      : role === "institute_admin"
        ? "INSTITUTE MANAGEMENT"
        : role === "head"
          ? "DEPARTMENT MANAGEMENT"
          : role === "teacher"
            ? "TEACHING WORKSPACE"
            : role === "student"
              ? "MY LEARNING WORKSPACE"
              : "INTELLILMS WORKSPACE";

  return (
    <header
      className="page-heading"
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "16px",
        padding: "26px clamp(20px, 3vw, 32px)",
        borderRadius: "20px",
        border: "1px solid rgba(255,255,255,0.1)",
        background:
          "linear-gradient(112deg, #103e32 0%, #175541 58%, #236d50 100%)",
        boxShadow: "0 12px 30px rgba(18,65,49,0.11)",
        color: "#ffffff",
        marginBottom: "22px",
        minHeight: 0,
      }}
    >
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          right: "-80px",
          top: "-175px",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 0 0 32px rgba(255,255,255,0.025), 0 0 0 65px rgba(255,255,255,0.018)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: "1 1 320px",
          minWidth: 0,
        }}
      >
        <p
          className="eyebrow"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            margin: "0 0 12px",
            color: "#f1c77d",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
          }}
        >
          <Sparkles size={15} aria-hidden="true" />
          {eyebrow ?? defaultEyebrow}
        </p>

        <h1
          style={{
            color: "#ffffff",
            fontSize: "clamp(25px, 2.5vw, 34px)",
            lineHeight: 1.18,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            margin: "0 0 9px",
          }}
        >
          {title}
        </h1>

        <p
          className="muted"
          style={{
            color: "rgba(255,255,255,0.87)",
            fontSize: "14px",
            lineHeight: 1.5,
            margin: 0,
            maxWidth: "720px",
          }}
        >
          {description}
        </p>

        <div
          aria-hidden="true"
          style={{
            width: "44px",
            height: "3px",
            background: "#d4ad70",
            borderRadius: "4px",
            marginTop: "15px",
          }}
        />
      </div>

      {children != null && (
        <div
          className="heading-actions"
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {children}
        </div>
      )}
    </header>
  );
}
