import {
  ChevronDown,
  GraduationCap,
  MoreHorizontal,
  Pencil,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { type RecordData } from "../../../lib/api";
import { InvitationReview } from "../InvitationReview";
import { platformColors } from "../platform/PlatformAccounts";
import { StaffLifecycle } from "../StaffLifecycle";

const componentActionStyle = {
  display: "flex",
  alignItems: "center",
  width: "100%",
  minWidth: 0,
} as const;

export const peopleRoles: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Institute Admin",
  head: "Department Head",
  teacher: "Teacher",
  student: "Student",
};

export const peopleTabs = [
  { label: "All people", value: "" },
  { label: "Students", value: "student" },
  { label: "Teachers", value: "teacher" },
  { label: "Department Heads", value: "head" },
];

export type PeopleActionsProps = {
  row: RecordData;
  writable: boolean;
  role: string;
  currentUserId?: string | number;
  onEdit: (row: RecordData) => void;
};

export const menuItemStyle = {
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

export function PeopleActions({
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
    row.display_name || row.first_name || row.username || "person",
  );

  const canManagePlacement = role === "admin" && row.role === "student";

  const isOwnAccount =
    currentUserId != null &&
    row.user != null &&
    String(row.user) === String(currentUserId);

  const canManageAccess =
    writable &&
    !isOwnAccount &&
    !(row.role === "admin" && role !== "superadmin");

  const canReviewInvitation =
    writable && (role === "superadmin" || row.role !== "admin");

  const hasActions =
    writable || canManagePlacement || canManageAccess || canReviewInvitation;

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const menuWidth = 250;
    const estimatedHeight = 245;
    const padding = 8;

    const left = Math.max(
      padding,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - padding),
    );

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const openUpward =
      spaceBelow < estimatedHeight + 12 && spaceAbove > spaceBelow;

    setPosition({
      left,
      top: openUpward
        ? Math.max(padding, rect.top - estimatedHeight - 6)
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

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    document.addEventListener("keydown", handleKeyDown);

    window.addEventListener("resize", updatePosition);

    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);

      document.removeEventListener("keydown", handleKeyDown);

      window.removeEventListener("resize", updatePosition);

      window.removeEventListener("scroll", handleScroll, true);
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
        boxShadow: "0 14px 38px rgba(15, 40, 28, 0.16)",
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
          {peopleRoles[String(row.role)] || String(row.role || "Account")}
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
          <GraduationCap size={16} aria-hidden="true" />
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
            transform: open ? "rotate(180deg)" : undefined,
          }}
        />
      </button>

      {createPortal(menu, document.body)}
    </>
  );
}
