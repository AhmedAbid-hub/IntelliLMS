import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Mail,
  Plus,
  ShieldCheck,
  UserCheck,
  UsersRound,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { Avatar } from "../../../components/Avatar";
import { ErrorState } from "../../../components/shared";
import { notifySaved } from "../../../components/ToastProvider";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { api, post, type Page, type RecordData } from "../../../lib/api";

export const platformColors = {
  green: "#176443",
  dark: "#173d2e",
  muted: "#6b8275",
  border: "#dce8df",
  soft: "#f5f9f5",
  cream: "#fafbf8",
};

export function PlatformStat({
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

export function PlatformAccountSummary({
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
  const active = rows.filter((row) => row.is_active === true).length;

  const inactive = rows.filter((row) => row.is_active === false).length;

  const superusers = rows.filter((row) => row.is_superuser === true).length;

  const pageNote = hasNext ? "On this page" : "On this page";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
        gap: 15,
        marginBottom: 20,
      }}
    >
      <PlatformStat
        label="Total platform accounts"
        value={isLoading ? "—" : (count ?? "—")}
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

export function PlatformAccountIdentity({ row }: { row: RecordData }) {
  const name = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();

  const username = String(row.username || "Unknown account");

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
        src={(row.avatar_url as string | null) || null}
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

export function PlatformStatus({
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
        background: positive ? "#e8f5ec" : "#f0f1ed",
        color: positive ? "#176443" : "#67756a",
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
          background: positive ? "#30a76b" : "#a6afa7",
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

export function AddInstituteAdministrator({
  instituteId,
}: {
  instituteId: unknown;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const [selectedInstitute, setSelectedInstitute] = useState("");
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
  });

  const institutesQuery = useQuery({
    queryKey: ["administrator-target-institutes"],
    queryFn: () =>
      api<Page<RecordData> | RecordData[]>("institutes/?page_size=1000"),
    enabled: open,
    staleTime: 60_000,
  });
  const institutes = Array.isArray(institutesQuery.data)
    ? institutesQuery.data
    : (institutesQuery.data?.results ?? []);

  const fieldStyle = {
    width: "100%",
    minWidth: 0,
    padding: "11px 13px",
    border: `1px solid ${platformColors.border}`,
    borderRadius: 9,
    background: "#fff",
    color: platformColors.dark,
    font: "inherit",
    boxSizing: "border-box",
  } as const;
  const labelStyle = {
    display: "grid",
    gap: 7,
    fontSize: 13,
    fontWeight: 650,
    color: platformColors.dark,
  } as const;

  function close() {
    if (!busy) setOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => {
          setError(undefined);
          setSuccess(false);
          setSelectedInstitute(instituteId == null ? "" : String(instituteId));
          setForm({ username: "", email: "", first_name: "", last_name: "" });
          setOpen(true);
        }}
      >
        <Plus size={17} aria-hidden="true" />
        Add Administrator
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) close();
        }}
        title="Add Institute Administrator"
      >
        {success ? (
          <div style={{ display: "grid", gap: 16 }} role="status">
            <div
              style={{
                padding: 16,
                background: platformColors.soft,
                border: `1px solid ${platformColors.border}`,
                borderRadius: 11,
              }}
            >
              <strong style={{ color: platformColors.green }}>
                Administrator account created
              </strong>
              <p style={{ margin: "8px 0 0", color: platformColors.muted }}>
                The administrator has been submitted for the selected institute.
                Check the invitation status in platform accounts.
              </p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button type="button" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form
            style={{ display: "grid", gap: 19 }}
            onSubmit={async (event) => {
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
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 11,
                alignItems: "flex-start",
                padding: 14,
                border: `1px solid ${platformColors.border}`,
                borderRadius: 11,
                background: platformColors.soft,
              }}
            >
              <Building2
                size={19}
                color={platformColors.green}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <label
                  style={labelStyle}
                  htmlFor="administrator-target-institute"
                >
                  Institute
                </label>
                <select
                  id="administrator-target-institute"
                  style={{ ...fieldStyle, marginTop: 8 }}
                  value={selectedInstitute}
                  required
                  disabled={
                    busy || institutesQuery.isPending || institutesQuery.isError
                  }
                  onChange={(event) => setSelectedInstitute(event.target.value)}
                >
                  <option value="">Select institute</option>
                  {institutes.map((institute) => (
                    <option
                      key={String(institute.id)}
                      value={String(institute.id)}
                    >
                      {String(
                        institute.name || institute.title || institute.id,
                      )}
                    </option>
                  ))}
                </select>
                {institutesQuery.isPending && <p>Loading institutes…</p>}
                {institutesQuery.isError && (
                  <ErrorState error={institutesQuery.error} />
                )}
                {!institutesQuery.isPending &&
                  !institutesQuery.isError &&
                  institutes.length === 0 && (
                    <p>
                      No institutes are available. Create an institute first.
                    </p>
                  )}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 15,
              }}
            >
              <label style={labelStyle}>
                First name
                <input
                  style={fieldStyle}
                  autoComplete="given-name"
                  required
                  maxLength={150}
                  value={form.first_name}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, first_name: e.target.value }))
                  }
                />
              </label>
              <label style={labelStyle}>
                Last name
                <input
                  style={fieldStyle}
                  autoComplete="family-name"
                  required
                  maxLength={150}
                  value={form.last_name}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, last_name: e.target.value }))
                  }
                />
              </label>
              <label style={labelStyle}>
                Username
                <input
                  style={fieldStyle}
                  autoComplete="off"
                  required
                  maxLength={150}
                  value={form.username}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, username: e.target.value }))
                  }
                />
              </label>
              <label style={labelStyle}>
                Email address
                <input
                  style={fieldStyle}
                  type="email"
                  autoComplete="off"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((v) => ({ ...v, email: e.target.value }))
                  }
                />
              </label>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: 13,
                borderRadius: 10,
                background: platformColors.soft,
                color: platformColors.muted,
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              <Mail
                size={17}
                color={platformColors.green}
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <span>
                The server handles invitations and credentials. No password is
                entered here.
              </span>
            </div>
            {!!error && <ErrorState error={error} />}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                borderTop: `1px solid ${platformColors.border}`,
                paddingTop: 17,
              }}
            >
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={close}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  !selectedInstitute ||
                  institutesQuery.isPending ||
                  institutesQuery.isError
                }
              >
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
