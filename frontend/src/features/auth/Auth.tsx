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
}
export interface User {
  avatar_url?: string | null;
  notify_academic?: boolean;
  institute_profile?: {
    name: string;
    kind: string;
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
  const role = user?.is_superuser
    ? "superadmin"
    : user?.memberships.find((m) => m.institute_id === user.institute_id)
        ?.role || "";
  return (
    <Context.Provider
      key={(user?.id || "anonymous") + ":" + (user?.institute_id || "none")}
      value={{
        user,
        role,
        refresh: async () => {
          await queryClient.invalidateQueries({ queryKey: ["auth"] });
        },
        select: async (id) => {
          const next = await post<User>("auth/select-institute/", {
            institute_id: id,
          });
          await queryClient.cancelQueries();
          queryClient.setQueryData(["auth"], next);
          queryClient.removeQueries({
            predicate: (q) => q.queryKey[0] !== "auth",
          });
        },
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
