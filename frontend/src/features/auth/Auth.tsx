import type { AcademicConfig } from "../../lib/institution";
import { ToastProvider } from "../../components/ToastProvider";
import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import { api, post, ApiError } from "../../lib/api";
import { Loading, ErrorState } from "../../components/Feedback";
export interface Membership {
  institute_id: string;
  institute__name: string;
  role: string;
  unit_id: string | null;
  can_teach?: boolean;
}
export interface User {
  academic_workspace?: "department" | "teaching";
  avatar_url?: string | null;
  notify_academic?: boolean;
  institute_profile?: {
    name: string;
    kind: string;
    academic_config?: AcademicConfig;
    terminology: Record<string, string>;
    grading_rules: Record<string, unknown>;
  } | null;
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_superuser: boolean;
  institute_id: string | null;
  memberships: Membership[];
}
interface AuthState {
  user: User | null;
  role: string;
  refresh: () => Promise<void>;
  select: (id: string) => Promise<void>;
  selectWorkspace: (workspace: "department" | "teaching") => Promise<void>;
}
const Context = createContext<AuthState | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      await api("auth/csrf/");
      try {
        return await api<User>("auth/me/");
      } catch (e) {
        if (e instanceof ApiError && [401, 403].includes(e.status)) return null;
        throw e;
      }
    },
    retry: false,
  });
  if (query.isPending) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} />;
  const user = query.data || null;
  const storedRole = user?.is_superuser
    ? "superadmin"
    : user?.memberships.find((m) => m.institute_id === user.institute_id)
        ?.role || "";
  const role = storedRole === "head" && user?.academic_workspace === "teaching" ? "teacher" : storedRole;
  async function switchContext(path: string, values: unknown) {
    const next = await post<User>(path, values);
    await queryClient.cancelQueries();
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "auth" });
    queryClient.setQueryData(["auth"], next);
  }
  return (
    <Context.Provider
      key={(user?.id || "anonymous") + ":" + (user?.institute_id || "none") + ":" + (user?.academic_workspace || "department")}
      value={{
        user,
        role,
        refresh: async () => {
          await queryClient.invalidateQueries({ queryKey: ["auth"] });
        },
        select: (id) => switchContext("auth/select-institute/", { institute_id: id }),
        selectWorkspace: (academic_workspace) => switchContext("auth/select-workspace/", { academic_workspace }),
      }}
    >
      <ToastProvider>{children}</ToastProvider>
    </Context.Provider>
  );
}
export function useAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
export function Protected({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  return user ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  );
}
