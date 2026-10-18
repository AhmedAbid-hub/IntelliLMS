import { type Page } from "../lib/api";
import { useTerminology } from "../lib/terminology";
import { useInstitution } from "../lib/institution";
import { Button } from "./ui/button";
import { RelationSelect } from "./RelationSelect";

export function Pagination({
  data,
  page,
  onChange,
  label = "Results",
}: {
  data?: Page<unknown>;
  page: number;
  onChange: (page: number) => void;
  label?: string;
}) {
  if (!data) return null;

  return (
    <nav className="panel-heading" aria-label={`${label} pagination`}>
      <span>{data.count} results · Page {page}</span>
      <div className="heading-actions">
        <Button variant="outline" disabled={!data.previous} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" disabled={!data.next} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
}

export function ReportFilters({
  value,
  onChange,
  showSearch = true,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  showSearch?: boolean;
}) {
  const terms = useTerminology();
  const institution = useInstitution();
  const update = (key: string, next: string) => onChange({ ...value, [key]: next,
    ...(key === "year" ? {term: "", offering: ""} : {}),
    ...(key === "unit" ? {program: "", batch: "", section: "", course: "", offering: ""} : {}),
    ...(key === "program" ? {batch: "", section: "", offering: ""} : {}),
    ...(key === "batch" ? {section: "", offering: ""} : {}),
  });
  const fields = ["year", ...(institution.departments ? ["unit"] : []), "program",
    ...(institution.batches ? ["batch"] : []), ...(institution.kind !== "school" ? ["term"] : []), "section", "course", "offering"];
  const source = (key: string) => {
    const filters: Record<string, string> = {};
    if (["sections", "batches"].includes(`${key}s`) && value.program) filters.program = value.program;
    if (key === "section" && value.batch) filters.batch = value.batch;
    if (key === "term" && value.year) filters.year = value.year;
    if (["program", "course"].includes(key) && value.unit) filters.unit = value.unit;
    return `${key === "batch" ? "batches" : `${key}s`}?${new URLSearchParams(filters)}`;
  };

  return (
    <>
      <style>{`
        .report-filters {
          display: grid !important;
          grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
          gap: 16px !important;
          align-items: start !important;
          padding: 16px 18px !important;
          overflow: visible !important;
          position: relative;
          z-index: 2;
        }
        .report-filters .report-filter-field {
          min-width: 0;
          margin: 0 !important;
          padding: 0 !important;
          position: relative;
        }
        .report-filters label.report-filter-field {
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
        }
        .report-filters .report-filter-label,
        .report-filters .report-filter-relation .relation-modern-label {
          box-sizing: border-box !important;
          display: flex !important;
          align-items: center !important;
          width: 100% !important;
          height: 20px !important;
          min-height: 20px !important;
          max-height: 20px !important;
          margin: 0 0 8px !important;
          padding: 0 !important;
          font-size: 12px !important;
          font-weight: 650 !important;
          line-height: 20px !important;
        }
        .report-filters .report-filter-relation .relation-select {
          position: relative;
          display: flex !important;
          flex-direction: column !important;
          gap: 0 !important;
          width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }
        .report-filters .relation-modern-trigger,
        .report-filters label.report-filter-field > select,
        .report-filters label.report-filter-field > input {
          box-sizing: border-box !important;
          width: 100% !important;
          height: 56px !important;
          min-height: 56px !important;
          max-height: 56px !important;
          margin: 0 !important;
          border-radius: 12px !important;
        }
        .report-filters label.report-filter-field > input,
        .report-filters label.report-filter-field > select {
          display: block !important;
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .report-filters .report-filter-relation button.relation-modern-trigger {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 12px !important;
          padding: 0 16px !important;
          text-align: left !important;
          line-height: normal !important;
        }
        .report-filters .relation-modern-trigger > span {
          display: block !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          text-overflow: ellipsis !important;
        }
        .report-filters .relation-modern-trigger > svg {
          position: static !important;
          transform: none !important;
          display: block !important;
          flex: 0 0 18px !important;
          width: 18px !important;
          height: 18px !important;
          margin: 0 !important;
        }
        .report-filters .relation-native-select {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          min-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .report-filters .report-filter-relation:focus-within { z-index: 3; }
        @media (max-width: 1100px) {
          .report-filters { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 600px) {
          .report-filters { grid-template-columns: minmax(0, 1fr) !important; }
        }
      `}</style>
      <div className="panel settings-grid report-filters">
        {showSearch && <label className="report-filter-field">
          <span className="report-filter-label">Search learner or course</span>
          <input
            type="search"
            value={value.search || ""}
            onChange={(event) => update("search", event.target.value)}
          />
        </label>}
        {fields.map((key) => (
          <div className="report-filter-field report-filter-relation" key={key}>
            <RelationSelect
              source={source(key)}
              label={key === "batch" ? "Admission batch" : terms.label(key)}
              value={value[key] || ""}
              onChange={(next) => update(key, String(next))}
              emptyLabel="All"
              compact
            />
          </div>
        ))}
        {institution.kind === "college" && <label className="report-filter-field">
          <span className="report-filter-label">Study year number</span>
          <input type="number" min="1" max="40" value={value.stage || ""} onChange={event => update("stage", event.target.value)} />
        </label>}
        <label className="report-filter-field">
          <span className="report-filter-label">Course status</span>
          <select value={value.archived || ""} onChange={(event) => update("archived", event.target.value)}>
            <option value="">All courses</option>
            <option value="false">Active courses</option>
            <option value="true">Archived courses</option>
          </select>
        </label>
      </div>
    </>
  );
}

export function reportParams(filters: Record<string, string>, page?: number) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value !== ""),
  );
  if (page) params.set("page", String(page));
  return params.toString();
}
