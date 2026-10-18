import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../features/auth/Auth";
import { routeAllowed, requiresInstitute } from "../../lib/access";

export function WorkspaceRoute({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const { pathname } = useLocation();
  if (requiresInstitute(pathname) && !user?.institute_id)
    return (
      <section className="panel compact">
        <h1>Select an institute</h1>
        <p>Choose an active institute in the sidebar to open this workspace.</p>
      </section>
    );
  if (!routeAllowed(pathname, role, user?.institute_profile?.kind))
    return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}
