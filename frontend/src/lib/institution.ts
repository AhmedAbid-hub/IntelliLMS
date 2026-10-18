import { useAuth } from "../features/auth/Auth";

export interface AcademicConfig {
  departments: boolean;
  batches: boolean;
  structure: "annual" | "semester";
  default_duration: number;
  direct_teacher_assignment: boolean;
  legacy_type: boolean;
}
export function useInstitution() {
  const { user } = useAuth();
  const kind = user?.institute_profile?.kind;
  const config: AcademicConfig = user?.institute_profile?.academic_config ?? {
    departments: kind !== "school",
    batches: kind !== "school" && kind !== "college",
    structure: kind === "school" || kind === "college" ? "annual" : "semester",
    default_duration: kind === "school" ? 1 : kind === "college" ? 2 : 8,
    direct_teacher_assignment: kind === "school",
    legacy_type: kind === "other",
  };
  return { ...config, kind };
}
