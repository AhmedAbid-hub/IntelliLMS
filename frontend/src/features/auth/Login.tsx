import { usePlatformConfiguration } from "./PlatformSettings";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GraduationCap, ArrowRight, BookOpen, ShieldCheck } from "lucide-react";
import { post } from "../../lib/api";
import { useAuth } from "./Auth";
import { Button } from "../../components/ui/button";
import { ErrorState } from "../../components/shared";
export const loginSchema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});
export function Login() {
  const platform = usePlatformConfiguration();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="login-page">
      <section className="login-story">
        <div className="brand">
          <GraduationCap />
          {platform.data?.platform_name || "IntelliLMS"}
          <span>●</span>
        </div>
        <div>
          <p className="eyebrow">ONE CONNECTED CAMPUS</p>
          <h1>
            Make room
            <br />
            for what’s
            <br />
            <em>possible.</em>
          </h1>
          <p>Bring your teaching, learning, and academic community together.</p>
          <div className="story-cards">
            <div>
              <BookOpen />
              <span>
                Every course.
                <br />A clear path forward.
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                Your institute.
                <br />
                Your secure workspace.
              </span>
            </div>
          </div>
        </div>
        <small>Purposeful learning. Meaningful progress.</small>
      </section>
      <section className="login-form">
        <div className="login-box">
          <span className="pill">WELCOME BACK</span>
          <h2>
            Your next chapter
            <br />
            starts here.
          </h2>
          <p className="muted">Sign in to your academic workspace.</p>
          {platform.data?.login_notice && (
            <p className="info-strip">{platform.data.login_notice}</p>
          )}
          <form
            onSubmit={handleSubmit(async (data) => {
              try {
                setError(undefined);
                await post("auth/login/", data);
                await refresh();
                navigate("/");
              } catch (e) {
                setError(e);
              }
            })}
          >
            <label>
              Username
              <input
                autoComplete="username"
                {...register("username")}
                placeholder="Your institute username"
              />
            </label>
            {errors.username && (
              <small className="field-error">{errors.username.message}</small>
            )}
            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                {...register("password")}
                placeholder="Enter your password"
              />
            </label>
            {errors.password && (
              <small className="field-error">{errors.password.message}</small>
            )}
            {!!error && <ErrorState error={error} />}
            <Link className="text-link" to="/forgot-password">
              Forgot password?
            </Link>
            <Button disabled={isSubmitting} className="full-width">
              {isSubmitting ? "Signing in…" : "Sign in"}
              <ArrowRight size={17} />
            </Button>
          </form>
          {platform.data?.support_email && (
            <p className="muted">
              Support:{" "}
              <a
                className="text-link"
                href={`mailto:${platform.data.support_email}`}
              >
                {platform.data.support_email}
              </a>
            </p>
          )}
          <p className="login-note">
            Accounts are provided by your institute administrator.
          </p>
        </div>
      </section>
    </div>
  );
}
export function PasswordReset() {
  const { uid, token } = useParams();
  const [value, setValue] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>();
  return (
    <div className="center-page">
      <div className="panel compact">
        <h1>{token?.startsWith("i-") ? "Accept your invitation" : uid ? "Set a new password" : "Reset your password"}</h1>
        <p className="muted">
          {uid
            ? "Use at least 12 characters and avoid common passwords."
            : "We will send a reset link if your email matches an account."}
        </p>
        {done ? (
          <p role="status">
            {uid ? "Password saved." : "Check your email for a reset link. If it does not arrive, try again or contact your administrator."}{" "}
            <Link to="/login">Return to sign in</Link>
          </p>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await post(
                  uid ? "auth/password-confirm/" : "auth/password-reset/",
                  uid ? { uid, token, new_password: value } : { email: value },
                );
                setDone(true);
              } catch (err) {
                setError(err);
              }
            }}
          >
            <label>
              {uid ? "New password" : "Email"}
              <input
                required
                type={uid ? "password" : "email"}
                minLength={uid ? 12 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            {!!error && <><ErrorState error={error} /><p>{token?.startsWith("i-") ? "Ask your institute administrator to resend an expired invitation." : <Link to="/forgot-password">Request a new reset link</Link>}</p></>}
            <Button>Continue</Button>
          </form>
        )}
      </div>
    </div>
  );
}
