
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Layers3,
  School,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { useAuth } from "../auth/Auth";
import { useTerminology } from "../../lib/terminology";

type AcademicLink = {
  label: string;
  path: string;
};

type AcademicGroup = {
  title: string;
  description: string;
  path: string;
  icon: typeof Building2;
  color: string;
  background: string;
  links: AcademicLink[];
};

export function Academics() {
  const { user } = useAuth();
  const terms = useTerminology();

  const kind = user?.institute_profile?.kind;
  const isSchool = kind === "school";
  const isCollege = kind === "college";

  const groups: AcademicGroup[] = [
    {
      title: isSchool
        ? "Classes & Grades"
        : "Departments & Programs",
      description: isSchool
        ? "Set up grade levels and school classes."
        : "Add departments and organize study programs.",
      path: "/departments-programs",
      icon: Building2,
      color: "#087b58",
      background: "#e7f5ed",
      links: isSchool
        ? [
            {
              label: terms.title("programs", "Grades"),
              path: "/programs",
            },
          ]
        : [
            {
              label: terms.title("units", "Departments"),
              path: "/units",
            },
            {
              label: terms.title("programs", "Programs"),
              path: "/programs",
            },
          ],
    },
    {
      title: "Academic Calendar",
      description: isSchool
        ? "Manage school years and teaching terms."
        : isCollege
          ? "Manage academic years and annual terms."
          : "Manage academic years and semesters.",
      path: "/years",
      icon: CalendarDays,
      color: "#2563b8",
      background: "#eaf2ff",
      links: [
        {
          label: terms.title("years", "Academic years"),
          path: "/years",
        },
        {
          label: terms.title(
            "terms",
            isCollege ? "Annual terms" : "Semesters"
          ),
          path: "/terms",
        },
      ],
    },
    {
      title: "Classes & Sections",
      description: isSchool
        ? "Organize class sections for your students."
        : "Organize student batches and class sections.",
      path: isSchool ? "/sections" : "/batches",
      icon: UsersRound,
      color: "#ad6b17",
      background: "#fff3df",
      links: [
        ...(!isSchool
          ? [
              {
                label: terms.title(
                  "batches",
                  "Admission batches"
                ),
                path: "/batches",
              },
            ]
          : []),
        {
          label: terms.title("sections", "Sections"),
          path: "/sections",
        },
      ],
    },
    {
      title: "Subjects & Curriculum",
      description:
        "Create subjects and organize what students learn.",
      path: "/courses",
      icon: BookOpen,
      color: "#8054bc",
      background: "#f2ebff",
      links: [
        {
          label: terms.title("courses", "Subjects"),
          path: "/courses",
        },
        {
          label: terms.title("curriculum", "Curriculum"),
          path: "/curriculum",
        },
      ],
    },
  ];

  return (
    <div
      className="academics-dashboard"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 28,
      }}
    >
      {/* Page heading */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 26,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              color: "#087b58",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.09em",
              marginBottom: 9,
            }}
          >
            <School size={15} />
            ACADEMIC MANAGEMENT
          </div>

          <h1
            style={{
              fontSize: "clamp(23px, 2.5vw, 30px)",
              lineHeight: 1.2,
              letterSpacing: "-0.035em",
              margin: 0,
              color: "#143e30",
              fontWeight: 800,
            }}
          >
            What would you like to manage?
          </h1>

          <p
            style={{
              color: "#72827b",
              fontSize: 14,
              lineHeight: 1.7,
              margin: "9px 0 0",
            }}
          >
            Choose an area below to organize your institute.
          </p>
        </div>

        <Link
          to="/institute-setup"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 15px",
            borderRadius: 11,
            background: "#e6f4ec",
            color: "#086d4e",
            fontSize: 13,
            fontWeight: 700,
            textDecoration: "none",
            border: "1px solid #d1e9d9",
          }}
        >
          <Sparkles size={16} />
          Guided setup
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Academic management rows */}

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e0eae3",
          borderRadius: 18,
          boxShadow: "0 5px 24px rgba(25, 62, 42, 0.035)",
          overflow: "hidden",
        }}
      >
        {groups.map((group, index) => {
          const Icon = group.icon;

          return (
            <div
              key={group.title}
              style={{
                borderBottom:
                  index === groups.length - 1
                    ? "none"
                    : "1px solid #edf1ed",
                padding: "19px 22px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Link
                  to={group.path}
                  aria-label={`Open ${group.title}`}
                  style={{
                    width: 52,
                    height: 52,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: group.background,
                    color: group.color,
                    borderRadius: 13,
                    textDecoration: "none",
                  }}
                >
                  <Icon size={23} strokeWidth={1.9} />
                </Link>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Link
                    to={group.path}
                    style={{
                      color: "#163e31",
                      fontSize: 16,
                      fontWeight: 750,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {group.title}
                    <ChevronRight
                      size={16}
                      color={group.color}
                    />
                  </Link>

                  <p
                    style={{
                      fontSize: 13,
                      color: "#72827b",
                      margin: "5px 0 0",
                      lineHeight: 1.6,
                    }}
                  >
                    {group.description}
                  </p>
                </div>

                <Link
                  to={group.path}
                  aria-label={`Manage ${group.title}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    borderRadius: 9,
                    background: "#f5f8f5",
                    color: "#587267",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={18} />
                </Link>
              </div>

              {/* Direct shortcuts to existing pages */}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 13,
                  marginLeft: 68,
                }}
              >
                {group.links.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "6px 11px",
                      borderRadius: 8,
                      background: "#f7f9f7",
                      border: "1px solid #e7ede8",
                      color: "#486357",
                      textDecoration: "none",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    {item.label}
                    <ChevronRight size={13} />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Course offerings shortcut */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 16,
          marginTop: 20,
          padding: "17px 20px",
          background: "#f0f7f2",
          border: "1px solid #dbeadf",
          borderRadius: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "#dcefe3",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#087b58",
            }}
          >
            <Layers3 size={20} />
          </div>

          <div>
            <strong
              style={{
                display: "block",
                fontSize: 14,
                color: "#184735",
              }}
            >
              Ready to start teaching?
            </strong>

            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "#688076",
                marginTop: 4,
              }}
            >
              Set up courses for the current academic term.
            </span>
          </div>
        </div>

        <Link
          to="/offerings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            color: "#086d4e",
            fontWeight: 750,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          Course offerings
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Bottom guidance */}

      <div
        style={{
          marginTop: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "#819188",
          fontSize: 12,
        }}
      >
        <GraduationCap size={16} />
        Your existing academic records are preserved.
      </div>
    </div>
  );
}
