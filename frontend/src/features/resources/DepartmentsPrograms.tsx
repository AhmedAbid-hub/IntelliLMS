
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  GraduationCap,
  Layers3,
  Sparkles,
} from "lucide-react";

import { resources } from "./config";
import { useInstitution } from "../../lib/institution";
import { useTerminology } from "../../lib/terminology";

export function DepartmentsPrograms() {
  const institution = useInstitution();
  const terms = useTerminology();

  const hasDepartments = institution.departments;

  const items = [
    ...(hasDepartments
      ? [
          {
            key: "units" as const,
            icon: Building2,
            description:
              "Create and manage departments, faculties, and academic units.",
            color: "#167052",
            background: "#E7F4EC",
            border: "#CDE8D7",
            accent: "#1B8060",
          },
        ]
      : []),
    {
      key: "programs" as const,
      icon: GraduationCap,
      description: hasDepartments
        ? "Organize academic programs and connect them to departments."
        : "Organize school classes and grade levels.",
      color: "#3F6695",
      background: "#EAF0F9",
      border: "#D5E2F2",
      accent: "#537CA9",
    },
  ];

  return (
    <div
      className="academics-dashboard"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 40,
      }}
    >
      {/* Premium page header */}

      <header
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "34px 36px",
          borderRadius: 22,
          background:
            "linear-gradient(115deg, #123D32 0%, #19533F 60%, #24664C 100%)",
          boxShadow:
            "0 12px 30px rgba(18, 61, 50, 0.13)",
        }}
      >
        {/* Decorative accent */}

        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 230,
            height: 230,
            right: -65,
            top: -125,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.13)",
            boxShadow:
              "0 0 0 36px rgba(255,255,255,0.025), 0 0 0 75px rgba(255,255,255,0.025)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 17,
              color: "#E4C38D",
              fontSize: 11,
              fontWeight: 750,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <Sparkles size={15} aria-hidden="true" />
            Academic Management
          </div>

          <h1
            style={{
              margin: 0,
              color: "#FFFFFF",
              fontSize: "clamp(26px, 3vw, 36px)",
              fontWeight: 780,
              letterSpacing: "-0.035em",
              lineHeight: 1.2,
            }}
          >
            {hasDepartments
              ? "Departments & Programs"
              : "Classes & Grades"}
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 560,
              color: "#D4E6DC",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {hasDepartments
              ? "Build and organize your institution's academic structure in one place."
              : "Organize your school's classes and grade levels in one place."}
          </p>

          <div
            style={{
              width: 46,
              height: 3,
              marginTop: 23,
              borderRadius: 10,
              background: "#D6B277",
            }}
          />
        </div>
      </header>

      {/* Section introduction */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          marginTop: 31,
          marginBottom: 15,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 35,
            height: 35,
            borderRadius: 10,
            background: "#E7EEE8",
            color: "#176447",
          }}
        >
          <Layers3 size={18} aria-hidden="true" />
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              color: "#173D30",
              fontSize: 17,
              fontWeight: 750,
            }}
          >
            Manage academic structure
          </h2>

          <p
            style={{
              margin: "3px 0 0",
              color: "#77867C",
              fontSize: 12,
            }}
          >
            Select a section to view or manage its records.
          </p>
        </div>
      </div>

      {/* Management rows */}

      <section
        aria-label="Academic organization"
        style={{
          background: "#FFFFFF",
          border: "1px solid #E0E7DF",
          borderRadius: 18,
          overflow: "hidden",
          boxShadow:
            "0 8px 28px rgba(24, 57, 40, 0.055)",
        }}
      >
        {items.map((item, index) => {
          const Icon = item.icon;

          const title = terms.title(
            item.key,
            resources[item.key].title
          );

          return (
            <Link
              key={item.key}
              to={`/${item.key}`}
              aria-label={`Manage ${title}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                padding: "24px",
                textDecoration: "none",
                color: "inherit",
                borderBottom:
                  index < items.length - 1
                    ? "1px solid #E8EDE8"
                    : "none",
                borderLeft: `3px solid ${item.accent}`,
                transition:
                  "background-color 0.18s ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor =
                  "#F8FAF8";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor =
                  "#FFFFFF";
              }}
            >
              {/* Colored icon */}

              <div
                style={{
                  width: 58,
                  height: 58,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 15,
                  color: item.color,
                  background: item.background,
                  border: `1px solid ${item.border}`,
                }}
              >
                <Icon
                  size={26}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </div>

              {/* Content */}

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    color: "#173D30",
                    fontSize: 18,
                    fontWeight: 750,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#75847B",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {item.description}
                </p>
              </div>

              {/* Arrow */}

              <div
                style={{
                  width: 38,
                  height: 38,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 11,
                  background: item.background,
                  color: item.color,
                  border: `1px solid ${item.border}`,
                }}
              >
                <ArrowRight
                  size={19}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
            </Link>
          );
        })}
      </section>

      {/* Back navigation */}

      <Link
        to="/academics"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          marginTop: 25,
          padding: "10px 0",
          color: "#176447",
          fontSize: 13,
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        <ArrowLeft
          size={17}
          strokeWidth={2}
          aria-hidden="true"
        />
        Back to Academic Management
      </Link>
    </div>
  );
}
