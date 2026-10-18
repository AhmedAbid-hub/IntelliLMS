
import { Link, useLocation } from "react-router-dom";
import {
  ChevronRight,
  Home,
  Building2,
  BookOpen,
  GraduationCap,
  ShieldCheck,
  LayoutDashboard,
} from "lucide-react";

import { resources } from "../../features/resources/config";
import { useTerminology } from "../../lib/terminology";
import { useAuth } from "../../features/auth/Auth";

const titles: Record<string, string> = {
  platform: "Platform overview",
  "platform-settings": "Platform settings",
  "institute-settings": "Institute settings",
  academics: "Academic structure",
  "departments-programs": "Departments & Programs",
  "institute-setup": "Guided setup",
  "academic-reviews": "Academic reviews",
  "student-admission": "Add student",
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
  const { user, role } = useAuth();
  const terms = useTerminology();

  const [resource, id] = pathname.split("/").filter(Boolean);

  const isSchool = user?.institute_profile?.kind === "school";
  const isSuperAdmin = role === "superadmin";

  const overviewPath = isSuperAdmin ? "/platform" : "/";

  const label =
    resource === "departments-programs" && isSchool
      ? "Classes & Grades"
      : resource && resources[resource]
        ? terms.title(resource, resources[resource].title)
        : titles[resource || ""] || "Page not found";

  const parent =
    resource === "course"
      ? {
          path: "/offerings",
          label: terms.title("offerings", "My courses"),
          detail: "Course details",
        }
      : resource === "quiz-attempt"
        ? {
            path: "/quizzes",
            label: "Quizzes",
            detail: "Attempt",
          }
        : resource === "institutes" && id
          ? {
              path: "/institutes",
              label: "Institutes",
              detail: "Institute details",
            }
          : resource === "units" || resource === "programs"
            ? {
                path: "/departments-programs",
                label: isSchool
                  ? "Classes & Grades"
                  : "Departments & Programs",
                detail: label,
              }
            : resource === "departments-programs"
              ? {
                  path: "/academics",
                  label: "Academic structure",
                  detail: label,
                }
              : null;

  const ActiveIcon =
    resource === "departments-programs" ||
    resource === "units" ||
    resource === "programs"
      ? Building2
      : resource === "course" || resource === "offerings"
        ? BookOpen
        : resource === "platform"
          ? LayoutDashboard
          : resource === "academic-reviews"
            ? ShieldCheck
            : GraduationCap;

  return (
    <nav className="breadcrumb premium-breadcrumb" aria-label="Breadcrumb">
      <Link
        to={overviewPath}
        className="breadcrumb-home"
        aria-label="Go to overview"
      >
        <Home size={15} aria-hidden="true" />
        <span>Overview</span>
      </Link>

      {resource && (
        <>
          <ChevronRight
            size={14}
            className="breadcrumb-separator"
            aria-hidden="true"
          />

          {parent && (
            <>
              <Link
                to={parent.path}
                className="breadcrumb-parent"
              >
                {parent.label}
              </Link>

              <ChevronRight
                size={14}
                className="breadcrumb-separator"
                aria-hidden="true"
              />
            </>
          )}

          <span className="breadcrumb-current" aria-current="page">
            <ActiveIcon size={15} aria-hidden="true" />
            <span>{parent ? parent.detail : label}</span>
          </span>
        </>
      )}
    </nav>
  );
}
