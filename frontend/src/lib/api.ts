export type RecordData = { id: string; [key: string]: unknown };
export interface Page<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function message(data: unknown): string {
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.map(message).join(" ");
  if (data && typeof data === "object")
    return Object.entries(data)
      .map(
        ([key, value]) =>
          `${key === "detail" ? "" : key + ": "}${message(value)}`,
      )
      .join(" · ");
  return "Request failed. Please try again.";
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    document.cookie
      .split("; ")
      .find((v) => v.startsWith("csrftoken="))
      ?.split("=")[1] || "";
  const headers: HeadersInit = {
    "X-CSRFToken": decodeURIComponent(token),
    ...(!(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...options.headers,
  };
  const response = await fetch(`/api/v1/${path}`, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  if (response.status === 204) return undefined as T;
  const data = await response
    .json()
    .catch(() => ({ detail: "The server returned an invalid response." }));
  if (!response.ok) throw new ApiError(response.status, message(data));
  return data as T;
}
export const post = <T>(path: string, data: unknown = {}) =>
  api<T>(path, {
    method: "POST",
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
export const label = (row: RecordData) =>
  String(
    row.title ||
      row.name ||
      row.username ||
      row.student_label ||
      row.code ||
      row.id,
  );
export const display = (value: unknown): string =>
  value === null || value === undefined || value === ""
    ? "—"
    : typeof value === "boolean"
      ? value
        ? "Yes"
        : "No"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

/** Fetch every page for workflows that must never silently omit learners/questions. */
export async function allPages<T>(path: string): Promise<Page<T>> {
  const results: T[] = [];
  let current = path;
  const visited = new Set<string>();
  while (current) {
    if (visited.has(current))
      throw new Error("The API returned a repeated pagination link.");
    visited.add(current);
    const page = await api<Page<T>>(current);
    results.push(...page.results);
    if (!page.next) break;
    const url = new URL(page.next, window.location.origin);
    if (!url.pathname.startsWith("/api/v1/"))
      throw new Error("Invalid pagination link.");
    current = url.pathname.slice("/api/v1/".length) + url.search;
  }
  return { results, count: results.length, next: null, previous: null };
}
