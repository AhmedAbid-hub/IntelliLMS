import { PlatformSettings } from "./features/auth/PlatformSettings";
import { Platform } from "./features/analytics/Platform";
import { InstituteSettings } from "./features/auth/InstituteSettings";
import React, { lazy, Suspense } from "react";
import { Loading } from "./components/shared";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, Protected, useAuth } from "./features/auth/Auth";
import { Login, PasswordReset } from "./features/auth/Login";
import { Profile } from "./features/auth/Profile";
import { Shell } from "./components/layouts/Shell";
const Trends = lazy(() =>
  import("./features/analytics/Trends").then((m) => ({ default: m.Trends })),
);
const Dashboard = lazy(() =>
  import("./features/analytics/Dashboard").then((m) => ({
    default: m.Dashboard,
  })),
);
const Gradebook = lazy(() =>
  import("./features/analytics/Dashboard").then((m) => ({
    default: m.Gradebook,
  })),
);
const Predictions = lazy(() =>
  import("./features/analytics/Predictions").then((m) => ({
    default: m.Predictions,
  })),
);
const ResourcePage = lazy(() =>
  import("./features/resources/ResourcePage").then((m) => ({
    default: m.ResourcePage,
  })),
);
import { StudentAdmission, StudentPlacement } from "./features/resources/StudentAdmission";
import { AcademicReviews } from "./features/resources/AcademicControl";
import { InstituteSetup } from "./features/resources/InstituteSetup";
import { Academics } from "./features/resources/Academics";
import { TeacherAppointments } from "./features/resources/TeacherAppointments";
const CourseDetail = lazy(() =>
  import("./features/courses/CourseDetail").then((m) => ({
    default: m.CourseDetail,
  })),
);
const QuizAttempt = lazy(() =>
  import("./features/quizzes/QuizAttempt").then((m) => ({
    default: m.QuizAttempt,
  })),
);
import "./styles.css";
function WorkspaceHome() {
  const { role } = useAuth();
  return role === "superadmin" ? <Platform /> : <Dashboard />;
}
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15000, refetchOnWindowFocus: false },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<PasswordReset />} />
              <Route path="/reset/:uid/:token" element={<PasswordReset />} />
              <Route
                element={
                  <Protected>
                    <Shell />
                  </Protected>
                }
              >
                <Route index element={<WorkspaceHome />} />
                <Route path="platform" element={<Platform />} />
                <Route
                  path="platform-settings"
                  element={<PlatformSettings />}
                />
                <Route path="institutes/:id" element={<Platform />} />
                <Route
                  path="institute-settings"
                  element={<InstituteSettings />}
                />
                <Route path="student-admission" element={<StudentAdmission />} />
                <Route path="student-placement/:id" element={<StudentPlacement />} />
                <Route path="academic-reviews" element={<AcademicReviews/>}/>
                <Route path="institute-setup" element={<InstituteSetup />} />
                <Route path="academics" element={<Academics />} />
                <Route path="teacher-appointments" element={<TeacherAppointments />} />
                <Route path="course/:id" element={<CourseDetail />} />
                <Route path="grades" element={<Gradebook />} />
                <Route path="analytics" element={<Trends />} />
                <Route path="predictions" element={<Predictions />} />
                <Route path="profile" element={<Profile />} />
                <Route path="quiz-attempt/:id" element={<QuizAttempt />} />
                <Route path=":resource" element={<ResourcePage />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
