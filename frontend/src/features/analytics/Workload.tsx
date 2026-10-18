
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";

import { api, type Page } from "../../lib/api";
import { Pagination } from "../../components/ReportControls";
import {
  Loading,
  ErrorState,
  Empty,
} from "../../components/shared";

type WorkloadRow = {
  id: string;
  teacher: string;
  courses: number;
  learners: number;
};

export function Workload({ filters = {} }: { filters?: Record<string, string> } = {}) {
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(filters.archived || "");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "")),
    search,
    page: String(page),
  });

  if (archived) {
    params.set("archived", archived);
  }

  const query = useQuery({
    queryKey: ["instructor-workload", params.toString()],
    queryFn: () =>
      api<Page<WorkloadRow>>(
        `analytics/workload/?${params.toString()}`
      ),
  });

  return (
    <section className="panel workload-panel">
      <div className="panel-heading workload-heading">
        <div>
          <h2>Instructor workload</h2>
          <p className="muted">
            Assigned courses and distinct enrolled learners
            for instructors in your academic scope.
          </p>
        </div>
      </div>

      <div className="workload-filters">
        <label className="workload-filter">
          <span>
            <Search size={15} aria-hidden="true" />
            Search instructor
          </span>

          <input
            type="search"
            placeholder="Search by instructor name"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </label>

        <label className="workload-filter">
          <span>
            <SlidersHorizontal
              size={15}
              aria-hidden="true"
            />
            Workload course status
          </span>

          <select
            value={archived}
            disabled={Boolean(filters.archived)}
            onChange={(event) => {
              setArchived(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All courses</option>
            <option value="false">Active courses</option>
            <option value="true">Archived courses</option>
          </select>
        </label>
      </div>

      {query.isPending ? (
        <div className="workload-state">
          <Loading />
        </div>
      ) : query.isError ? (
        <div className="workload-state">
          <ErrorState error={query.error} />
        </div>
      ) : (
        <>
          {!query.data.results.length ? (
            <div className="workload-state">
              <Empty>
                No instructors match these filters.
              </Empty>
            </div>
          ) : (
            <div className="table-scroll workload-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Instructor</th>
                    <th scope="col">
                      Assigned courses
                    </th>
                    <th scope="col">
                      Distinct learners
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {query.data.results.map((row) => (
                    <tr key={row.id}>
                      <td className="primary-cell">
                        {row.teacher}
                      </td>
                      <td>{row.courses}</td>
                      <td>{row.learners}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="workload-pagination">
            <Pagination
              data={query.data}
              page={page}
              onChange={setPage}
              label="Instructor workload"
            />
          </div>
        </>
      )}
    </section>
  );
}
