
import { useAuth } from "../auth/Auth";
import { RelationSelect } from "../../components/RelationSelect";
import { useTerminology } from "../../lib/terminology";

type Filter = {
  key: string;
  label: string;
  choices?: [string, string][];
  source?: string;
};

const status: Filter = {
  key: "active",
  label: "Active status",
  choices: [
    ["true", "Active"],
    ["false", "Inactive"],
  ],
};

const fields: Record<string, Filter[]> = {
  curriculum: [
    {
      key: "program",
      label: "Program / grade",
      source: "programs",
    },
    {
      key: "course",
      label: "Subject",
      source: "courses",
    },
    status,
  ],

  batches: [
    {
      key: "program",
      label: "Program / grade",
      source: "programs",
    },
    {
      key: "year",
      label: "Entry academic year",
      source: "years",
    },
    status,
  ],

  sections: [
    {
      key: "program",
      label: "Program / grade",
      source: "programs",
    },
    {
      key: "batch",
      label: "Admission batch",
      source: "batches",
    },
    status,
  ],

  programs: [status],

  courses: [status],

  "platform-audit": [
    {
      key: "action_flag",
      label: "Action",
      choices: [
        ["1", "Addition"],
        ["2", "Change"],
        ["3", "Deletion"],
      ],
    },
    {
      key: "content_type__model",
      label: "Record type",
      choices: [
        ["user", "Account"],
        ["platformconfiguration", "Platform configuration"],
      ],
    },
  ],

  memberships: [
    {
      key: "role",
      label: "Role",
      choices: [
        ["admin", "Institute admin"],
        ["head", "Department head"],
        ["teacher", "Teacher"],
        ["student", "Student"],
      ],
    },
    status,
    {
      key: "unit",
      label: "Academic unit",
      source: "units",
    },
  ],

  "platform-users": [
    {
      ...status,
      key: "is_active",
    },
  ],

  offerings: [
    {
      key: "term",
      label: "Academic term",
      source: "terms",
    },
    {
      key: "archived",
      label: "Course status",
      choices: [
        ["false", "Active"],
        ["true", "Archived"],
      ],
    },
  ],

  enrollments: [status],

  assignments: [
    {
      key: "published",
      label: "Publication",
      choices: [
        ["true", "Published"],
        ["false", "Draft"],
      ],
    },
  ],

  quizzes: [
    {
      key: "offering",
      label: "Course",
      source: "offerings",
    },
    {
      key: "released",
      label: "Release status",
      choices: [
        ["true", "Released"],
        ["false", "Not released"],
      ],
    },
  ],

  announcements: [
    {
      key: "published",
      label: "Publication",
      choices: [
        ["true", "Published"],
        ["false", "Draft"],
      ],
    },
  ],

  timetable: [
    {
      key: "day",
      label: "Day",
      choices: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ].map(
        (day, index): [string, string] => [
          String(index),
          day,
        ],
      ),
    },
  ],
};

/*
 * Shared resource filter layout.
 *
 * One filter: half-width on desktop.
 * Two filters: two equal columns.
 * Three or more: three balanced columns.
 * Mobile: full-width stacked filters.
 */
const resourceFilterLayoutCss = `
  .resource-filters--balanced {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    column-gap: 24px;
    row-gap: 20px;
  }

  .resource-filters--balanced > * {
    min-width: 0;
  }

  .resource-filters--balanced > label {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    padding: 0;
  }

  .resource-filters--balanced > label > select {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
  }

  .resource-filters--balanced.resource-filters--many {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 1000px) {
    .resource-filters--balanced.resource-filters--many {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 768px) {
    .resource-filters--balanced,
    .resource-filters--balanced.resource-filters--many {
      grid-template-columns: minmax(0, 1fr);
      column-gap: 0;
    }
  }
`;

/*
 * Preserve the working My Courses alignment.
 *
 * RelationSelect uses a custom dropdown, while
 * Course Status uses a native select.
 *
 * Both controls receive matching dimensions.
 */
const offeringAlignmentCss = `
  .resource-filters--offerings {
    align-items: start;
  }

  .resource-filters--offerings > .offering-filter-field {
    min-width: 0;
    margin: 0;
    padding: 0;
  }

  .resource-filters--offerings
  > .offering-filter-field--native {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .resource-filters--offerings .offering-filter-label,
  .resource-filters--offerings .relation-modern-label {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 24px;
    min-height: 24px;
    margin: 0 0 8px !important;
    padding: 0;
    line-height: 24px;
  }

  .resource-filters--offerings .relation-select {
    display: flex;
    flex-direction: column;
    gap: 0 !important;
    margin: 0;
    padding: 0;
    min-width: 0;
    width: 100%;
  }

  .resource-filters--offerings .relation-select > label,
  .resource-filters--offerings
  .relation-select > .relation-modern-label {
    margin-top: 0 !important;
    margin-bottom: 8px !important;
  }

  .resource-filters--offerings .relation-modern-trigger,
  .resource-filters--offerings
  .offering-filter-native-select {
    box-sizing: border-box;
    width: 100%;
    height: 60px;
    min-height: 60px;
    margin: 0 !important;
    border-radius: 14px;
  }

  .resource-filters--offerings
  .offering-filter-native-select {
    display: block;
  }
`;

