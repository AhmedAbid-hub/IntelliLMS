import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
export function ImportPeople() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<
    { line: number; username: string; detail: string }[]
  >([]);
  const [preview, setPreview] = useState<{ username: string; role: string; student_identifier: string; display_name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  function download() {
    const csv =
      "line,username,detail\n" +
      errors
        .map((e) =>
          [e.line, e.username, e.detail]
            .map(
              (x) =>
                '"' +
                (/^[=+@\-\t\r]/.test(String(x))
                  ? "'" + String(x)
                  : String(x)
                ).replaceAll('"', '""') +
                '"',
            )
            .join(","),
        )
        .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function submit(previewOnly: boolean) {
    if (!file) return;
    setBusy(true); setMessage(""); setErrors([]); setPreview([]);
    try {
      const form = new FormData(); form.append("file", file); form.append("preview", String(previewOnly));
      const token = document.cookie.split("; ").find(x => x.startsWith("csrftoken="))?.split("=")[1] || "";
      const response = await fetch("/api/v1/memberships/import-csv/", { method: "POST", credentials: "same-origin", headers: { "X-CSRFToken": decodeURIComponent(token) }, body: form });
      const data = await response.json();
      setErrors(data.errors || []); setPreview(data.preview || []);
      setMessage(response.ok ? previewOnly ? `${data.would_create} valid accounts ready to import. No accounts or invitations have been created.` : `${data.created} accounts created. If an invitation does not arrive, use Forgot password or contact your administrator.` : data.detail || "Import failed. Review the errors below.");
      if (response.ok && !previewOnly) await client.invalidateQueries();
    } catch { setMessage("The server could not be reached."); }
    finally { setBusy(false); }
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Import CSV
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Import teachers or students"
      >
        <p className="muted">
          UTF-8 CSV, up to 500 rows. Required headers: username,email,role.
          Optional: first_name,unit (exact unit name),display_name,student_identifier,section (section ID, whose program must match the department). Roles: student or
          teacher. Every row must validate before any accounts are created.
          Invitations use your configured email backend.
        </p>
        <a className="text-link" href="/api/v1/memberships/import-template/" download>Download student/staff template</a>
        <form onSubmit={e => { e.preventDefault(); void submit(false); }}>
          <label>
            CSV file
            <input
              type="file"
              required
              accept=".csv"
              onChange={(e) => { setFile(e.target.files?.[0]); setPreview([]); setErrors([]); setMessage(""); }}
            />
          </label>
          <Button type="button" variant="outline" disabled={busy || !file} onClick={() => submit(true)}>Preview import</Button>
          <Button disabled={busy || !file}>
            {busy ? "Importing…" : "Import accounts"}
          </Button>
        </form>
        <p role="status" className="info-strip">
          {message || "Existing accounts will not be changed."}
        </p>
        {preview.length > 0 && <div className="table-wrap"><p>Showing the first {Math.min(preview.length, 20)} of {preview.length} validated rows. Import validates every row again.</p><table><thead><tr><th>Username</th><th>Role</th><th>Display name</th><th>Student ID</th></tr></thead><tbody>{preview.slice(0, 20).map(row => <tr key={row.username}><td>{row.username}</td><td>{row.role}</td><td>{row.display_name || "—"}</td><td>{row.student_identifier || "—"}</td></tr>)}</tbody></table></div>}
        {errors.length > 0 && (
          <>
            <Button variant="outline" onClick={download}>
              Download error details
            </Button>
            <ul>
              {errors.slice(0, 10).map((e) => (
                <li key={e.line}>
                  Line {e.line}: {e.detail}
                </li>
              ))}
            </ul>
          </>
        )}
      </Dialog>
    </>
  );
}
