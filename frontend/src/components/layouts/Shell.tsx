import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/Auth";
import { usePlatformConfiguration } from "../../features/auth/PlatformSettings";
import { post } from "../../lib/api";
import { ErrorState } from "../shared";
import { Header } from "./Header";
import { getRoleLabel } from "./navigation";
import { Sidebar } from "./Sidebar";
import { WorkspaceRoute } from "./WorkspaceRoute";

export function Shell() {
  const platform = usePlatformConfiguration();

  const { user, role, select } = useAuth();

  const [mobile, setMobile] = useState(false);

  const navigationClose = useRef<HTMLButtonElement>(null);

  const navigationToggle = useRef<HTMLButtonElement>(null);

  const [signingOut, setSigningOut] = useState(false);

  const [error, setError] = useState<unknown>();

  const client = useQueryClient();

  const navigate = useNavigate();

  const location = useLocation();

  const isSuperAdmin = role === "superadmin";

  const displayName =
    [user?.first_name, user?.last_name]

      .filter(Boolean)

      .join(" ")

      .trim() ||
    user?.username ||
    "Workspace member";

  const roleLabel = getRoleLabel(role);

  const platformName = platform.data?.platform_name || "IntelliLMS";

  // --------------------------------------------------

  // Navigation lifecycle

  // --------------------------------------------------

  useEffect(() => {
    setMobile(false);

    setError(undefined);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobile) return;

    navigationClose.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobile(false);
      }
    };

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    document.addEventListener(
      "keydown",

      onKeyDown,
    );

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener(
        "keydown",

        onKeyDown,
      );

      navigationToggle.current?.focus();
    };
  }, [mobile]);

  // --------------------------------------------------

  // Institute selection

  // --------------------------------------------------

  const changeInstitute = async (id: string) => {
    if (!id || id === user?.institute_id) {
      return;
    }

    try {
      setError(undefined);

      await select(id);

      setMobile(false);

      navigate(isSuperAdmin ? "/platform" : "/");
    } catch (err) {
      setError(err);
    }
  };

  // --------------------------------------------------

  // Sign out

  // --------------------------------------------------

  const signOut = async () => {
    if (signingOut) return;

    setSigningOut(true);

    setError(undefined);

    try {
      await post("auth/logout/");

      await client.cancelQueries();

      client.setQueryData(["auth"], null);

      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      });

      setMobile(false);

      navigate("/login");
    } catch (err) {
      setError(err);

      setSigningOut(false);
    }
  };

  // --------------------------------------------------

  // Dynamic navigation labels

  // --------------------------------------------------

  // --------------------------------------------------

  // Render

  // --------------------------------------------------

  return (
    <div className="app-shell">
      {/* Mobile navigation backdrop */}

      {mobile && (
        <button
          type="button"

          className="sidebar-backdrop"

          aria-label="Close navigation"

          onClick={() => setMobile(false)}
        />
      )}

      {/* Sidebar */}

      <Sidebar
        mobile={mobile}
        setMobile={setMobile}
        navigationClose={navigationClose}
        platformName={platformName}
        user={user}
        role={role}
        changeInstitute={changeInstitute}
        signOut={signOut}
        signingOut={signingOut}
      />

      {/* Main application area */}

      <div className="main-shell">
        {/* Top navigation bar */}

        <Header
          isSuperAdmin={isSuperAdmin}
          mobile={mobile}
          setMobile={setMobile}
          navigationToggle={navigationToggle}
          user={user}
          displayName={displayName}
          roleLabel={roleLabel}
        />

        {/* Page content */}

        <main>
          {!!error && <ErrorState error={error} />}

          <WorkspaceRoute>
            <Outlet />
          </WorkspaceRoute>
        </main>

        {/* Footer */}

        <footer className="app-footer">
          <strong>IntelliLMS</strong>

          <span>
            {isSuperAdmin ? "Platform administration" : "Learning, connected."}
          </span>

          <span>
            {isSuperAdmin ? "System management" : "Academic workspace"}
          </span>
        </footer>
      </div>
    </div>
  );
}

export { navItems } from "./navigation";
