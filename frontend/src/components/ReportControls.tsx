
import { type Page } from "../lib/api";
import { useTerminology } from "../lib/terminology";
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
    <nav
      className="panel-heading"
      aria-label={`${label} pagination`}
    >
      <span>
        {data.count} results · Page {page}
      </span>

      <div className="heading-actions">
        <Button
          variant="outline"
          disabled={!data.previous}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>

        <Button
          variant="outline"
          disabled={!data.next}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

export function ReportFilters({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
}) {
  const terms = useTerminology();

  const update = (key: string, next: string) => {
    onChange({
      ...value,
      [key]: next,
    });
  };

  return (
    <>
      <style>
        {`
          .report-filters {
            align-items: start;
          }

          .report-filters .report-filter-field {
            min-width: 0;
            margin: 0;
            padding: 0;
          }

          .report-filters label.report-filter-field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .report-filters .report-filter-label {
            display: flex;
            align-items: center;
            height: 20px;
            min-height: 20px;
            margin: 0;
            padding: 0;
            font-size: 12px;
            font-weight: 650;
            line-height: 20px;
          }

          .report-filters .report-filter-relation
          .relation-select {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 100%;
            min-width: 0;
            position: relative;
          }

          .report-filters .report-filter-relation
          .relation-modern-label {
            display: flex;
            align-items: center;
            height: 20px !important;
            min-height: 20px !important;
            margin: 0 0 8px !important;
            padding: 0 !important;
            line-height: 20px !important;
          }

          .report-filters .report-filter-relation
          .relation-modern-trigger,
          .report-filters label.report-filter-field > select,
          .report-filters label.report-filter-field > input {
            box-sizing: border-box;
            width: 100%;
            height: 56px;
            min-height: 56px;
            margin: 0 !important;
            border-radius: 12px;
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

          .report-filters .relation-modern-popover {
            z-index: 50;
          }

          @media (max-width: 768px) {
            .report-filters {
              grid-template-columns: minmax(0, 1fr);
            }
          }
        `}
      </style>

      <div className="panel settings-grid report-filters">
        <label className="report-filter-field">
          <span className="report-filter-label">
            Search learner or course
          </span>

          <input
            type="search"
            value={value.search || ""}
            onChange={(event) =>
              update("search", event.target.value)
            }
          />
        </label>

        {(["unit", "term"] as const).map((key) => (
          <div
            className="report-filter-field report-filter-relation"
            key={key}
          >
            <RelationSelect
              source={key === "unit" ? "units" : "terms"}
              label={terms.field(
                key,
                key === "unit"
                  ? "Department"
                  : "Academic term",
              )}
              value={value[key] || ""}
              onChange={(next) =>
                update(key, String(next))
              }
              emptyLabel="All"
              compact
            />
          </div>
        ))}

        <label className="report-filter-field">
          <span className="report-filter-label">
            Course status
          </span>

          <select
            value={value.archived || ""}
            onChange={(event) =>
              update("archived", event.target.value)
            }
          >
            <option value="">All courses</option>
            <option value="false">Active courses</option>
            <option value="true">Archived courses</option>
          </select>
        </label>
      </div>
    </>
  );
}

export function reportParams(
  filters: Record<string, string>,
  page?: number,
) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(
      ([, value]) => value !== "",
    ),
  );

  if (page) {
    params.set("page", String(page));
  }

  return params.toString();
}
