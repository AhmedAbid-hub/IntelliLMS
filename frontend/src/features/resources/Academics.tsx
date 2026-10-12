import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Layers3,
  LayoutGrid,
  School,
  Sparkles,
} from "lucide-react";

import { PageHeader } from "../../components/shared";
import { resources } from "./config";
import { useTerminology } from "../../lib/terminology";

const groups = [
  {
    number: "01",
    title: "Departments & Programs",
    description:
      "Organize departments, faculties, and academic programs.",
    icon: Building2,
    resources: ["units", "programs"],
    accent: "departments",
    hint: "Academic foundation",
  },
  {
    number: "02",
    title: "Academic Years & Terms",
    description:
      "Manage academic years, semesters, and terms.",
    icon: CalendarDays,
    resources: ["years", "terms"],
    accent: "calendar",
    hint: "Academic calendar",
  },
  {
    number: "03",
    title: "Classes & Sections",
    description:
      "Organize admission batches, cohorts, and sections.",
    icon: GraduationCap,
    resources: ["batches", "sections"],
    accent: "classes",
    hint: "Student organization",
  },
  {
    number: "04",
    title: "Course Catalog",
    description:
      "Manage courses, subjects, and curriculum.",
    icon: BookOpen,
    resources: ["courses", "curriculum"],
    accent: "courses",
    hint: "Teaching foundation",
  },
] as const;

export function Academics() {
  const terms = useTerminology();

  return (
    <div className="academics-dashboard">
      <PageHeader
        title="Academic structure"
        description="Manage your institute's academic foundation, calendar, student organization, and curriculum."
      />

      {/* Motivational introduction — preserved */}

      <section className="academics-intro">
        <div className="academics-intro-content">
          <span className="academics-eyebrow">
            <School size={15} />
            ACADEMIC MANAGEMENT
          </span>

          <h2>
            Build a well-organized
            <span> academic institution.</span>
          </h2>

          <p>
            Everything starts with a clear academic
            structure. Configure your departments,
            programs, academic calendar, classes,
            and courses from one workspace.
          </p>

          <div className="academics-intro-actions">
            <Link
              className="academics-primary-link"
              to="/institute-setup"
            >
              <Sparkles size={17} />
              Open guided setup
              <ArrowRight size={17} />
            </Link>

            <span className="academics-intro-note">
              Your existing academic records are preserved.
            </span>
          </div>
        </div>

        <div
          className="academics-intro-art"
          aria-hidden="true"
        >
          <div className="academics-art-circle academics-art-circle-one" />
          <div className="academics-art-circle academics-art-circle-two" />

          <div className="academics-art-center">
            <School size={46} strokeWidth={1.5} />
          </div>

          <div className="academics-art-small academics-art-small-one">
            <BookOpen size={21} />
          </div>

          <div className="academics-art-small academics-art-small-two">
            <GraduationCap size={22} />
          </div>

          <div className="academics-art-small academics-art-small-three">
            <CalendarDays size={20} />
          </div>
        </div>
      </section>

      {/* Academic management — compact four-card layout */}

      <section
        className="academics-management"
        style={{ marginTop: 24 }}
      >
        <div
          className="academics-section-heading"
          style={{ marginBottom: 18 }}
        >
          <div>
            <span className="academics-section-label">
              MANAGE YOUR INSTITUTE
            </span>

            <h2>Academic management</h2>

            <p>
              Select an area to manage its academic records.
            </p>
          </div>

          <Link
            to="/institute-setup"
            className="academics-text-link"
          >
            Guided setup
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div
          className="academics-card-grid"
          style={{ gap: 18 }}
        >
          {groups.map((group) => (
            <section
              className={`academics-management-card academics-card-${group.accent}`}
              key={group.title}
              style={{
                padding: "22px 24px",
              }}
            >
              <div
                className="academics-card-top"
                style={{ marginBottom: 12 }}
              >
                <div className="academics-card-icon">
                  <group.icon
                    size={22}
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                </div>

                <span className="academics-card-number">
                  {group.number} / 04
                </span>
              </div>

              <div
                className="academics-card-content"
                style={{ marginBottom: 16 }}
              >
                <span className="academics-card-category">
                  {group.hint}
                </span>

                <h3>{group.title}</h3>

                <p>{group.description}</p>
              </div>

              <div className="academics-card-links">
                {group.resources.map((key) => {
                  const resource = resources[key];

                  return (
                    <Link
                      className="academics-resource-item"
                      to={`/${key}`}
                      key={key}
                    >
                      <div className="academics-resource-symbol">
                        {key === "units" ? (
                          <Building2 size={17} />
                        ) : key === "programs" ? (
                          <GraduationCap size={17} />
                        ) : key === "years" ? (
                          <CalendarDays size={17} />
                        ) : key === "terms" ? (
                          <Layers3 size={17} />
                        ) : key === "batches" ? (
                          <ClipboardList size={17} />
                        ) : key === "sections" ? (
                          <LayoutGrid size={17} />
                        ) : key === "courses" ? (
                          <BookOpen size={17} />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                      </div>

                      <div className="academics-resource-text">
                        <strong>
                          {terms.title(
                            key,
                            resource.title
                          )}
                        </strong>

                        <small>
                          {resource.description}
                        </small>
                      </div>

                      <ArrowUpRight
                        size={18}
                        className="academics-resource-arrow"
                        aria-hidden="true"
                      />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      {/* Next workflow — preserved */}

      <section className="academics-next">
        <div className="academics-next-icon">
          <BookOpen size={23} />
        </div>

        <div className="academics-next-content">
          <span>READY FOR THE NEXT STEP?</span>

          <h3>Move from structure to teaching</h3>

          <p>
            Once your academic structure is configured,
            organize course offerings, teaching assignments,
            and student enrollments.
          </p>
        </div>

        <Link
          to="/offerings"
          className="academics-next-button"
        >
          Courses & Enrollments
          <ArrowRight size={17} />
        </Link>
      </section>
    </div>
  );
}