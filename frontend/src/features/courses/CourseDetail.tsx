import { useId, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api, type RecordData } from "../../lib/api";
import { ResourcePage } from "../resources/ResourcePage";
import { useAuth } from "../auth/Auth";
import { Loading, ErrorState } from "../../components/shared";
import { Gradebook } from "../analytics/Dashboard";
import { Trends } from "../analytics/Trends";
import { Predictions } from "../analytics/Predictions";
import { LearnerProgress } from "../analytics/LearnerProgress";
import { BulkEnrollment } from "./BulkEnrollment";
import { Button } from "../../components/ui/button";
export function CourseDetail() {
  const { id } = useParams();
  const { role } = useAuth();
  const [tab, setTab] = useState(role === "student" ? "lessons" : "overview");
  const [creating, setCreating] = useState(false);
  const tabsId = useId();
  const tabs = [
    ...(role !== "student" ? ["overview"] : []),
    "lessons",
    "materials",
    "assignments",
    "quizzes",
    "modules",
    "progress",
    ...(role !== "student" ? ["enrollments", "attendance-sessions", "grades", "performance", "insights"] : []),
  ];
  const titles: Record<string, string> = { overview: "Overview", enrollments: "Students", "attendance-sessions": "Attendance", grades: "Grades", performance: "Class performance", insights: "AI insights", progress: role === "student" ? "My progress" : "Learner progress" };
  const course = useQuery({
    queryKey: ["course", id],
    queryFn: () => api<RecordData>(`offerings/${id}/`),
  });
  if (course.isPending) return <Loading />;
  if (course.isError) return <ErrorState error={course.error} />;
  return (
    <>
      <Link className="text-link" to="/offerings">
        ← {role === "head" ? "Department courses" : role === "admin" ? "Institute courses" : "My courses"}
      </Link>
      <div className="course-banner">
        <span className="eyebrow">{String(course.data.term_label)}</span>
        <h1>{String(course.data.title)}</h1>
        <p>{role === "student" ? "Your course materials, assignments and quizzes." : role === "teacher" ? "Teaching, assessment and class progress in one workspace." : "Academic oversight. Use Academic reviews for independent corrections."}</p>
      </div>
      <div className="tabs" role="tablist" aria-label="Course content">
        {tabs.map((key, index) => (
          <button
            role="tab"
            aria-selected={tab === key}
            id={`${tabsId}-${key}`}
            aria-controls={`${tabsId}-panel`}
            tabIndex={tab === key ? 0 : -1}
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => { setCreating(false); setTab(key); }}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index - 1 + tabs.length) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next === null) return;
              event.preventDefault();
              setCreating(false);
              setTab(tabs[next]);
              document.getElementById(`${tabsId}-${tabs[next]}`)?.focus();
            }}
          >
            {titles[key] || key.charAt(0).toUpperCase() + key.slice(1)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" ? <section className="panel padded">
          <h2>Course overview</h2>
          <p>{String(course.data.course_label)} · {String(course.data.term_label)}{course.data.section_label ? ` · ${course.data.section_label}` : ""}</p>
          <p className="info-strip">{course.data.archived ? "Archived course: academic history is available; teaching changes are disabled." : "Active course"} · Assessment weights: assignments {String(course.data.assignment_weight)}%, quizzes {String(course.data.quiz_weight)}%, manual assessments {String(course.data.manual_weight)}%.</p>
          {role === "teacher" && !course.data.archived && <div className="row-actions">{[["lessons", "Add lesson"], ["assignments", "Create assignment"], ["quizzes", "Create quiz"], ["attendance-sessions", "Record attendance"]].map(([target, label]) => <Button key={target} onClick={() => { setCreating(true); setTab(target); }}>{label}</Button>)}</div>}
          <div className="row-actions">{[["lessons", "Lessons & materials"], ["assignments", "Assignments & submissions"], ["quizzes", "Quiz authoring"], ["attendance-sessions", "Record attendance"], ["grades", "Review grades"], ["performance", "View class performance"]].map(([target, label]) => <Button key={target} variant="outline" onClick={() => setTab(target)}>{label}</Button>)}</div>
          {["admin", "head", "superadmin"].includes(role) && !course.data.archived && <BulkEnrollment offering={course.data} />}
        </section> : tab === "progress" ? <LearnerProgress offering={id!} /> : tab === "grades" ? <Gradebook offering={id} /> : tab === "performance" ? <Trends offering={id} /> : tab === "insights" ? <Predictions offering={id} /> : <ResourcePage key={tab} resource={tab} offering={id} initialCreate={creating} />}
      </div>
    </>
  );
}
