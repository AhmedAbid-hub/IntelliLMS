import { useAuth } from "../features/auth/Auth";
export const academicTerms = [
  "unit",
  "year",
  "term",
  "program",
  "section",
  "course",
  "offering",
] as const;
const defaults: Record<string, [string, string]> = {
  unit: ["Academic unit", "Academic units"],
  year: ["Academic year", "Academic years"],
  term: ["Term", "Terms"],
  program: ["Program", "Programs"],
  section: ["Class section", "Class sections"],
  course: ["Course", "Courses"],
  offering: ["Course offering", "Course offerings"],
};
export function terminologyPreset(kind: string): Record<string, string> {
  const pairs = { ...defaults, ...(kind === "school" ? {
    unit: ["Subject area", "Subject areas"], program: ["Grade level", "Grade levels"],
    section: ["Class", "Classes"], course: ["Subject", "Subjects"], offering: ["Subject class", "Subject classes"],
  } : kind === "college" ? {
    unit: ["Department", "Departments"], program: ["Program", "Programs"], term: ["Term", "Terms"],
  } : { unit: ["Department", "Departments"], term: ["Semester", "Semesters"] }) };
  return Object.fromEntries(Object.entries(pairs).flatMap(([key, pair]) => [[key, pair[0]], [key + "_plural", pair[1]]]));
}
const keys: Record<string, string> = {
  units: "unit",
  years: "year",
  terms: "term",
  programs: "program",
  sections: "section",
  courses: "course",
  offerings: "offering",
};
export function termLabel(
  labels: Record<string, string>,
  key: string,
  plural = false,
) {
  return (
    labels[key + (plural ? "_plural" : "")] ||
    (plural && labels[key]
      ? `${labels[key]}s`
      : defaults[key]?.[plural ? 1 : 0]) ||
    key.replaceAll("_", " ")
  );
}
export function useTerminology() {
  const { user } = useAuth();
  const labels = user?.institute_profile?.terminology || {};
  return {
    label: (key: string, plural = false) => termLabel(labels, key, plural),
    title: (resource: string, fallback: string) =>
      keys[resource] &&
      (labels[keys[resource]] || labels[keys[resource] + "_plural"])
        ? termLabel(labels, keys[resource], true)
        : fallback,
    field: (key: string, fallback: string) =>
      labels[key] ? termLabel(labels, key) : fallback,
    column: (key: string) => termLabel(labels, key.replace("_label", "")),
  };
}
