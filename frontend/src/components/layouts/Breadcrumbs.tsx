import { Link, useLocation } from "react-router-dom";
import { resources } from "../../features/resources/config";
import { useTerminology } from "../../lib/terminology";

const titles: Record<string, string> = {
  platform: "Platform overview",
  "platform-settings": "Platform settings",
  "institute-settings": "Institute settings",
  academics: "Academic structure",
  "institute-setup": "Institute setup",
  "academic-reviews": "Academic reviews",
  "student-admission": "Add Student",
  "student-placement": "Student placement",
  "teacher-appointments": "Teacher appointments",
  grades: "Gradebook",
  analytics: "Academic progress",
  predictions: "Learning insights",
  profile: "Profile & security",
  unauthorized: "Access unavailable",
};
export function Breadcrumbs() {
  const { pathname } = useLocation();
  const terms = useTerminology();
  const [resource, id] = pathname.split("/").filter(Boolean);
  const label = resources[resource]
    ? terms.title(resource, resources[resource].title)
    : titles[resource] || "Page not found";
  const parent =
    resource === "course"
      ? {
          path: "/offerings",
          label: terms.title("offerings", "My courses"),
          detail: "Course details",
        }
      : resource === "quiz-attempt"
        ? { path: "/quizzes", label: "Quizzes", detail: "Attempt" }
        : resource === "institutes" && id
          ? {
              path: "/institutes",
              label: "Institutes",
              detail: "Institute details",
            }
          : null;
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link to="/">Overview</Link>
      {resource && (
        <>
          <span aria-hidden="true">/</span>
          {parent ? (
            <>
              <Link to={parent.path}>{parent.label}</Link>
              <span aria-hidden="true">/</span>
              <b aria-current="page">{parent.detail}</b>
            </>
          ) : (
            <b aria-current="page">{label}</b>
          )}
        </>
      )}
    </nav>
  );
}
