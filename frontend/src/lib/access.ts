export const administrators = ["superadmin", "admin"];
export const staff = [...administrators, "head", "teacher"];
const routeRoles: Record<string, string[]> = {
  platform: ["superadmin"],
  "platform-settings": ["superadmin"],
  "platform-users": ["superadmin"],
  "platform-audit": ["superadmin"],
  institutes: ["superadmin"],
  academics: administrators,
  "institute-setup": ["admin"],
  "academic-reviews": ["admin","head","teacher"],
  "student-admission": ["admin"],
  "student-placement": ["admin"],
  "institute-settings": administrators,
  audit: administrators,
  memberships: staff,
  "teacher-appointments": ["admin", "head"],
  "question-bank": staff,
  predictions: staff,
  "quiz-attempt": ["superadmin", "student"],
};
export function routeAllowed(path: string, role: string) {
  const resource = path.split("/").filter(Boolean)[0] || "";
  if (role === "superadmin") return ["", "platform", "platform-settings", "platform-users", "platform-audit", "institutes", "memberships", "profile", "notifications", "unauthorized"].includes(resource);
  return !routeRoles[resource] || routeRoles[resource].includes(role);
}
export function requiresInstitute(path: string) {
  const resource = path.split("/").filter(Boolean)[0] || "";
  return ![
    "",
    "profile",
    "platform",
    "platform-settings",
    "platform-users",
    "platform-audit",
    "institutes",
    "unauthorized",
  ].includes(resource);
}
