import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "./Auth";
import { api, post } from "../../lib/api";
import { PageHeader, ErrorState } from "../../components/shared";
import { Button } from "../../components/ui/button";
import { ProfilePicture } from "./ProfilePicture";

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  minWidth: 0,
  height: 46,
  padding: "10px 13px",
  boxSizing: "border-box",
  border: "1px solid #d3e2d7",
  borderRadius: 10,
  background: "#ffffff",
  color: "#173c2d",
  fontSize: 14,
  fontFamily: "inherit",
};

const fieldStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 8,
  minWidth: 0,
  width: "100%",
  fontSize: 13,
  fontWeight: 600,
  color: "#29483a",
};

const cardStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  minWidth: 0,
  boxSizing: "border-box",
};

const headingStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  margin: 0,
  fontSize: 20,
  color: "#173c2d",
};

type Feedback = {
  type: "success" | "error";
  message: string;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}

function FeedbackMessage({
  feedback,
}: {
  feedback: Feedback | null;
}) {
  if (!feedback) return null;

  const success = feedback.type === "success";

  return (
    <div
      role={success ? "status" : "alert"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: 10,
        background: success ? "#edf8f0" : "#fff4f4",
        color: success ? "#176447" : "#9a3030",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {success ? (
        <CheckCircle2 size={18} aria-hidden="true" />
      ) : (
        <ShieldCheck size={18} aria-hidden="true" />
      )}
      <span>{feedback.message}</span>
    </div>
  );
}

export function Profile() {
  const { user, refresh } = useAuth();

  const [first, setFirst] = useState(user?.first_name || "");
  const [last, setLast] = useState(user?.last_name || "");
  const [notifyAcademic, setNotifyAcademic] = useState(
    user?.notify_academic ?? true
  );

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] =
    useState(false);
  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);

  const [profileFeedback, setProfileFeedback] =
    useState<Feedback | null>(null);
  const [passwordFeedback, setPasswordFeedback] =
    useState<Feedback | null>(null);

  const [profileError, setProfileError] = useState<unknown>();
  const [passwordError, setPasswordError] = useState<unknown>();

  const loadedUserId = useRef(
    user?.id == null ? null : String(user.id)
  );

  const currentUserId =
    user?.id == null ? null : String(user.id);

  useEffect(() => {
    if (loadedUserId.current === currentUserId) return;

    loadedUserId.current = currentUserId;

    setFirst(user?.first_name || "");
    setLast(user?.last_name || "");
    setNotifyAcademic(user?.notify_academic ?? true);

    setOldPassword("");
    setNewPassword("");
    setProfileFeedback(null);
    setPasswordFeedback(null);
    setProfileError(undefined);
    setPasswordError(undefined);
  }, [
    currentUserId,
    user?.first_name,
    user?.last_name,
    user?.notify_academic,
  ]);

  const originalFirst = user?.first_name || "";
  const originalLast = user?.last_name || "";
  const originalNotifications = user?.notify_academic ?? true;

  const profileChanged =
    first !== originalFirst ||
    last !== originalLast ||
    notifyAcademic !== originalNotifications;

  const passwordValid =
    oldPassword.length > 0 && newPassword.length >= 12;

  const displayName =
    [user?.first_name, user?.last_name]
      .filter(Boolean)
      .join(" ") ||
    user?.username ||
    "Your account";

  const role = "";

  const roleLabels: Record<string, string> = {
    superadmin: "Super Administrator",
    admin: "Institute Administrator",
    head: "Department Head",
    teacher: "Teacher",
    student: "Student",
  };

  const roleLabel = roleLabels[role] || "Account member";

  const isAcademicRole = [
    "student",
    "teacher",
    "head",
  ].includes(role);

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (savingProfile) return;

    setSavingProfile(true);
    setProfileFeedback(null);
    setProfileError(undefined);

    try {
      await api("auth/me/", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: first.trim(),
          last_name: last.trim(),
          notify_academic: notifyAcademic,
        }),
      });

      await refresh();

      setProfileFeedback({
        type: "success",
        message: "Your profile has been updated successfully.",
      });
    } catch (error) {
      setProfileError(error);
      setProfileFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (changingPassword) return;

    setPasswordFeedback(null);
    setPasswordError(undefined);

    if (!oldPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Enter your current password.",
      });
      return;
    }

    if (newPassword.length < 12) {
      setPasswordFeedback({
        type: "error",
        message:
          "Your new password must contain at least 12 characters.",
      });
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordFeedback({
        type: "error",
        message:
          "Your new password must be different from your current password.",
      });
      return;
    }

    setChangingPassword(true);

    try {
      await post("auth/password-change/", {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setOldPassword("");
      setNewPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);

      setPasswordFeedback({
        type: "success",
        message: "Your password has been changed successfully.",
      });
    } catch (error) {
      setPasswordError(error);
      setPasswordFeedback({
        type: "error",
        message: getErrorMessage(error),
      });
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Profile & security"
        description="Manage your personal information, notification preferences, and account security."
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          paddingBottom: 30,
        }}
      >
        {/* Account summary */}
        <section
          aria-label="Account summary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
            padding: "17px 20px",
            border: "1px solid #dce8df",
            borderRadius: 13,
            background: "#f7faf7",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#e4f0e7",
              color: "#176447",
              flexShrink: 0,
            }}
          >
            <UserRound size={23} aria-hidden="true" />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              flex: 1,
              minWidth: 0,
            }}
          >
            <strong
              style={{
                fontSize: 15,
                color: "#173c2d",
              }}
            >
              {displayName}
            </strong>
            <span className="muted" style={{ fontSize: 12 }}>
              {roleLabel}
            </span>
          </div>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: "#176447",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <ShieldCheck size={17} aria-hidden="true" />
            Account settings
          </span>
        </section>

        <div className="profile-grid">
          <ProfilePicture />

          {/* Personal information */}
          <form
            className="panel padded"
            onSubmit={saveProfile}
            style={cardStyle}
          >
            <div>
              <h2 style={headingStyle}>
                <UserRound
                  size={21}
                  color="#176447"
                  aria-hidden="true"
                />
                Your profile
              </h2>
              <p
                className="muted"
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Manage the name displayed on your IntelliLMS
                account.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Mail size={15} aria-hidden="true" />
                Email address
              </span>

              <div
                style={{
                  padding: "12px 13px",
                  border: "1px solid #e0e9e2",
                  borderRadius: 10,
                  background: "#f7f9f7",
                  color: "#465b50",
                  fontSize: 14,
                  overflowWrap: "anywhere",
                }}
              >
                {user?.email || "No email available"}
              </div>

              <p
                className="muted"
                style={{
                  margin: 0,
                  fontSize: 12,
                }}
              >
                Your email address is managed through your
                account administration process.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                gap: 16,
              }}
            >
              <label style={fieldStyle}>
                First name
                <input
                  type="text"
                  autoComplete="given-name"
                  maxLength={150}
                  value={first}
                  disabled={savingProfile}
                  onChange={(event) => {
                    setFirst(event.target.value);
                    setProfileFeedback(null);
                  }}
                  style={inputStyle}
                />
              </label>

              <label style={fieldStyle}>
                Last name
                <input
                  type="text"
                  autoComplete="family-name"
                  maxLength={150}
                  value={last}
                  disabled={savingProfile}
                  onChange={(event) => {
                    setLast(event.target.value);
                    setProfileFeedback(null);
                  }}
                  style={inputStyle}
                />
              </label>
            </div>

            {/* Notification preferences */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                borderTop: "1px solid #e8eee9",
                paddingTop: 20,
              }}
            >
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  margin: 0,
                  fontSize: 15,
                  color: "#173c2d",
                }}
              >
                <Bell
                  size={19}
                  color="#176447"
                  aria-hidden="true"
                />
                Notification preferences
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 15,
                  border: "1px solid #dce8df",
                  borderRadius: 11,
                  background: "#f8fbf8",
                }}
              >
                <input
                  id="profile-notify-academic"
                  type="checkbox"
                  checked={notifyAcademic}
                  disabled={savingProfile}
                  onChange={(event) => {
                    setNotifyAcademic(event.target.checked);
                    setProfileFeedback(null);
                  }}
                  style={{
                    display: "block",
                    position: "static",
                    appearance: "auto",
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    minHeight: 18,
                    flexShrink: 0,
                    padding: 0,
                    margin: "2px 0 0",
                    accentColor: "#176447",
                    cursor: "pointer",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <label
                    htmlFor="profile-notify-academic"
                    style={{
                      display: "block",
                      width: "auto",
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 600,
                      lineHeight: 1.5,
                      color: "#29483a",
                      cursor: "pointer",
                    }}
                  >
                    Receive academic updates and deadline
                    reminders
                  </label>

                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: 12,
                      lineHeight: 1.7,
                    }}
                  >
                    {isAcademicRole
                      ? "Receive future in-app notifications about your courses and academic activities."
                      : "Receive future in-app academic notifications relevant to your institution and responsibilities."}
                  </p>
                </div>
              </div>

              <p
                className="muted"
                style={{
                  margin: 0,
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                This preference does not affect existing
                notifications or important account security
                messages.
              </p>
            </div>

            <FeedbackMessage feedback={profileFeedback} />

            {!!profileError && (
              <ErrorState error={profileError} />
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: "auto",
              }}
            >
              <Button
                type="submit"
                disabled={savingProfile || !profileChanged}
              >
                {savingProfile ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Save size={16} aria-hidden="true" />
                )}
                {savingProfile ? "Saving..." : "Save changes"}
              </Button>

              {profileChanged && !savingProfile && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#8b6a25",
                  }}
                >
                  Unsaved changes
                </span>
              )}
            </div>
          </form>

          {/* Password security */}
          <form
            className="panel padded"
            onSubmit={changePassword}
            style={cardStyle}
          >
            <div>
              <h2 style={headingStyle}>
                <LockKeyhole
                  size={21}
                  color="#176447"
                  aria-hidden="true"
                />
                Change password
              </h2>

              <p
                className="muted"
                style={{
                  margin: "8px 0 0",
                  fontSize: 13,
                  lineHeight: 1.7,
                }}
              >
                Use a strong, unique password to protect
                your IntelliLMS account.
              </p>
            </div>

            <label style={fieldStyle}>
              Current password

              <div
                style={{
                  position: "relative",
                  width: "100%",
                }}
              >
                <input
                  required
                  type={
                    showCurrentPassword ? "text" : "password"
                  }
                  autoComplete="current-password"
                  value={oldPassword}
                  disabled={changingPassword}
                  onChange={(event) => {
                    setOldPassword(event.target.value);
                    setPasswordFeedback(null);
                  }}
                  style={{
                    ...inputStyle,
                    paddingRight: 48,
                  }}
                />

                <button
                  type="button"
                  disabled={changingPassword}
                  aria-label={
                    showCurrentPassword
                      ? "Hide current password"
                      : "Show current password"
                  }
                  aria-pressed={showCurrentPassword}
                  onClick={() =>
                    setShowCurrentPassword((value) => !value)
                  }
                  style={{
                    position: "absolute",
                    right: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: 0,
                    borderRadius: 7,
                    background: "transparent",
                    color: "#60776a",
                    cursor: "pointer",
                  }}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <label style={fieldStyle}>
              New password

              <div
                style={{
                  position: "relative",
                  width: "100%",
                }}
              >
                <input
                  required
                  minLength={12}
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={changingPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordFeedback(null);
                  }}
                  style={{
                    ...inputStyle,
                    paddingRight: 48,
                  }}
                />

                <button
                  type="button"
                  disabled={changingPassword}
                  aria-label={
                    showNewPassword
                      ? "Hide new password"
                      : "Show new password"
                  }
                  aria-pressed={showNewPassword}
                  onClick={() =>
                    setShowNewPassword((value) => !value)
                  }
                  style={{
                    position: "absolute",
                    right: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 32,
                    height: 32,
                    padding: 0,
                    border: 0,
                    borderRadius: 7,
                    background: "transparent",
                    color: "#60776a",
                    cursor: "pointer",
                  }}
                >
                  {showNewPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                padding: "13px 15px",
                border: "1px solid #dce8df",
                borderRadius: 10,
                background: "#f8fbf8",
              }}
            >
              <KeyRound
                size={18}
                color="#176447"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <strong
                  style={{
                    fontSize: 13,
                    color: "#29483a",
                  }}
                >
                  Password requirements
                </strong>

                <span
                  className="muted"
                  style={{
                    fontSize: 12,
                    lineHeight: 1.7,
                  }}
                >
                  Use at least 12 characters. A longer
                  password or passphrase is recommended.
                  Avoid reusing passwords.
                </span>

                {newPassword.length > 0 && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color:
                        newPassword.length >= 12
                          ? "#176447"
                          : "#9a6b27",
                    }}
                  >
                    {newPassword.length >= 12 ? (
                      <>
                        <CheckCircle2
                          size={14}
                          aria-hidden="true"
                        />
                        Minimum length met
                      </>
                    ) : (
                      <>
                        <LockKeyhole
                          size={14}
                          aria-hidden="true"
                        />
                        {12 - newPassword.length} more
                        characters required
                      </>
                    )}
                  </span>
                )}
              </div>
            </div>

            <FeedbackMessage feedback={passwordFeedback} />

            {!!passwordError && (
              <ErrorState error={passwordError} />
            )}

            <div style={{ marginTop: "auto" }}>
              <Button
                type="submit"
                disabled={
                  changingPassword || !passwordValid
                }
              >
                {changingPassword ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ShieldCheck
                    size={16}
                    aria-hidden="true"
                  />
                )}
                {changingPassword
                  ? "Changing password..."
                  : "Change password"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}