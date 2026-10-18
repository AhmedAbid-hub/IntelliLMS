import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CalendarDays } from "lucide-react";
import { display, type RecordData } from "../../lib/api";

type CourseCardProps = {
  course: RecordData;
  index: number;
  actions?: ReactNode;
};

export function CourseCard({ course, index, actions }: CourseCardProps) {
  const archived = Boolean(course.archived);
  const title = display(course.title);
  const subject = display(course.course_label);
  const term = course.term_label ? display(course.term_label) : null;
  const section = course.section_label ? display(course.section_label) : null;

  return (
    <article className={`course-card-modern course-tone-${index % 3}`}>
      <div className="course-card-cover" style={{ minHeight: 0, padding: "15px 18px" }}>
        <div className="course-cover-top" style={{ alignItems: "center" }}>
          <span className="course-cover-icon" style={{ width: 38, height: 38 }}>
            <BookOpen size={19} aria-hidden="true" />
          </span>
          <span className={`course-state ${archived ? "is-archived" : "is-active"}`}>
            <span className="course-state-dot" />
            {archived ? "Archived" : "Active"}
          </span>
        </div>
        <div className="course-cover-bottom" style={{ marginTop: 12 }}>
          <span className="course-cover-label" style={{ fontSize: 14 }}>{subject}</span>
        </div>
      </div>

      <div className="course-card-content" style={{ padding: "16px 18px" }}>
        {(term || section) && (
          <div className="course-card-meta" style={{ flexWrap: "wrap", marginBottom: 9 }}>
            <CalendarDays size={15} aria-hidden="true" />
            {term && <span>{term}</span>}
            {term && section && <span aria-hidden="true">·</span>}
            {section && <span>{section}</span>}
          </div>
        )}
        <h3 className="course-card-title" style={{ margin: "0 0 12px", fontSize: 18 }}>
          <Link to={`/course/${course.id}`}>{title}</Link>
        </h3>
        <div className="course-card-footer" style={{ paddingTop: 10 }}>
          <Link to={`/course/${course.id}`} className="course-open-link">
            Open course <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {actions && <div className="course-card-actions">{actions}</div>}
      </div>
    </article>
  );
}
