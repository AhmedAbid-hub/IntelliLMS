import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Search,
  ArrowUpRight,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronDown,
  GraduationCap,
  UsersRound,
  UserCheck,
  UserX,
  ShieldCheck,
  Building2,
  Mail,
} from "lucide-react";

import {
  api,
  post,
  display,
  type Page,
  type RecordData,
} from "../../lib/api";

import { resources } from "./config";
import { ResourceForm } from "./ResourceForm";
import { WorkflowDialog } from "./WorkflowDialog";
import { ResourceFilters } from "./ResourceFilters";
import { InvitationReview } from "./InvitationReview";
import { AcademicControl } from "./AcademicControl";
import { StaffLifecycle } from "./StaffLifecycle";
import { GradeHistory } from "./GradeHistory";
import { LinkAccount } from "./LinkAccount";
import { ImportPeople } from "./ImportPeople";
import { CourseCard } from "../courses/CourseCard";
import { BulkEnrollment } from "../courses/BulkEnrollment";
import { BankCopy } from "../quizzes/BankCopy";
import { QuizAuthoring } from "../quizzes/QuizAuthoring";
import { Avatar } from "../../components/Avatar";
import { notifySaved } from "../../components/ToastProvider";
import { useTerminology } from "../../lib/terminology";
import { useUrlFilters } from "../../lib/useUrlFilters";
import { useAuth } from "../auth/Auth";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";

import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

type ResourcePageProps = {
  resource?: string;
  offering?: string;
  initialCreate?: boolean;
};

const peopleRoles: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Institute Admin",
  head: "Department Head",
  teacher: "Teacher",
  student: "Student",
};

const peopleTabs = [
  { label: "All people", value: "" },
  { label: "Students", value: "student" },
  { label: "Teachers", value: "teacher" },
  { label: "Department Heads", value: "head" },
];

type PeopleActionsProps = {
  row: RecordData;
  writable: boolean;
  role: string;
  currentUserId?: string | number;
  onEdit: (row: RecordData) => void;
};

const menuItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  padding: "10px 11px",
  border: 0,
  borderRadius: 8,
  background: "transparent",
  color: "inherit",
  textDecoration: "none",
  font: "inherit",
  fontSize: 13,
  fontWeight: 500,
  textAlign: "left",
  cursor: "pointer",
} as const;

const componentActionStyle = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
} as const;

const platformColors = {
  green: "#176443",
  dark: "#173d2e",
  muted: "#6b8275",
  border: "#dce8df",
  soft: "#f5f9f5",
  cream: "#fafbf8",
};

