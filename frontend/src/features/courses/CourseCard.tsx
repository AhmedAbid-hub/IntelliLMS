
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
} from "lucide-react";
import { display, type RecordData } from "../../lib/api";

type CourseCardProps = {
  course: RecordData;
  index: number;
  actions?: ReactNode;
};

export function CourseCard({
  course,
  index,
  actions,
}: CourseCardProps) {
  const archived = Boolean(course.archived);

  const title = display(course.title);
  const subject = display(course.course_label);
  const term = display(course.term_label);

  const section = course.section_label
    ? display(course.section_label)
    : null;

  return (
    <article
      className={`course-card-modern course-tone-${index % 3}`}
    >
      <div className="course-card-cover">
        <div className="course-cover-top">
          <span className="course-cover-icon">
            <BookOpen size={25} aria-hidden="true" />
          </span>

          <span
            className={`course-state ${
              archived ? "is-archived" : "is-active"
            }`}
          >
            <span className="course-state-dot" />
            {archived ? "Archived" : "Active"}
          </span>
        </div>

        <div className="course-cover-bottom">
          <span className="course-cover-label">
            {subject}
          </span>

          <GraduationCap
            className="course-cover-watermark"
            size={108}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="course-card-content">
        <div className="course-card-meta">
          <CalendarDays size={15} aria-hidden="true" />
          <span>{term}</span>

          {section && (
            <>
              <span aria-hidden="true">·</span>
              <span>{section}</span>
            </>
          )}
        </div>

        <h3 className="course-card-title">
          <Link to={`/course/${course.id}`}>
            {title}
          </Link>
        </h3>

        <p className="course-card-description">
          {archived
            ? "View course content and academic history."
            : "Access lessons, assessments, and course activities."}
        </p>

        <div className="course-card-footer">
          <Link
            to={`/course/${course.id}`}
            className="course-open-link"
          >
            Open course
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>

        {actions && (
          <div className="course-card-actions">
            {actions}
          </div>
        )}
      </div>
    </article>
  );
}