/*
 * Quiz filter alignment.
 *
 * Uses the same geometry as My Courses without
 * affecting the shared RelationSelect component.
 */
const quizAlignmentCss = `
  .resource-filters--quizzes {
    align-items: start;
  }

  .resource-filters--quizzes > .quiz-filter-field {
    min-width: 0;
    margin: 0;
    padding: 0;
  }

  .resource-filters--quizzes
  > .quiz-filter-field--native {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .resource-filters--quizzes .quiz-filter-label,
  .resource-filters--quizzes .relation-modern-label {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 24px;
    min-height: 24px;
    margin: 0 0 8px !important;
    padding: 0;
    line-height: 24px;
  }

  .resource-filters--quizzes .relation-select {
    display: flex;
    flex-direction: column;
    gap: 0 !important;
    margin: 0;
    padding: 0;
    min-width: 0;
    width: 100%;
  }

  .resource-filters--quizzes .relation-select > label,
  .resource-filters--quizzes
  .relation-select > .relation-modern-label {
    margin-top: 0 !important;
    margin-bottom: 8px !important;
  }

  .resource-filters--quizzes .relation-modern-trigger,
  .resource-filters--quizzes
  .quiz-filter-native-select {
    box-sizing: border-box;
    width: 100%;
    height: 60px;
    min-height: 60px;
    margin: 0 !important;
    border-radius: 14px;
  }

  .resource-filters--quizzes
  .quiz-filter-native-select {
    display: block;
  }
`;

export function ResourceFilters({
  resource,
  value,
  onChange,
}: {
  resource: string;
  value: URLSearchParams;
  onChange: (key: string, value: string) => void;
}) {
  const terms = useTerminology();
  const { role } = useAuth();

  const filters = (fields[resource] || []).filter(
    (field) =>
      !(
        resource === "memberships" &&
        role === "superadmin" &&
        field.key !== "active"
      ),
  );

  if (!filters.length) {
    return null;
  }

  const isOfferings = resource === "offerings";
  const isQuizzes = resource === "quizzes";
  const hasManyFilters = filters.length >= 3;

  const containerClassName = [
    "settings-grid",
    "resource-filters",
    "resource-filters--balanced",
    isOfferings ? "resource-filters--offerings" : "",
    isQuizzes ? "resource-filters--quizzes" : "",
    hasManyFilters ? "resource-filters--many" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style>{resourceFilterLayoutCss}</style>

      {isOfferings && (
        <style>{offeringAlignmentCss}</style>
      )}

      {isQuizzes && (
        <style>{quizAlignmentCss}</style>
      )}

      <div className={containerClassName}>
        {filters.map((field) => {
          const isSpecial = isOfferings || isQuizzes;

          const wrapperClass = isOfferings
            ? "offering-filter-field"
            : isQuizzes
              ? "quiz-filter-field"
              : undefined;

          const nativeClass = isOfferings
            ? "offering-filter-native-select"
            : isQuizzes
              ? "quiz-filter-native-select"
              : undefined;

          const labelClass = isOfferings
            ? "offering-filter-label"
            : isQuizzes
              ? "quiz-filter-label"
              : undefined;

          if (field.source) {
            return (
              <div
                key={field.key}
                className={wrapperClass}
              >
                <RelationSelect
                  source={field.source}
                  label={`Filter ${terms.field(
                    field.key,
                    field.label,
                  )}`}
                  value={value.get(field.key) || ""}
                  onChange={(next) =>
                    onChange(field.key, String(next))
                  }
                  emptyLabel="All"
                  compact
                />
              </div>
            );
          }

          return (
            <label
              key={field.key}
              className={
                isSpecial
                  ? `${wrapperClass} ${wrapperClass}--native`
                  : undefined
              }
            >
              {isSpecial ? (
                <span className={labelClass}>
                  Filter{" "}
                  {terms.field(
                    field.key,
                    field.label,
                  )}
                </span>
              ) : (
                <>
                  Filter{" "}
                  {terms.field(
                    field.key,
                    field.label,
                  )}
                </>
              )}

              <select
                className={nativeClass}
                value={value.get(field.key) || ""}
                onChange={(event) =>
                  onChange(
                    field.key,
                    event.target.value,
                  )
                }
              >
                <option value="">All</option>

                {(field.choices || []).map(
                  ([key, text]) => (
                    <option
                      value={key}
                      key={key}
                    >
                      {text}
                    </option>
                  ),
                )}
              </select>
            </label>
          );
        })}
      </div>
    </>
  );
}