function PeopleActions({
  row,
  writable,
  role,
  currentUserId,
  onEdit,
}: PeopleActionsProps) {
  const [open, setOpen] = useState(false);

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const personName = String(
    row.display_name ||
      row.first_name ||
      row.username ||
      "person"
  );

  const canManagePlacement =
    role === "admin" && row.role === "student";

  const isOwnAccount =
    currentUserId != null &&
    row.user != null &&
    String(row.user) === String(currentUserId);

  const canManageAccess =
    writable &&
    !isOwnAccount &&
    !(row.role === "admin" && role !== "superadmin");

  const canReviewInvitation =
    writable &&
    (role === "superadmin" || row.role !== "admin");

  const hasActions =
    writable ||
    canManagePlacement ||
    canManageAccess ||
    canReviewInvitation;

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 250;
    const estimatedHeight = 245;
    const padding = 8;

    const left = Math.max(
      padding,
      Math.min(
        rect.right - menuWidth,
        window.innerWidth - menuWidth - padding
      )
    );

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward =
      spaceBelow < estimatedHeight + 12 &&
      spaceAbove > spaceBelow;

    setPosition({
      left,
      top: openUpward
        ? Math.max(
            padding,
            rect.top - estimatedHeight - 6
          )
        : rect.bottom + 6,
    });
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleScroll(event: Event) {
      const target = event.target;

      if (
        target instanceof Node &&
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    window.addEventListener(
      "resize",
      updatePosition
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      window.removeEventListener(
        "resize",
        updatePosition
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );
    };
  }, [open]);

  if (!hasActions) return null;

  // Keep this menu mounted while closed.
  // StaffLifecycle and InvitationReview own dialogs.
  const menu = (
    <div
      ref={menuRef}
      role="group"
      aria-label={`Actions for ${personName}`}
      aria-hidden={!open}
      inert={!open}
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 1000,
        width: 250,
        maxWidth: "calc(100vw - 16px)",
        padding: 7,
        border: `1px solid ${platformColors.border}`,
        borderRadius: 12,
        background: "#ffffff",
        boxShadow:
          "0 14px 38px rgba(15, 40, 28, 0.16)",
        display: open ? "flex" : "none",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div
        style={{
          padding: "7px 10px 9px",
          borderBottom: "1px solid #edf1ed",
          marginBottom: 3,
        }}
      >
        <strong
          style={{
            display: "block",
            fontSize: 13,
          }}
        >
          {personName}
        </strong>

        <span
          style={{
            display: "block",
            fontSize: 12,
            opacity: 0.65,
            marginTop: 2,
          }}
        >
          {peopleRoles[String(row.role)] ||
            String(row.role || "Account")}
        </span>
      </div>

      {writable && (
        <button
          type="button"
          style={menuItemStyle}
          onClick={() => {
            setOpen(false);
            onEdit(row);
          }}
        >
          <Pencil size={16} aria-hidden="true" />
          Edit details
        </button>
      )}

      {canManagePlacement && (
        <Link
          to={`/student-placement/${row.id}`}
          style={menuItemStyle}
          onClick={() => setOpen(false)}
        >
          <GraduationCap
            size={16}
            aria-hidden="true"
          />
          Placement & history
        </Link>
      )}

      {canManageAccess && (
        <div style={componentActionStyle}>
          <StaffLifecycle
            row={row}
            triggerVariant="menu"
            onOpen={() => setOpen(false)}
          />
        </div>
      )}

      {canReviewInvitation && (
        <div style={componentActionStyle}>
          <InvitationReview
            row={row}
            triggerVariant="menu"
            onOpen={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Actions for ${personName}`}
        onClick={() => {
          if (!open) updatePosition();
          setOpen((current) => !current);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          padding: "8px 12px",
          border: `1px solid ${platformColors.border}`,
          borderRadius: 9,
          background: "#ffffff",
          color: "inherit",
          font: "inherit",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <MoreHorizontal size={17} aria-hidden="true" />
        Actions
        <ChevronDown
          size={14}
          aria-hidden="true"
          style={{
            transform: open
              ? "rotate(180deg)"
              : undefined,
          }}
        />
      </button>

      {createPortal(menu, document.body)}
    </>
  );
}

// --------------------------------------------------
// AUDIT HISTORY
// --------------------------------------------------

function auditLabel(value: unknown): string {
  const raw = String(value ?? "").trim();

  if (!raw) return "Activity recorded";

  const normalized = raw
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");

  return normalized.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase()
  );
}

function auditDetail(value: unknown): unknown {
  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (!trimmed) return null;

  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[")
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      // Preserve the original text.
    }
  }

  return value;
}

function auditText(value: unknown): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function auditId(value: unknown): string {
  const text = String(value ?? "").trim();

  if (!text) return "Not specified";

  return text.length > 20
    ? `${text.slice(0, 8)}…${text.slice(-6)}`
    : text;
}

function AuditDetailContent({
  detail,
}: {
  detail: unknown;
}) {
  const parsed = auditDetail(detail);

  if (
    parsed === null ||
    parsed === undefined ||
    parsed === ""
  ) {
    return <p>No additional details were recorded.</p>;
  }

  if (typeof parsed !== "object") {
    return (
      <p
        style={{
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}
      >
        {auditText(parsed)}
      </p>
    );
  }

  if (Array.isArray(parsed)) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        {parsed.map((item, index) => (
          <div
            key={index}
            style={{
              padding: 12,
              background: "#f6f9f6",
              borderRadius: 9,
            }}
          >
            <strong>Item {index + 1}</strong>
            <AuditDetailContent detail={item} />
          </div>
        ))}
      </div>
    );
  }

  const data = parsed as Record<string, unknown>;

  const previous =
    data.before ??
    data.old ??
    data.previous ??
    data.old_values;

  const next =
    data.after ??
    data.new ??
    data.current ??
    data.new_values;

  const hasComparison =
    previous !== undefined ||
    next !== undefined;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {hasComparison && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div
            style={{
              border: "1px solid #e1e9e1",
              borderRadius: 10,
              padding: 12,
              minWidth: 0,
            }}
          >
            <strong>Previous value</strong>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                font: "inherit",
                fontSize: 13,
              }}
            >
              {auditText(previous)}
            </pre>
          </div>

          <div
            style={{
              border: "1px solid #cde6d4",
              borderRadius: 10,
              padding: 12,
              minWidth: 0,
              background: "#f5faf6",
            }}
          >
            <strong>New value</strong>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                font: "inherit",
                fontSize: 13,
              }}
            >
              {auditText(next)}
            </pre>
          </div>
        </div>
      )}

      {Object.entries(data)
        .filter(
          ([key]) =>
            !hasComparison ||
            ![
              "before",
              "old",
              "previous",
              "old_values",
              "after",
              "new",
              "current",
              "new_values",
            ].includes(key)
        )
        .map(([key, value]) => (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(110px, 160px) minmax(0, 1fr)",
              gap: 12,
              borderBottom: "1px solid #edf1ed",
              paddingBottom: 9,
            }}
          >
            <strong style={{ fontSize: 13 }}>
              {auditLabel(key)}
            </strong>

            <span
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontSize: 13,
              }}
            >
              {auditText(value)}
            </span>
          </div>
        ))}
    </div>
  );
}

function auditSummary(value: unknown): string {
  const parsed = auditDetail(value);

  if (parsed == null || parsed === "") {
    return "No additional details";
  }

  if (typeof parsed === "object") {
    if (Array.isArray(parsed)) {
      return `${parsed.length} recorded item${
        parsed.length === 1 ? "" : "s"
      }`;
    }

    const data = parsed as Record<string, unknown>;

    for (const key of [
      "message",
      "reason",
      "description",
      "summary",
      "event",
    ]) {
      if (
        typeof data[key] === "string" &&
        data[key]
      ) {
        return String(data[key]);
      }
    }

    const count = Object.keys(data).length;

    return `${count} detail field${
      count === 1 ? "" : "s"
    }`;
  }

  return String(parsed);
}

// --------------------------------------------------
// PLATFORM ACCOUNT PRESENTATION
// --------------------------------------------------

function PlatformStat({
  label,
  value,
  icon: Icon,
  note,
}: {
  label: string;
  value: string | number;
  icon: typeof UsersRound;
  note?: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${platformColors.border}`,
        borderRadius: 14,
        padding: "19px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 650,
            color: platformColors.muted,
            marginBottom: 10,
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: 29,
            lineHeight: 1.15,
            fontWeight: 750,
            color: platformColors.dark,
          }}
        >
          {value}
        </div>

        {note && (
          <div
            style={{
              fontSize: 11,
              color: platformColors.muted,
              marginTop: 8,
            }}
          >
            {note}
          </div>
        )}
      </div>

      <div
        style={{
          width: 39,
          height: 39,
          borderRadius: 11,
          background: "#eaf5ee",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: platformColors.green,
        }}
      >
        <Icon size={19} />
      </div>
    </div>
  );
}

function PlatformAccountSummary({
  count,
  rows,
  hasNext,
  isLoading,
}: {
  count: number | undefined;
  rows: RecordData[];
  hasNext: boolean;
  isLoading: boolean;
}) {
  // The paginated API gives an authoritative total count,
  // but the other totals are only known for the loaded page.
  const active = rows.filter(
    (row) => row.is_active === true
  ).length;

  const inactive = rows.filter(
    (row) => row.is_active === false
  ).length;

  const superusers = rows.filter(
    (row) => row.is_superuser === true
  ).length;

  const pageNote = hasNext
    ? "On this page"
    : "On this page";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
        gap: 15,
        marginBottom: 20,
      }}
    >
      <PlatformStat
        label="Total platform accounts"
        value={isLoading ? "—" : count ?? "—"}
        icon={UsersRound}
        note="All matching accounts"
      />

      <PlatformStat
        label="Active accounts"
        value={isLoading ? "—" : active}
        icon={UserCheck}
        note={pageNote}
      />

      <PlatformStat
        label="Inactive accounts"
        value={isLoading ? "—" : inactive}
        icon={UserX}
        note={pageNote}
      />

      <PlatformStat
        label="Superuser accounts"
        value={isLoading ? "—" : superusers}
        icon={ShieldCheck}
        note={pageNote}
      />
    </div>
  );
}

