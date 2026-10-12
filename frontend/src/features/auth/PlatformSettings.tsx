import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  Eye,
  Globe2,
  Info,
  LifeBuoy,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";

import { notifySaved } from "../../components/ToastProvider";
import { api } from "../../lib/api";
import { useAuth } from "./Auth";
import {
  PageHeader,
  Loading,
  ErrorState,
} from "../../components/shared";
import { Button } from "../../components/ui/button";

type Configuration = {
  platform_name: string;
  support_email: string;
  login_notice: string;
};

const colors = {
  dark: "#193e2e",
  green: "#176443",
  muted: "#718579",
  border: "#dce8df",
  soft: "#f5f9f5",
  pale: "#edf5ef",
  white: "#ffffff",
};

export function usePlatformConfiguration() {
  return useQuery({
    queryKey: ["platform-configuration"],
    queryFn: () =>
      api<Configuration>("platform-settings/"),
    staleTime: 60000,
  });
}

const sectionStyle: React.CSSProperties = {
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: 15,
  padding: "25px 28px",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 9,
  fontSize: 13,
  fontWeight: 650,
  color: colors.dark,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 47,
  padding: "11px 14px",
  border: `1px solid #cfded3`,
  borderRadius: 10,
  background: "#ffffff",
  color: colors.dark,
  font: "inherit",
  fontSize: 14,
  outlineColor: colors.green,
};

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 13,
        marginBottom: 24,
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: colors.pale,
          color: colors.green,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} />
      </div>

      <div>
        <h2
          style={{
            margin: 0,
            color: colors.dark,
            fontSize: 17,
            fontWeight: 750,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            color: colors.muted,
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function PlatformSettingsForm({
  initial,
}: {
  initial: Configuration;
}) {
  const client = useQueryClient();

  const [form, setForm] = useState<Configuration>({
    ...initial,
  });

  const [baseline, setBaseline] = useState<Configuration>({
    ...initial,
  });

  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({ ...initial });
    setBaseline({ ...initial });
  }, [
    initial.platform_name,
    initial.support_email,
    initial.login_notice,
  ]);

  const dirty =
    form.platform_name !== baseline.platform_name ||
    form.support_email !== baseline.support_email ||
    form.login_notice !== baseline.login_notice;

  function update(
    field: keyof Configuration,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));

    setSaved(false);
  }

  function resetChanges() {
    setForm({ ...baseline });
    setSaved(false);
    setError(undefined);
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy || !dirty) return;

    setBusy(true);
    setSaved(false);
    setError(undefined);

    const payload: Configuration = {
      platform_name: form.platform_name.trim(),
      support_email: form.support_email.trim(),
      login_notice: form.login_notice.trim(),
    };

    try {
      await api("platform-settings/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setForm(payload);
      setBaseline(payload);

      await client.invalidateQueries({
        queryKey: ["platform-configuration"],
      });

      setSaved(true);
      notifySaved("Platform configuration updated.");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "grid",
        gap: 20,
        maxWidth: 1400,
      }}
    >
      {/* PLATFORM IDENTITY */}

      <section style={sectionStyle}>
        <SectionHeading
          icon={Building2}
          title="Platform identity"
          description="Manage the name and contact information displayed across IntelliLMS."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 22,
          }}
        >
          <label style={labelStyle}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Globe2
                size={15}
                color={colors.green}
              />
              Platform name
            </span>

            <input
              name="platform_name"
              required
              maxLength={32}
              value={form.platform_name}
              onChange={(event) =>
                update(
                  "platform_name",
                  event.target.value
                )
              }
              placeholder="Enter platform name"
              style={inputStyle}
            />

            <span
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
                fontWeight: 400,
                color: colors.muted,
              }}
            >
              <span>
                Displayed throughout the platform.
              </span>

              <span>
                {form.platform_name.length}/32
              </span>
            </span>
          </label>

          <label style={labelStyle}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Mail
                size={15}
                color={colors.green}
              />
              Public support email
            </span>

            <input
              name="support_email"
              type="email"
              maxLength={254}
              value={form.support_email}
              onChange={(event) =>
                update(
                  "support_email",
                  event.target.value
                )
              }
              placeholder="support@example.com"
              style={inputStyle}
            />

            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: colors.muted,
              }}
            >
              Optional contact address visible to users.
            </span>
          </label>
        </div>
      </section>

      {/* LOGIN NOTICE */}

      <section style={sectionStyle}>
        <SectionHeading
          icon={LifeBuoy}
          title="Public login notice"
          description="Configure a message that can be displayed to users before they sign in."
        />

        <label style={labelStyle}>
          Notice message

          <textarea
            name="login_notice"
            maxLength={400}
            rows={4}
            value={form.login_notice}
            onChange={(event) =>
              update(
                "login_notice",
                event.target.value
              )
            }
            placeholder="Example: Welcome to IntelliLMS. Please contact your institute administrator if you need assistance accessing your account."
            style={{
              ...inputStyle,
              minHeight: 125,
              resize: "vertical",
              lineHeight: 1.7,
            }}
          />

          <span
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              color: colors.muted,
              fontSize: 12,
              fontWeight: 400,
            }}
          >
            <span>
              Leave blank to display no notice.
            </span>

            <span>
              {form.login_notice.length}/400
            </span>
          </span>
        </label>
      </section>

      {/* LIVE PREVIEW */}

      <section style={sectionStyle}>
        <SectionHeading
          icon={Eye}
          title="Public information preview"
          description="Preview the platform information as it may appear on public-facing screens."
        />

        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 13,
            overflow: "hidden",
            background: "#fbfcfa",
          }}
        >
          <div
            style={{
              padding: "13px 19px",
              borderBottom: `1px solid ${colors.border}`,
              background: colors.soft,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: colors.muted,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Eye size={15} />
            Preview of public-facing information
          </div>

          <div
            style={{
              padding: "30px 24px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 13,
            }}
          >
            <div
              style={{
                width: 53,
                height: 53,
                borderRadius: 15,
                background: colors.green,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCapIcon />
            </div>

            <h3
              style={{
                margin: 0,
                fontSize: 23,
                color: colors.dark,
                fontWeight: 800,
                overflowWrap: "anywhere",
              }}
            >
              {form.platform_name.trim() ||
                "Platform name"}
            </h3>

            <p
              style={{
                margin: 0,
                color: colors.muted,
                fontSize: 13,
              }}
            >
              Learning Management System
            </p>

            {form.login_notice.trim() && (
              <div
                style={{
                  width: "100%",
                  maxWidth: 590,
                  boxSizing: "border-box",
                  padding: "14px 17px",
                  borderRadius: 10,
                  border: `1px solid ${colors.border}`,
                  background: colors.soft,
                  color: colors.dark,
                  fontSize: 13,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {form.login_notice}
              </div>
            )}

            {form.support_email.trim() && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: colors.muted,
                  fontSize: 12,
                  flexWrap: "wrap",
                }}
              >
                <Mail size={14} />

                <span
                  style={{
                    overflowWrap: "anywhere",
                  }}
                >
                  {form.support_email}
                </span>
              </div>
            )}
          </div>
        </div>

        <p
          style={{
            margin: "13px 0 0",
            fontSize: 12,
            color: colors.muted,
            lineHeight: 1.6,
          }}
        >
          This is an illustrative preview. The actual
          login page may arrange these details
          differently.
        </p>
      </section>

      {/* SECURITY NOTE */}

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "16px 19px",
          border: `1px solid ${colors.border}`,
          borderRadius: 12,
          background: colors.pale,
        }}
      >
        <ShieldCheck
          size={20}
          color={colors.green}
          style={{
            flexShrink: 0,
            marginTop: 1,
          }}
        />

        <div>
          <strong
            style={{
              display: "block",
              fontSize: 13,
              color: colors.dark,
              marginBottom: 4,
            }}
          >
            Public information only
          </strong>

          <p
            style={{
              margin: 0,
              color: colors.muted,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            These settings may be visible before
            sign-in. Do not enter credentials,
            internal system details, or private
            institute information.
          </p>
        </div>
      </div>

      {/* ERRORS AND SUCCESS */}

      {!!error && <ErrorState error={error} />}

      {saved && !dirty && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            color: colors.green,
            background: colors.soft,
            border: `1px solid ${colors.border}`,
            borderRadius: 10,
            padding: "12px 15px",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={17} />
          Platform settings saved successfully.
        </div>
      )}

      {/* SAVE ACTIONS */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 15,
          padding: "19px 23px",
          background: colors.white,
          border: `1px solid ${colors.border}`,
          borderRadius: 13,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            fontSize: 13,
            color: dirty
              ? "#a16b26"
              : colors.muted,
          }}
        >
          {dirty ? (
            <>
              <Info size={17} />
              You have unsaved changes.
            </>
          ) : (
            <>
              <CheckCircle2
                size={17}
                color={colors.green}
              />
              All changes are saved.
            </>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            flexWrap: "wrap",
          }}
        >
          {dirty && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={resetChanges}
            >
              <RotateCcw size={15} />
              Discard changes
            </Button>
          )}

          <Button
            type="submit"
            disabled={busy || !dirty}
          >
            <Save size={16} />
            {busy
              ? "Saving…"
              : "Save platform settings"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function GraduationCapIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 10 10-5 10 5-10 5-10-5Z" />
      <path d="M6 12v5c3.6 2.7 8.4 2.7 12 0v-5" />
      <path d="M22 10v6" />
    </svg>
  );
}

export function PlatformSettings() {
  const { role } = useAuth();
  const query = usePlatformConfiguration();

  if (role !== "superadmin") {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Platform settings"
        description="Manage public branding, support information, and login notices shared across all institutes."
      />

      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <ErrorState error={query.error} />
      ) : (
        <PlatformSettingsForm
          initial={query.data}
        />
      )}
    </>
  );
}