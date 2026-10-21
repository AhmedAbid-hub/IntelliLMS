import { PlatformDashboard as Platform } from "../features/analytics/PlatformDashboard";
import { InstituteSettings } from "../features/auth/InstituteSettings";
import { PlatformSettings } from "../features/auth/PlatformSettings";
import { StudentPlacement } from "../features/resources/StudentPlacement";

import { lazy } from "react";

import { Link, Route, Routes } from "react-router-dom";

import { Protected, useAuth } from "../features/auth/Auth";

import { Login, PasswordReset } from "../features/auth/Login";

import { Shell } from "../components/layouts/Shell";
import { Profile } from "../features/auth/Profile";

import { AcademicHistory } from "../features/analytics/AcademicHistory";

import { StudentAdmission } from "../features/resources/StudentAdmission";

import { Academics } from "../features/resources/Academics";
import { AcademicReviews } from "../features/resources/corrections/AcademicReviews";
import { InstituteSetup } from "../features/resources/InstituteSetup";

// New academic organization page
import { DepartmentsPrograms } from "../features/resources/DepartmentsPrograms";

import { TeacherAppointments } from "../features/resources/TeacherAppointments";

const Trends = lazy(() =>
  import("../features/analytics/Trends").then((m) => ({
    default: m.Trends,
  })),
);

const Dashboard = lazy(() =>
  import("../features/analytics/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);

const Gradebook = lazy(() =>
  import("../features/analytics/Gradebook").then((m) => ({
    default: m.Gradebook,
  })),
);

const Predictions = lazy(() =>
  import("../features/analytics/Predictions").then((m) => ({
    default: m.Predictions,
  })),
);

// --------------------------------------------------
// Lazy-loaded resource pages
// --------------------------------------------------

const ResourceRoute = lazy(() =>
  import("./resourceRoutes").then((m) => ({
    default: m.ResourceRoute,
  })),
);

// --------------------------------------------------
// Lazy-loaded course and quiz pages
// --------------------------------------------------

const CourseDetail = lazy(() =>
  import("../features/courses/CourseWorkspace").then((m) => ({
    default: m.CourseWorkspace,
  })),
);

const QuizAttempt = lazy(() =>
  import("../features/quizzes/QuizAttempt").then((m) => ({
    default: m.QuizAttempt,
  })),
);

// --------------------------------------------------
// Workspace homepage
// --------------------------------------------------

function WorkspaceHome() {
  const { role } = useAuth();

  return role === "superadmin" ? <Platform /> : <Dashboard />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public authentication routes */}

      <Route path="/login" element={<Login />} />

      <Route path="/forgot-password" element={<PasswordReset />} />

      <Route path="/reset/:uid/:token" element={<PasswordReset />} />

      {/* Protected workspace */}

      <Route
        element={
          <Protected>
            <Shell />
          </Protected>
        }
      >
        {/* Dashboard */}

        <Route index element={<WorkspaceHome />} />

        {/* Platform administration */}

        <Route path="platform" element={<Platform />} />

        <Route path="platform-settings" element={<PlatformSettings />} />

        <Route path="institutes/:id" element={<Platform />} />

        {/* Institute administration */}

        <Route path="institute-settings" element={<InstituteSettings />} />

        {/* Student admission and placement */}

        <Route path="student-admission" element={<StudentAdmission />} />

        <Route path="student-placement/:id" element={<StudentPlacement />} />

        {/* Academic history and corrections */}

        <Route path="academic-history" element={<AcademicHistory />} />

        <Route path="academic-reviews" element={<AcademicReviews />} />

        {/* Academic structure */}

        <Route path="institute-setup" element={<InstituteSetup />} />

        <Route path="academics" element={<Academics />} />

        {/* New Departments & Programs page */}

        <Route path="departments-programs" element={<DepartmentsPrograms />} />

        {/* Teacher appointments */}

        <Route path="teacher-appointments" element={<TeacherAppointments />} />

        {/* Course workspace */}

        <Route path="course/:id" element={<CourseDetail />} />

        {/* Grades and analytics */}

        <Route path="grades" element={<Gradebook />} />

        <Route path="analytics" element={<Trends />} />

        <Route path="predictions" element={<Predictions />} />

        {/* Profile */}

        <Route path="profile" element={<Profile />} />

        {/* Quiz attempts */}

        <Route path="quiz-attempt/:id" element={<QuizAttempt />} />

        {/* Generic resource pages */}

        <Route path=":resource" element={<ResourceRoute />} />

        {/* Unauthorized page */}

        <Route
          path="unauthorized"
          element={
            <div className="panel compact">
              <h1>Access unavailable</h1>
              <p>Your current institute role cannot open this page.</p>

              <Link className="text-link" to="/">
                Return to overview
              </Link>
            </div>
          }
        />

        {/* Unknown routes */}

        <Route
          path="*"
          element={
            <div className="panel compact">
              <h1>Page not found</h1>
              <p>This address does not match a workspace page.</p>

              <Link className="text-link" to="/">
                Return to overview
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
