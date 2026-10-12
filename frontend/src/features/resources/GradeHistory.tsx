import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Page, type RecordData } from "../../lib/api";
import { Dialog } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { ErrorState, Loading, Empty } from "../../components/shared";

export function GradeHistory({
  resource,
  id,
}: {
  resource: string;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["grade-history", resource, id, page],
    queryFn: () =>
      api<Page<RecordData>>(`${resource}/${id}/grade-history/?page=${page}`),
    enabled: open,
  });
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Grade history
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Grade history">
        <p className="muted">
          Authorized staff can review saved grades and release changes.
        </p>
        {query.isPending ? (
          <Loading />
        ) : query.isError ? (
          <ErrorState error={query.error} />
        ) : (
          <>
            {!query.data.count ? (
              <Empty>No grade changes recorded.</Empty>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>When / who</th>
                      <th>Previous marks</th>
                      <th>Saved marks</th>
                      <th>Released</th>
                      <th>Action / reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.results.map((row) => {
                      const detail = row.detail as {
                        previous_marks?: string;
                        previous?: { marks: string } | null;
                        marks?: string;
                        released?: boolean;
                        reason?: string;
                      };
                      return (
                        <tr key={row.id}>
                          <td>
                            {new Date(String(row.created_at)).toLocaleString()}
                            <br />
                            {String(row.actor)}
                          </td>
                          <td>
                            {detail.previous_marks &&
                            detail.previous_marks !== "None"
                              ? detail.previous_marks
                              : detail.previous?.marks || "—"}
                          </td>
                          <td>
                            {detail.marks === "None"
                              ? "Pending"
                              : detail.marks || "—"}
                          </td>
                          <td>{detail.released === undefined ? "—" : detail.released ? "Yes" : "No"}</td>
                          <td>{String(row.action)}<br/>{detail.reason || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="form-footer">
              <Button
                variant="outline"
                disabled={!query.data.previous}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span>Page {page}</span>
              <Button
                variant="outline"
                disabled={!query.data.next}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
