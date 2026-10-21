import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { RelationSelect } from "../../../components/RelationSelect";
import { Pagination } from "../../../components/ReportControls";
import { ErrorState, Loading } from "../../../components/shared";
import { api, type Page, type RecordData } from "../../../lib/api";
import { useInstitution } from "../../../lib/institution";
import { useTerminology } from "../../../lib/terminology";

export type Placement = {
  program: string;
  batch: string;
  year: string;
  section: string;
  term: string;
  stage: string;
  offerings: string[];
};

export const empty: Placement = {
  program: "",
  batch: "",
  year: "",
  section: "",
  term: "",
  stage: "1",
  offerings: [],
};

export const placementPayload = (value: Placement) => ({
  stage: Number(value.stage),
  term: value.term || null,
  program: value.program,
  batch: value.batch || null,
  year: value.year,
  section: value.section || null,
  offerings: value.offerings,
});

export const fieldGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
  gap: "16px 20px",
  alignItems: "start",
} as const;

export const sectionHeadingStyle = {
  marginBottom: 8,
} as const;

export function PlacementFields({
  value,
  onChange,
}: {
  value: Placement;
  onChange: (value: Placement) => void;
}) {
  const terms = useTerminology();
  const institution = useInstitution();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const params = new URLSearchParams({
    program: value.program,
    year: value.year,
    stage: value.stage,
    page: String(page),
    search,
  });

  for (const key of ["batch", "section", "term"] as const) {
    if (value[key]) {
      params.set(key, value[key]);
    }
  }

  const choices = useQuery({
    queryKey: ["admission-suggestions", params.toString()],
    queryFn: () => api<Page<RecordData>>(`admissions/offerings/?${params}`),
    enabled: !!value.program && !!value.year,
  });

  const field = (key: keyof Omit<Placement, "offerings">, next: string) => {
    setPage(1);

    onChange({
      ...value,
      [key]: next,
      offerings: [],
      ...(key === "program" ? { batch: "", section: "" } : {}),
      ...(key === "batch" ? { section: "" } : {}),
      ...(key === "year" ? { term: "" } : {}),
    });
  };

  return (
    <>
      <div className="admission-fields" style={fieldGridStyle}>
        <RelationSelect
          label={terms.field("program", "Program / grade")}
          source="programs?active=true"
          value={value.program}
          onChange={(v) => field("program", String(v))}
          required
        />

        <RelationSelect
          label={terms.field("year", "Academic year")}
          source="years"
          value={value.year}
          onChange={(v) => field("year", String(v))}
          required
        />

        {institution.kind !== "school" && (
          <RelationSelect
            label="Admission batch (optional)"
            source={`batches?active=true${
              value.program ? `&program=${value.program}` : ""
            }`}
            value={value.batch}
            onChange={(v) => field("batch", String(v))}
          />
        )}

        <RelationSelect
          label={terms.field("section", "Class section (optional)")}
          source={`sections?active=true${
            value.program ? `&program=${value.program}` : ""
          }${value.batch ? `&batch=${value.batch}` : ""}`}
          value={value.section}
          onChange={(v) => field("section", String(v))}
        />
      </div>

      <div className="admission-fields" style={fieldGridStyle}>
        <RelationSelect
          label={terms.field("term", "Academic term (optional)")}
          source={`terms${value.year ? `?year=${value.year}` : ""}`}
          value={value.term}
          onChange={(v) => field("term", String(v))}
        />

        {institution.kind !== "school" && (
          <label>
            {institution.structure === "annual"
              ? "Study year number"
              : "Semester number"}
            <input
              type="number"
              min="1"
              max="40"
              value={value.stage}
              onChange={(e) => field("stage", e.target.value)}
            />
          </label>
        )}
      </div>

      <details
        className="admission-suggestions"
        style={{
          marginTop: 20,
          border: "1px solid #dce8df",
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Suggested course enrollments
          {value.offerings.length > 0
            ? ` (${value.offerings.length} selected)`
            : " (optional)"}
        </summary>

        <p className="muted">
          Suggestions follow the curriculum, selected academic stage, calendar
          and section. Select up to 100 offerings, or leave empty and enroll
          later. Changing placement clears these selections.
        </p>

        <label>
          Find suggested courses
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>

        <p>{value.offerings.length} selected</p>

        {!value.program || !value.year ? (
          <p>Select a program and academic year to see suggestions.</p>
        ) : choices.isPending ? (
          <Loading />
        ) : choices.isError ? (
          <ErrorState error={choices.error} />
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Offering</th>
                    <th>Curriculum</th>
                  </tr>
                </thead>

                <tbody>
                  {choices.data.results.map((row) => {
                    const offeringId = String(row.id);

                    return (
                      <tr key={offeringId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Enroll in ${row.title}`}
                            checked={value.offerings.includes(offeringId)}
                            disabled={
                              !value.offerings.includes(offeringId) &&
                              value.offerings.length >= 100
                            }
                            onChange={(e) =>
                              onChange({
                                ...value,
                                offerings: e.target.checked
                                  ? [...value.offerings, offeringId]
                                  : value.offerings.filter(
                                      (id) => id !== offeringId,
                                    ),
                              })
                            }
                          />
                        </td>
                        <td>{String(row.title)}</td>
                        <td>
                          {row.required_subject ? "Required" : "Elective"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!choices.data.count && (
              <p>
                No matching curriculum offerings. You can enroll later from
                Courses &amp; Enrollments.
              </p>
            )}

            <Pagination
              data={choices.data}
              page={page}
              onChange={setPage}
              label="Suggested courses"
            />
          </>
        )}
      </details>
    </>
  );
}