function PlatformAccountIdentity({
  row,
}: {
  row: RecordData;
}) {
  const name = [
    row.first_name,
    row.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const username = String(
    row.username || "Unknown account"
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        minWidth: 0,
      }}
    >
      <Avatar
        src={
          (row.avatar_url as string | null) || null
        }
        name={name || username}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 3,
          minWidth: 0,
        }}
      >
        <strong
          style={{
            fontSize: 13,
            color: platformColors.dark,
            overflowWrap: "anywhere",
          }}
        >
          {username}
        </strong>

        {name && (
          <span
            style={{
              fontSize: 12,
              color: platformColors.muted,
            }}
          >
            {name}
          </span>
        )}
      </div>
    </div>
  );
}

function PlatformStatus({
  active,
  superuser = false,
}: {
  active: boolean;
  superuser?: boolean;
}) {
  const positive = active;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 8,
        background: positive
          ? "#e8f5ec"
          : "#f0f1ed",
        color: positive
          ? "#176443"
          : "#67756a",
        fontSize: 12,
        fontWeight: 650,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: positive
            ? "#30a76b"
            : "#a6afa7",
        }}
      />

      {superuser
        ? active
          ? "Superuser"
          : "Standard"
        : active
          ? "Active"
          : "Inactive"}
    </span>
  );
}

