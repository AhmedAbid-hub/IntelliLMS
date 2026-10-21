import { lazy } from "react";
import { useParams } from "react-router-dom";
const UnknownResource = lazy(() =>
  import("../features/resources/ResourcePage").then((m) => ({
    default: m.ResourcePage,
  })),
);
// Each existing resource URL has a named page entry; forms and data loading stay shared.
export const resourceRoutes = {
  "platform-audit": lazy(() =>
    import("../pages/platform/PlatformAudit").then((m) => ({
      default: m.PlatformAudit,
    })),
  ),
  "platform-users": lazy(() =>
    import("../pages/platform/InstituteAdministrators").then((m) => ({
      default: m.InstituteAdministrators,
    })),
  ),
  institutes: lazy(() =>
    import("../pages/platform/ManageInstitutes").then((m) => ({
      default: m.ManageInstitutes,
    })),
  ),
  units: lazy(() =>
    import("../pages/academics/ManageDepartments").then((m) => ({
      default: m.ManageDepartments,
    })),
  ),
  years: lazy(() =>
    import("../pages/academics/AcademicYears").then((m) => ({
      default: m.AcademicYears,
    })),
  ),
  terms: lazy(() =>
    import("../pages/academics/AcademicTerms").then((m) => ({
      default: m.AcademicTerms,
    })),
  ),
  programs: lazy(() =>
    import("../pages/academics/ManagePrograms").then((m) => ({
      default: m.ManagePrograms,
    })),
  ),
  batches: lazy(() =>
    import("../pages/academics/AdmissionBatches").then((m) => ({
      default: m.AdmissionBatches,
    })),
  ),
  curriculum: lazy(() =>
    import("../pages/academics/Curriculum").then((m) => ({
      default: m.Curriculum,
    })),
  ),
  sections: lazy(() =>
    import("../pages/academics/ManageSections").then((m) => ({
      default: m.ManageSections,
    })),
  ),
  courses: lazy(() =>
    import("../pages/academics/CourseCatalog").then((m) => ({
      default: m.CourseCatalog,
    })),
  ),
  offerings: lazy(() =>
    import("../pages/academics/CourseOfferings").then((m) => ({
      default: m.CourseOfferings,
    })),
  ),
  memberships: lazy(() =>
    import("../pages/people/ManagePeople").then((m) => ({
      default: m.ManagePeople,
    })),
  ),
  enrollments: lazy(() =>
    import("../pages/academics/StudentEnrollments").then((m) => ({
      default: m.StudentEnrollments,
    })),
  ),
  modules: lazy(() =>
    import("../pages/learning/LearningModules").then((m) => ({
      default: m.LearningModules,
    })),
  ),
  lessons: lazy(() =>
    import("../pages/learning/Lessons").then((m) => ({ default: m.Lessons })),
  ),
  materials: lazy(() =>
    import("../pages/learning/LearningMaterials").then((m) => ({
      default: m.LearningMaterials,
    })),
  ),
  assignments: lazy(() =>
    import("../pages/assessments/Assignments").then((m) => ({
      default: m.Assignments,
    })),
  ),
  quizzes: lazy(() =>
    import("../pages/assessments/Quizzes").then((m) => ({
      default: m.Quizzes,
    })),
  ),
  questions: lazy(() =>
    import("../pages/assessments/QuizQuestions").then((m) => ({
      default: m.QuizQuestions,
    })),
  ),
  "manual-grades": lazy(() =>
    import("../pages/assessments/ManualGrades").then((m) => ({
      default: m.ManualGrades,
    })),
  ),
  "question-bank": lazy(() =>
    import("../pages/assessments/QuestionBank").then((m) => ({
      default: m.QuestionBank,
    })),
  ),
  submissions: lazy(() =>
    import("../pages/assessments/AssignmentSubmissions").then((m) => ({
      default: m.AssignmentSubmissions,
    })),
  ),
  attempts: lazy(() =>
    import("../pages/assessments/QuizAttempts").then((m) => ({
      default: m.QuizAttempts,
    })),
  ),
  "attendance-sessions": lazy(() =>
    import("../pages/learning/AttendanceManagement").then((m) => ({
      default: m.AttendanceManagement,
    })),
  ),
  attendance: lazy(() =>
    import("../pages/learning/AttendanceRecords").then((m) => ({
      default: m.AttendanceRecords,
    })),
  ),
  timetable: lazy(() =>
    import("../pages/academics/Timetable").then((m) => ({
      default: m.Timetable,
    })),
  ),
  announcements: lazy(() =>
    import("../pages/communication/Announcements").then((m) => ({
      default: m.Announcements,
    })),
  ),
  notifications: lazy(() =>
    import("../pages/communication/Notifications").then((m) => ({
      default: m.Notifications,
    })),
  ),
  audit: lazy(() =>
    import("../pages/institute/InstituteAudit").then((m) => ({
      default: m.InstituteAudit,
    })),
  ),
};
export function ResourceRoute() {
  const { resource = "" } = useParams();
  const Page =
    resourceRoutes[resource as keyof typeof resourceRoutes] ?? UnknownResource;
  return <Page />;
}
