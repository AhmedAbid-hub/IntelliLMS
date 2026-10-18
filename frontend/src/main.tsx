
import { PlatformSettings } from "./features/auth/PlatformSettings";
import { Platform } from "./features/analytics/Platform";
import { InstituteSettings } from "./features/auth/InstituteSettings";

import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
} from "react-router-dom";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  AuthProvider,
  Protected,
  useAuth,
} from "./features/auth/Auth";

import {
  Login,
  PasswordReset,
} from "./features/auth/Login";

import { Profile } from "./features/auth/Profile";
import { Shell } from "./components/layouts/Shell";
import { Loading } from "./components/shared";

import { AcademicHistory } from "./features/analytics/AcademicHistory";

import {
  StudentAdmission,
  StudentPlacement,
} from "./features/resources/StudentAdmission";

import { AcademicReviews } from "./features/resources/AcademicControl";
import { InstituteSetup } from "./features/resources/InstituteSetup";
import { Academics } from "./features/resources/Academics";

// New academic organization page
import { DepartmentsPrograms } from "./features/resources/DepartmentsPrograms";

import { TeacherAppointments } from "./features/resources/TeacherAppointments";

import "./styles.css";

// --------------------------------------------------
// Lazy-loaded analytics pages
// --------------------------------------------------

const Trends = lazy(() =>
  import("./features/analytics/Trends").then((m) => ({
    default: m.Trends,
  }))
);

const Dashboard = lazy(() =>
  import("./features/analytics/Dashboard").then((m) => ({
    default: m.Dashboard,
  }))
);

const Gradebook = lazy(() =>
  import("./features/analytics/Dashboard").then((m) => ({
    default: m.Gradebook,
  }))
);

const Predictions = lazy(() =>
  import("./features/analytics/Predictions").then((m) => ({
    default: m.Predictions,
  }))
);

// --------------------------------------------------
// Lazy-loaded resource pages
// --------------------------------------------------

const ResourcePage = lazy(() =>
  import("./features/resources/ResourcePage").then((m) => ({
    default: m.ResourcePage,
  }))
);

// --------------------------------------------------
// Lazy-loaded course and quiz pages
// --------------------------------------------------

const CourseDetail = lazy(() =>
  import("./features/courses/CourseDetail").then((m) => ({
    default: m.CourseDetail,
  }))
);

const QuizAttempt = lazy(() =>
  import("./features/quizzes/QuizAttempt").then((m) => ({
    default: m.QuizAttempt,
  }))
);

// --------------------------------------------------
// Workspace homepage
// --------------------------------------------------

function WorkspaceHome() {
  const { role } = useAuth();

  return role === "superadmin"
    ? <Platform />
    : <Dashboard />;
}

// --------------------------------------------------
// React Query configuration
// --------------------------------------------------

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false,
    },
  },
});

// --------------------------------------------------
// Application
// --------------------------------------------------

ReactDOM.createRoot(
  document.getElementById("root")!
).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>

              {/* Public authentication routes */}

              <Route
                path="/login"
                element={<Login />}
              />

              <Route
                path="/forgot-password"
                element={<PasswordReset />}
              />

              <Route
                path="/reset/:uid/:token"
                element={<PasswordReset />}
              />

              {/* Protected workspace */}

              <Route
                element={
                  <Protected>
                    <Shell />
                  </Protected>
                }
              >

                {/* Dashboard */}

                <Route
                  index
                  element={<WorkspaceHome />}
                />

                {/* Platform administration */}

                <Route
                  path="platform"
                  element={<Platform />}
                />

                <Route
                  path="platform-settings"
                  element={<PlatformSettings />}
                />

                <Route
                  path="institutes/:id"
                  element={<Platform />}
                />

                {/* Institute administration */}

                <Route
                  path="institute-settings"
                  element={<InstituteSettings />}
                />

                {/* Student admission and placement */}

                <Route
                  path="student-admission"
                  element={<StudentAdmission />}
                />

                <Route
                  path="student-placement/:id"
                  element={<StudentPlacement />}
                />

                {/* Academic history and corrections */}

                <Route
                  path="academic-history"
                  element={<AcademicHistory />}
                />

                <Route
                  path="academic-reviews"
                  element={<AcademicReviews />}
                />

                {/* Academic structure */}

                <Route
                  path="institute-setup"
                  element={<InstituteSetup />}
                />

                <Route
                  path="academics"
                  element={<Academics />}
                />

                {/* New Departments & Programs page */}

                <Route
                  path="departments-programs"
                  element={<DepartmentsPrograms />}
                />

                {/* Teacher appointments */}

                <Route
                  path="teacher-appointments"
                  element={<TeacherAppointments />}
                />

                {/* Course workspace */}

                <Route
                  path="course/:id"
                  element={<CourseDetail />}
                />

                {/* Grades and analytics */}

                <Route
                  path="grades"
                  element={<Gradebook />}
                />

                <Route
                  path="analytics"
                  element={<Trends />}
                />

                <Route
                  path="predictions"
                  element={<Predictions />}
                />

                {/* Profile */}

                <Route
                  path="profile"
                  element={<Profile />}
                />

                {/* Quiz attempts */}

                <Route
                  path="quiz-attempt/:id"
                  element={<QuizAttempt />}
                />

                {/* Generic resource pages */}

                <Route
                  path=":resource"
                  element={<ResourcePage />}
                />

                {/* Unauthorized page */}

                <Route
                  path="unauthorized"
                  element={
                    <div className="panel compact">
                      <h1>Access unavailable</h1>
                      <p>
                        Your current institute role cannot
                        open this page.
                      </p>

                      <Link
                        className="text-link"
                        to="/"
                      >
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
                      <p>
                        This address does not match
                        a workspace page.
                      </p>

                      <Link
                        className="text-link"
                        to="/"
                      >
                        Return to overview
                      </Link>
                    </div>
                  }
                />

              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