// Super Administrators choose the target institute explicitly.
// This does not depend on their own institute context.
function AddInstituteAdministrator({ instituteId }: { instituteId: unknown }) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [form, setForm] = useState({
    username: "", email: "", first_name: "", last_name: "",
  });

  const institutesQuery = useQuery({
    queryKey: ["administrator-target-institutes"],
    queryFn: () => api<Page<RecordData> | RecordData[]>("institutes/?page_size=1000"),
    enabled: open,
    staleTime: 60_000,
  });
  const institutes = Array.isArray(institutesQuery.data)
    ? institutesQuery.data
    : institutesQuery.data?.results ?? [];

  const fieldStyle = {
    width: "100%", minWidth: 0, padding: "11px 13px",
    border: `1px solid ${platformColors.border}`, borderRadius: 9,
    background: "#fff", color: platformColors.dark,
    font: "inherit", boxSizing: "border-box",
  } as const;
  const labelStyle = {
    display: "grid", gap: 7, fontSize: 13,
    fontWeight: 650, color: platformColors.dark,
  } as const;

  function close() { if (!busy) setOpen(false); }

  return (
    <>
      <Button type="button" onClick={() => {
        setError(undefined);
        setSuccess(false);
        setSelectedInstitute(instituteId == null ? "" : String(instituteId));
        setForm({ username: "", email: "", first_name: "", last_name: "" });
        setOpen(true);
      }}>
        <Plus size={17} aria-hidden="true" />
        Add Administrator
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }} title="Add Institute Administrator">
        {success ? (
          <div style={{ display: "grid", gap: 16 }} role="status">
            <div style={{ padding: 16, background: platformColors.soft, border: `1px solid ${platformColors.border}`, borderRadius: 11 }}>
              <strong style={{ color: platformColors.green }}>Administrator account created</strong>
              <p style={{ margin: "8px 0 0", color: platformColors.muted }}>
                The administrator has been submitted for the selected institute. Check the invitation status in platform accounts.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <form style={{ display: "grid", gap: 19 }} onSubmit={async (event) => {
            event.preventDefault();
            if (!selectedInstitute || busy) return;
            setBusy(true);
            setError(undefined);
            try {
              await post("memberships/", {
                username: form.username.trim(),
                email: form.email.trim(),
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                institute: selectedInstitute,
                role: "admin",
              });
              await client.invalidateQueries();
              setSuccess(true);
              notifySaved("Institute Administrator created.");
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}>
            <div style={{ display: "flex", gap: 11, alignItems: "flex-start", padding: 14, border: `1px solid ${platformColors.border}`, borderRadius: 11, background: platformColors.soft }}>
              <Building2 size={19} color={platformColors.green} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={labelStyle} htmlFor="administrator-target-institute">Institute</label>
                <select id="administrator-target-institute" style={{ ...fieldStyle, marginTop: 8 }}
                  value={selectedInstitute} required disabled={busy || institutesQuery.isPending || institutesQuery.isError}
                  onChange={(event) => setSelectedInstitute(event.target.value)}>
                  <option value="">Select institute</option>
                  {institutes.map((institute) => (
                    <option key={String(institute.id)} value={String(institute.id)}>
                      {String(institute.name || institute.title || institute.id)}
                    </option>
                  ))}
                </select>
                {institutesQuery.isPending && <p>Loading institutes…</p>}
                {institutesQuery.isError && <ErrorState error={institutesQuery.error} />}
                {!institutesQuery.isPending && !institutesQuery.isError && institutes.length === 0 &&
                  <p>No institutes are available. Create an institute first.</p>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 15 }}>
              <label style={labelStyle}>First name
                <input style={fieldStyle} autoComplete="given-name" required maxLength={150} value={form.first_name} onChange={(e) => setForm((v) => ({ ...v, first_name: e.target.value }))} />
              </label>
              <label style={labelStyle}>Last name
                <input style={fieldStyle} autoComplete="family-name" required maxLength={150} value={form.last_name} onChange={(e) => setForm((v) => ({ ...v, last_name: e.target.value }))} />
              </label>
              <label style={labelStyle}>Username
                <input style={fieldStyle} autoComplete="off" required maxLength={150} value={form.username} onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))} />
              </label>
              <label style={labelStyle}>Email address
                <input style={fieldStyle} type="email" autoComplete="off" required value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} />
              </label>
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 13, borderRadius: 10, background: platformColors.soft, color: platformColors.muted, fontSize: 12, lineHeight: 1.6 }}>
              <Mail size={17} color={platformColors.green} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>The server handles invitations and credentials. No password is entered here.</span>
            </div>
            {!!error && <ErrorState error={error} />}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: `1px solid ${platformColors.border}`, paddingTop: 17 }}>
              <Button type="button" variant="outline" disabled={busy} onClick={close}>Cancel</Button>
              <Button type="submit" disabled={busy || !selectedInstitute || institutesQuery.isPending || institutesQuery.isError}>
                <Plus size={16} aria-hidden="true" />
                {busy ? "Creating…" : "Create administrator"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}

// --------------------------------------------------
// RESOURCE PAGE
// --------------------------------------------------

// Timetable presentation only; the API values remain unchanged.
// Day numbers follow the backend convention: Monday = 0, Sunday = 6.
const timetableDays = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];

function timetableDay(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const day = Number(value);
  return Number.isInteger(day) && day >= 0 && day < 7
    ? timetableDays[day]
    : display(value);
}

function timetableTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const match = /^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(String(value));
  if (!match) return display(value);
  const hour = Number(match[1]);
  if (hour > 23) return display(value);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? "PM" : "AM"}`;
}

export function ResourcePage({
  resource: explicit,
  offering,
  initialCreate = false,
}: ResourcePageProps) {
  const params = useParams();

  const resource =
    explicit || params.resource || "";

  const config = resources[resource];
  const terms = useTerminology();
  const { role, user } = useAuth();

  const isAudit = resource === "audit";

  const isPlatformUsers =
    resource === "platform-users" &&
    role === "superadmin";

  const [auditRecord, setAuditRecord] =
    useState<RecordData | null>(null);

  const isPeople = resource === "memberships";

  const isAdminPeople =
    isPeople && role === "admin";

  const isAssignments =
    resource === "assignments";

  const isQuizzes =
    resource === "quizzes";

  const isAttendance =
    resource === "attendance-sessions";

  const isAttendanceOversight =
    isAttendance &&
    (role === "admin" || role === "head");

  const isQuizOversight =
    isQuizzes &&
    (role === "admin" || role === "head");

  const isAssignmentOversight =
    isAssignments &&
    (role === "admin" || role === "head");

  const isRestrictedAcademicResource =
    isAssignments || isQuizzes;

  const writable = isAttendance
    ? role === "teacher"
    : isRestrictedAcademicResource
      ? role === "teacher"
      : config?.write.includes(role) ?? false;

  const pageTitle = isPlatformUsers
    ? "Institute Administrators"
    : isPeople && role === "superadmin"
      ? "Institute administrators"
      : isPeople && role === "head"
        ? "Department People"
        : isAttendance && role === "admin"
        ? "Attendance oversight"
        : isAttendance && role === "head"
          ? "Department attendance"
          : isAssignments && role === "admin"
            ? "Assignment oversight"
            : isQuizzes && role === "admin"
              ? "Quiz oversight"
              : terms.title(
                  resource,
                  config?.title || resource
                );

  const pageDescription = isPlatformUsers
    ? "Manage platform accounts, review access status, and link eligible administrators to their institutions."
    : isPeople && role === "head"
      ? "View teachers and students within your academic department."
      : isAttendance && role === "admin"
        ? "Monitor attendance sessions and student participation across your institution. Assigned instructors manage attendance."
      : isAttendance && role === "head"
        ? "Review attendance across your department. Only assigned instructors can create sessions and mark attendance."
        : isAttendance && role === "teacher"
          ? "Create attendance sessions and record student participation in your assigned courses."
          : isAttendance && role === "student"
            ? "Review your recorded attendance."
            : isAssignments && role === "admin"
              ? "Monitor assignments, deadlines, publication status, and student submissions across your institute. Assignment creation and grading are handled by assigned instructors."
              : isAssignments && role === "head"
                ? "Review department assignments and submissions. Assignment authoring is available to instructors assigned to the course."
                : isQuizzes && role === "admin"
                  ? "Monitor quizzes, release status, questions, and student results across your institute. Quiz authoring and grading are handled by assigned instructors."
                  : isQuizzes && role === "head"
                    ? "Review department quizzes and results. Quiz authoring is available to instructors assigned to the course."
                    : config?.description || "";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<
    RecordData | null | undefined
  >(
    initialCreate &&
      (!isRestrictedAcademicResource ||
        role === "teacher") &&
      (!isAttendance || role === "teacher")
      ? null
      : undefined
  );

  const [workflow, setWorkflow] =
    useState<RecordData>();

  const [deleting, setDeleting] =
    useState<RecordData>();

  const [error, setError] =
    useState<unknown>();

  const [searchParams, updateFilter] =
    useUrlFilters();

  const navigate = useNavigate();
  const client = useQueryClient();

  const filters =
    new URLSearchParams(searchParams);

  if (offering) {
    filters.set("offering", offering);
  }

  filters.set("page", String(page));

  if (search) {
    filters.set("search", search);
  }

  const query = useQuery({
    queryKey: [
      "resource",
      resource,
      filters.toString(),
    ],
    queryFn: () =>
      api<Page<RecordData>>(
        `${resource}/?${filters.toString()}`
      ),
    enabled: !!config,
  });

  if (!config) {
    return (
      <Empty>
        Page not found.{" "}
        <Link to="/">
          Return to overview
        </Link>
      </Empty>
    );
  }

  const canDelete =
    writable &&
    ![
      "institutes",
      "memberships",
      "submissions",
      "attempts",
      "platform-users",
      "offerings",
      "enrollments",
      "manual-grades",
    ].includes(resource);

  async function start(row: RecordData) {
    try {
      const attempt = await post<RecordData>(
        `quizzes/${row.id}/start/`
      );

      navigate(
        `/quiz-attempt/${attempt.id}`
      );
    } catch (err) {
      setError(err);
    }
  }

  function actions(row: RecordData) {
    if (isAudit) {
      return (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            setAuditRecord(row)
          }
        >
          View details
          <ArrowUpRight
            size={14}
            aria-hidden="true"
          />
        </Button>
      );
    }

    return (
      <div className="row-actions">
        {isAttendanceOversight && (
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setWorkflow(row)
            }
          >
            View attendance
            <ArrowUpRight
              size={14}
              aria-hidden="true"
            />
          </Button>
        )}

        {role !== "student" &&
          !isAttendance && (
            <AcademicControl
              resource={resource}
              row={row}
            />
          )}

        {isQuizzes && writable && (
          <QuizAuthoring quiz={row} />
        )}

        {resource === "offerings" &&
          [
            "admin",
            "head",
            "superadmin",
          ].includes(role) && (
            <BulkEnrollment
              offering={row}
            />
          )}

        {isPlatformUsers &&
          row.is_superuser !== true && (
            <LinkAccount row={row} />
          )}

        {role !== "student" &&
          [
            "submissions",
            "attempts",
            "manual-grades",
          ].includes(resource) && (
            <GradeHistory
              resource={resource}
              id={row.id}
            />
          )}

        {resource === "question-bank" && (
          <BankCopy row={row} />
        )}

        {resource === "offerings" && (
          <Button
            variant="outline"
            asChild
          >
            <Link
              to={`/course/${row.id}`}
            >
              Open course
              <ArrowUpRight
                size={14}
                aria-hidden="true"
              />
            </Link>
          </Button>
        )}

        {resource === "lessons" && (
          <Button
            variant="outline"
            onClick={() =>
              setWorkflow(row)
            }
          >
            Read lesson
          </Button>
        )}

        {isAssignments &&
          (role === "student" ? (
            <Button
              variant="outline"
              onClick={() =>
                setWorkflow(row)
              }
            >
              Submit work
            </Button>
          ) : (
            <Button
              variant="outline"
              asChild
            >
              <Link
                to={`/submissions?assignment=${row.id}`}
              >
                {isAssignmentOversight
                  ? "View submissions"
                  : "Submissions"}
              </Link>
            </Button>
          ))}

        {isQuizzes &&
          (role === "student" ? (
            <>
              <Button
                variant="outline"
                onClick={() =>
                  void start(row)
                }
              >
                Start / resume
              </Button>

              <Link
                className="text-link"
                to={`/attempts?quiz=${row.id}`}
              >
                Results
              </Link>
            </>
          ) : (
            <>
              <Button variant="outline" asChild>
                <Link to={`/questions?quiz=${row.id}`}>
                  {isQuizOversight ? "View questions" : "Questions"}
                </Link>
              </Button>

              <Button variant="outline" asChild>
                <Link to={`/attempts?quiz=${row.id}`}>
                  Results
                </Link>
              </Button>
            </>
          ))}

        {([
          "submissions",
          "attempts",
          "manual-grades",
        ].includes(resource) ||
          (isAttendance &&
            role === "teacher")) && (
          <Button
            variant="outline"
            onClick={() =>
              setWorkflow(row)
            }
          >
            {isAttendance
              ? "Mark attendance"
              : "Review"}
          </Button>
        )}

        {(resource === "materials" ||
          isAssignments) &&
          !!row.file && (
            <a
              className="text-link"
              href={String(row.file)}
            >
              Download
            </a>
          )}

        {resource === "notifications" &&
          !row.read && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await post(
                    `notifications/${row.id}/read/`
                  );

                  await client.invalidateQueries();
                } catch (err) {
                  setError(err);
                }
              }}
            >
              Mark read
            </Button>
          )}

        {resource === "notifications" &&
          typeof row.destination ===
            "string" &&
          /^\/(?!\/)/.test(
            row.destination
          ) &&
          !/[\\\s]/.test(
            row.destination
          ) && (
            <Link
              className="text-link"
              to={row.destination}
            >
              Open notification
            </Link>
          )}

        {writable && (
          <button
            type="button"
            className="icon-button"
            aria-label={`Edit ${
              row.title ||
              row.name ||
              row.username ||
              "record"
            }`}
            title="Edit record"
            onClick={() =>
              setEditing(row)
            }
          >
            <Pencil
              size={16}
              aria-hidden="true"
            />
          </button>
        )}

        {canDelete && (
          <button
            type="button"
            className="icon-button danger"
            aria-label="Delete record"
            title="Delete record"
            onClick={() =>
              setDeleting(row)
            }
          >
            <Trash2
              size={16}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    );
  }

  const platformRows =
    isPlatformUsers
      ? query.data?.results ?? []
      : [];

  return (
    <>
      <PageHeader
        title={pageTitle}
        description={pageDescription}
      >
        {isPlatformUsers && (
          <AddInstituteAdministrator instituteId={user?.institute_id} />
        )}
        {isAdminPeople && (
          <Button
            variant="outline"
            asChild
          >
            <Link to="/student-admission">
              Add Student
            </Link>
          </Button>
        )}

        {isAdminPeople &&
          writable && (
            <ImportPeople />
          )}

        {writable &&
          resource !== "platform-users" &&
          !(
            resource === "offerings" &&
            role === "head"
          ) && (
            <Button
              onClick={() =>
                setEditing(null)
              }
            >
              <Plus size={17} />
              {isAttendance
                ? "Create session"
                : `Add ${
                    isPeople
                      ? "person"
                      : "new"
                  }`}
            </Button>
          )}
      </PageHeader>

      {isAdminPeople && (
        <nav
          className="people-tabs"
          aria-label="People groups"
        >
          {peopleTabs.map((tab) => {
            const activeRole =
              searchParams.get("role") || "";

            return (
              <Link
                key={tab.value}
                to={
                  tab.value
                    ? `/memberships?role=${tab.value}`
                    : "/memberships"
                }
                className={
                  activeRole === tab.value
                    ? "people-tab active"
                    : "people-tab"
                }
                aria-current={
                  activeRole === tab.value
                    ? "page"
                    : undefined
                }
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}

      {isQuizzes &&
        role !== "student" &&
        !isQuizOversight && (
          <Link
            className="text-link"
            to="/question-bank"
          >
            Open question bank →
          </Link>
        )}

      {isAssignments &&
        role === "student" && (
          <Link
            className="text-link"
            to="/submissions"
          >
            View my submissions &amp; feedback →
          </Link>
        )}

      {!!error && (
        <ErrorState error={error} />
      )}

      {isPlatformUsers && (
        <>
          <PlatformAccountSummary
            count={query.data?.count}
            rows={platformRows}
            hasNext={!!query.data?.next}
            isLoading={query.isPending}
          />

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "13px 16px",
              marginBottom: 20,
              border: `1px solid ${platformColors.border}`,
              borderRadius: 11,
              background: platformColors.soft,
              color: platformColors.dark,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <ShieldCheck
              size={18}
              style={{
                flexShrink: 0,
                marginTop: 2,
                color: platformColors.green,
              }}
            />

            <div>
              <strong>
                Platform access management
              </strong>

              <div
                style={{
                  color: platformColors.muted,
                  marginTop: 3,
                }}
              >
                Platform accounts and institute
                administrator appointments are
                managed separately. Use the
                linking action to associate an
                eligible account with the
                selected institute. Status
                summaries reflect the currently
                loaded page unless otherwise
                indicated.
              </div>
            </div>
          </div>
        </>
      )}

      <section
        className={
          isPeople
            ? "panel resource-panel people-resource-panel"
            : "panel resource-panel"
        }
      >
        <div
          className="table-toolbar"
          style={
            isPlatformUsers
              ? {
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  flexWrap: "wrap",
                  gap: 16,
                  padding: "20px 24px",
                }
              : undefined
          }
        >
          <div
            style={
              isPlatformUsers
                ? {
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }
                : undefined
            }
          >
            <b>
              {isPlatformUsers
                ? "Platform accounts"
                : pageTitle}
            </b>

            <span className="count-badge">
              {query.data?.count ?? "…"}
            </span>
          </div>

          {config.search && (
            <label
              className="search-box"
              style={
                isPlatformUsers
                  ? {
                      width: "100%",
                      maxWidth: 340,
                      minWidth: 220,
                    }
                  : undefined
              }
            >
              <Search
                size={17}
                aria-hidden="true"
              />

              <input
                aria-label={`Search ${config.title}`}
                placeholder={
                  isPlatformUsers
                    ? "Search platform accounts..."
                    : isPeople
                      ? "Search people..."
                      : "Search records..."
                }
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          )}
        </div>

        <div
          style={
            isPlatformUsers
              ? {
                  padding: "0 24px 18px",
                }
              : undefined
          }
        >
          <ResourceFilters
            resource={resource}
            value={searchParams}
            onChange={(key, value) => {
              setPage(1);
              updateFilter(key, value);
            }}
          />
        </div>

        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : !query.data.results.length ? (
          <Empty />
        ) : resource === "offerings" ? (
          <div className="course-grid">
            {query.data.results.map(
              (row, index) => (
                <CourseCard
                  key={String(row.id)}
                  course={row}
                  index={index}
                  actions={
                    <div className="course-management-actions">
                      {actions(row)}
                    </div>
                  }
                />
              )
            )}
          </div>
        ) : isPlatformUsers ? (
          <div
            className="table-scroll"
            style={{
              overflowX: "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  <th scope="col">
                    Account
                  </th>

                  <th scope="col">
                    Email
                  </th>

                  <th scope="col">
                    Account status
                  </th>

                  <th scope="col">
                    Access level
                  </th>

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {query.data.results.map(
                  (row) => (
                    <tr
                      key={String(row.id)}
                    >
                      <td>
                        <PlatformAccountIdentity
                          row={row}
                        />
                      </td>

                      <td
                        style={{
                          fontSize: 13,
                          color:
                            platformColors.muted,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        {display(row.email)}
                      </td>

                      <td>
                        <PlatformStatus
                          active={
                            row.is_active === true
                          }
                        />
                      </td>

                      <td>
                        <PlatformStatus
                          active={
                            row.is_superuser === true
                          }
                          superuser
                        />
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems:
                              "center",
                            gap: 12,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {row.is_superuser !==
                            true && (
                            <LinkAccount
                              row={row}
                            />
                          )}

                          {writable && (
                            <button
                              type="button"
                              className="icon-button"
                              aria-label={`Edit ${String(
                                row.username ||
                                  "account"
                              )}`}
                              title="Edit account"
                              onClick={() =>
                                setEditing(row)
                              }
                            >
                              <Pencil
                                size={16}
                                aria-hidden="true"
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {config.columns.map(
                    (column) => (
                      <th
                        key={column}
                        scope="col"
                      >
                        {terms.column(column)}
                      </th>
                    )
                  )}

                  <th scope="col">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {(resource === "timetable"
                  ? [...query.data.results].sort((a, b) => {
                      const dayA = Number(a.day ?? 99);
                      const dayB = Number(b.day ?? 99);
                      if (dayA !== dayB) return dayA - dayB;
                      return String(a.start ?? a.start_time ?? "").localeCompare(
                        String(b.start ?? b.start_time ?? "")
                      );
                    })
                  : query.data.results
                ).map(
                  (row) => (
                    <tr
                      key={String(row.id)}
                    >
                      {config.columns.map(
                        (
                          column,
                          index
                        ) => (
                          <td
                            key={column}
                            className={
                              index === 0
                                ? "primary-cell"
                                : ""
                            }
                          >
                            {isPeople &&
                              column ===
                                "username" && (
                                <span
                                  aria-hidden="true"
                                >
                                  <Avatar
                                    src={
                                      row.avatar_url as
                                        | string
                                        | null
                                    }
                                    name={String(
                                      row.first_name ||
                                        row.username
                                    )}
                                  />
                                </span>
                              )}

                            {isAudit &&
                            column ===
                              "action" ? (
                              <strong>
                                {auditLabel(
                                  row[column]
                                )}
                              </strong>
                            ) : isAudit &&
                              column ===
                                "object_id" ? (
                              <span
                                title={String(
                                  row[column] ??
                                    ""
                                )}
                                style={{
                                  fontFamily:
                                    "monospace",
                                  fontSize: 12,
                                }}
                              >
                                {auditId(
                                  row[column]
                                )}
                              </span>
                            ) : isAudit &&
                              column ===
                                "detail" ? (
                              <span
                                title={auditSummary(
                                  row[column]
                                )}
                                style={{
                                  display:
                                    "inline-block",
                                  maxWidth: 340,
                                  overflow:
                                    "hidden",
                                  textOverflow:
                                    "ellipsis",
                                  whiteSpace:
                                    "nowrap",
                                  verticalAlign:
                                    "middle",
                                }}
                              >
                                {auditSummary(
                                  row[column]
                                )}
                              </span>
                            ) : typeof row[
                                column
                              ] ===
                              "boolean" ? (
                              <span
                                className={
                                  row[column]
                                    ? "status-badge"
                                    : "status-badge neutral"
                                }
                              >
                                {row[column]
                                  ? "Yes"
                                  : "No"}
                              </span>
                            ) : isPeople &&
                              column ===
                                "role" ? (
                              <span
                                className={`people-role-badge people-role-${String(
                                  row[
                                    column
                                  ] ?? ""
                                )}`}
                              >
                                {peopleRoles[
                                  String(
                                    row[
                                      column
                                    ] ?? ""
                                  )
                                ] ??
                                  display(
                                    row[
                                      column
                                    ]
                                  )}
                              </span>
                            ) : column.endsWith(
                                "_at"
                              ) ? (
                              row[column]
                                ? new Date(
                                    String(
                                      row[
                                        column
                                      ]
                                    )
                                  ).toLocaleString()
                                : "—"
                            ) : resource === "timetable" &&
                              column === "day" ? (
                              timetableDay(row[column])
                            ) : resource === "timetable" &&
                              ["start", "end", "start_time", "end_time"].includes(column) ? (
                              timetableTime(row[column])
                            ) : (
                              display(
                                row[column]
                              )
                            )}
                          </td>
                        )
                      )}

                      <td>
                        {isPeople ? (
                          <PeopleActions
                            row={row}
                            writable={
                              writable
                            }
                            role={role}
                            currentUserId={
                              user?.id
                            }
                            onEdit={
                              setEditing
                            }
                          />
                        ) : (
                          actions(row)
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <small>
            Page {page} ·{" "}
            {query.data?.count ?? 0} records
          </small>

          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() =>
              setPage((current) =>
                Math.max(
                  1,
                  current - 1
                )
              )
            }
          >
            Previous
          </Button>

          <Button
            variant="ghost"
            disabled={
              !query.data?.next
            }
            onClick={() =>
              setPage(
                (current) =>
                  current + 1
              )
            }
          >
            Next
          </Button>
        </div>
      </section>

      {editing !== undefined &&
        writable && (
          <Dialog
            open
            onOpenChange={() =>
              setEditing(undefined)
            }
            title={
              resource === "memberships" &&
              !editing &&
              role === "admin"
                ? "Add a person"
                : `${editing ? "Edit" : "Create"} ${
                    resource === "institutes"
                      ? "institute"
                      : isPlatformUsers
                        ? "platform account"
                        : pageTitle.toLowerCase()
                  }`
            }
          >
            <ResourceForm
              resource={resource}
              initial={
                editing ||
                undefined
              }
              defaults={{
                ...Object.fromEntries(
                  searchParams
                ),
                ...(offering
                  ? { offering }
                  : {}),
              }}
              onDone={() =>
                setEditing(undefined)
              }
            />
          </Dialog>
        )}

      {isAudit &&
        auditRecord && (
          <Dialog
            open
            title="Audit record details"
            onOpenChange={() =>
              setAuditRecord(null)
            }
          >
            <div
              style={{
                display: "grid",
                gap: 16,
                maxHeight: "70vh",
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gap: 6,
                }}
              >
                <div>
                  <strong>
                    Action:{" "}
                  </strong>
                  {auditLabel(
                    auditRecord.action
                  )}
                </div>

                <div>
                  <strong>
                    Recorded:{" "}
                  </strong>
                  {auditRecord.created_at
                    ? new Date(
                        String(
                          auditRecord.created_at
                        )
                      ).toLocaleString()
                    : "Not specified"}
                </div>

                <div
                  style={{
                    overflowWrap:
                      "anywhere",
                  }}
                >
                  <strong>
                    Record ID:{" "}
                  </strong>
                  <code>
                    {auditText(
                      auditRecord.object_id
                    )}
                  </code>
                </div>

                {auditRecord.object_id !=
                  null && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (
                        typeof navigator !==
                          "undefined" &&
                        navigator.clipboard
                      ) {
                        void navigator.clipboard.writeText(
                          String(
                            auditRecord.object_id
                          )
                        );
                      }
                    }}
                  >
                    Copy record ID
                  </Button>
                )}
              </div>

              <div>
                <h3
                  style={{
                    fontSize: 16,
                    marginBottom: 12,
                  }}
                >
                  Recorded changes
                </h3>

                <AuditDetailContent
                  detail={
                    auditRecord.detail
                  }
                />
              </div>
            </div>
          </Dialog>
        )}

      {workflow && (
        <WorkflowDialog
          resource={resource}
          row={workflow}
          onClose={() =>
            setWorkflow(undefined)
          }
        />
      )}

      {deleting &&
        canDelete && (
          <Dialog
            open
            title="Delete this record?"
            onOpenChange={() =>
              setDeleting(undefined)
            }
          >
            <p>
              Delete this unused draft
              record permanently.
              Published content and
              records with academic
              history are protected
              by the server.
            </p>

            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await api(
                    `${resource}/${deleting.id}/`,
                    {
                      method: "DELETE",
                    }
                  );

                  setDeleting(
                    undefined
                  );

                  notifySaved(
                    "Record deleted."
                  );

                  await client.invalidateQueries();
                } catch (err) {
                  setError(err);
                  setDeleting(
                    undefined
                  );
                }
              }}
            >
              Delete record
            </Button>
          </Dialog>
        )}
    </>
  );
}