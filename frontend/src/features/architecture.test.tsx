import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Academics } from "./resources/Academics";
import { ResourceForm } from "./resources/ResourceForm";
import { StudentProgression } from "./resources/StudentProgression";
import { AcademicResults } from "./analytics/AcademicResults";
import { AcademicHistory } from "./analytics/AcademicHistory";
import { Trends } from "./analytics/Trends";
import { ReportFilters } from "../components/ReportControls";
import { routeAllowed } from "../lib/access";
import { api, post } from "../lib/api";

const auth = vi.hoisted(() => ({role: "admin", user: {institute_id: "school", institute_profile: {kind: "school", name: "School", terminology: {}}}}));
vi.mock("./auth/Auth", () => ({useAuth: () => auth}));
vi.mock("../lib/api", async original => ({...await original<typeof import("../lib/api")>(), api: vi.fn(), post: vi.fn()}));
const mount = (node: React.ReactNode) => render(<QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}><MemoryRouter>{node}</MemoryRouter></QueryClientProvider>);
beforeEach(() => { auth.role = "admin"; auth.user.institute_profile.kind = "school"; vi.mocked(api).mockReset(); vi.mocked(post).mockReset(); vi.mocked(api).mockResolvedValue({results: [], count: 0, next: null}); });
afterEach(cleanup);

it("school navigation excludes departments and batches while university retains them", () => {
  const view = mount(<Academics />);
  expect(screen.getByRole("link", {name: "Classes & Grades"})).toHaveAttribute("href", "/departments-programs");
  expect(screen.queryByRole("link", {name: /Departments Departments/})).not.toBeInTheDocument();
  expect(view.container.querySelector('a[href="/units"]')).toBeNull();
  expect(view.container.querySelector('a[href="/batches"]')).toBeNull();
  expect(routeAllowed("/units", "admin", "school")).toBe(false);
  expect(routeAllowed("/teacher-appointments", "head", "school")).toBe(false);
  expect(routeAllowed("/units", "admin", "university")).toBe(true);
  expect(routeAllowed("/academic-history", "teacher", "school")).toBe(false);
});

it("school class creation hides university structure and college defaults to two annual years", () => {
  const view = mount(<ResourceForm resource="programs" onDone={vi.fn()} />);
  expect(screen.queryByLabelText("Academic structure")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Number of study years")).not.toBeInTheDocument();
  view.unmount();
  auth.user.institute_profile.kind = "college";
  mount(<ResourceForm resource="programs" onDone={vi.fn()} />);
  expect(screen.getByRole("combobox", {name: /Academic structure/})).toHaveValue("annual");
  expect(screen.getByRole("spinbutton", {name: /Number of study years/})).toHaveValue(2);
  expect(screen.queryByRole("option", {name: "semester"})).not.toBeInTheDocument();
});

it("school course form exposes teacher assignments without an administrative override", async () => {
  mount(<ResourceForm resource="offerings" onDone={vi.fn()} />);
  await userEvent.click(screen.getByRole("button", {name: /Advanced settings/}));
  expect(screen.queryByLabelText(/Administrative teacher assignment override/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Instructors (Ctrl/Cmd to select multiple)"})).toBeInTheDocument();
});

it("progression requires evidence review, invalidates changed decisions and retains server errors", async () => {
  const user = userEvent.setup();
  vi.mocked(post).mockResolvedValue({evidence_token: "review-token", evidence: {policy: "manual_review", notice: "Review recorded evidence", required_courses: [], all_required_pass: false}});
  mount(<StudentProgression member={{id: "student", active: true}} current={{id: "placement", stage: 1}} renderPlacement={() => null} />);
  await user.click(screen.getByRole("button", {name: "Review academic decision"}));
  await user.selectOptions(screen.getByLabelText("Academic decision"), "withdraw");
  await user.type(screen.getByLabelText("Decision reason"), "Board reviewed the request");
  await user.click(screen.getByRole("button", {name: "Preview academic decision"}));
  expect(await screen.findByText("Review recorded evidence")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Confirm academic decision"})).toBeDisabled();
  await user.type(screen.getByLabelText("Decision reason"), " today");
  expect(screen.queryByText("Review recorded evidence")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", {name: "Preview academic decision"}));
  await user.click(await screen.findByLabelText("I reviewed the academic evidence and authorize this decision."));
  vi.mocked(post).mockRejectedValue(new Error("Placement changed. Review again."));
  await user.click(screen.getByRole("button", {name: "Confirm academic decision"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Placement changed");
  expect(screen.getByLabelText("Decision reason")).toHaveValue("Board reviewed the request today");
  await waitFor(() => expect(post).toHaveBeenLastCalledWith("memberships/student/progress/", expect.objectContaining({preview: false, confirm_review: true, evidence_token: "review-token"})));
});

it("personal academic history shows withdrawn results and unavailable marks without invented scores", async () => {
  auth.role = "student";
  vi.mocked(api).mockImplementation(async path => path.startsWith("academic-decisions/") ? {results: [], count: 0, next: null} : ({results: [{offering: "old", offering_label: "Previous English", term: "2025", active: false, score: 80, attendance_pct: 100}, {offering: "new", offering_label: "Current English", term: "2026", active: true, score: null, attendance_pct: null}], count: 2, next: null}));
  mount(<AcademicHistory />);
  expect(await screen.findByText("Previous English")).toBeInTheDocument();
  expect(screen.getByText("Historical")).toBeInTheDocument();
  expect(screen.getByText("Not released")).toBeInTheDocument();
  expect(screen.getByText("No records")).toBeInTheDocument();
});


it("report controls adapt to schools, colleges and universities without dropping required filters", () => {
  const view = mount(<ReportFilters value={{}} onChange={vi.fn()} />);
  expect(screen.queryByRole("button", {name: "Department"})).not.toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Admission batch"})).not.toBeInTheDocument();
  for (const name of ["Academic year", "Grade level", "Section", "Subject", "Subject class"]) expect(screen.getByRole("button", {name})).toBeInTheDocument();
  view.unmount(); auth.user.institute_profile.kind = "college";
  const college = mount(<ReportFilters value={{}} onChange={vi.fn()} />);
  expect(screen.getByLabelText("Study year number")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Department"})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "Admission batch"})).not.toBeInTheDocument();
  college.unmount(); auth.user.institute_profile.kind = "university";
  mount(<ReportFilters value={{}} onChange={vi.fn()} />);
  expect(screen.getByRole("button", {name: "Admission batch"})).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "Semester"})).toBeInTheDocument();
});


it("configured GPA shows the selected repeat rule, included credits and excluded results", async () => {
  auth.user.institute_profile.kind = "university";
  vi.mocked(api).mockResolvedValue({status: "ready", notice: "Provisional results using current policy", policy: {repeat: "latest"}, programs: [{program: "p", label: "Degree", cgpa: 2.8, credits: 10, attempts: 3, periods: [{term: "t", label: "Semester one", gpa: 3.2, credits: 5, attempts: 2}]}], excluded: [{offering: "no-credit", label: "Seminar", reason: "Positive credit hours are not configured"}]});
  mount(<AcademicResults />);
  expect(await screen.findByText("Degree · CGPA 2.80")).toBeInTheDocument();
  expect(screen.getByText(/latest released attempt/)).toBeInTheDocument();
  expect(screen.getByText("3.20")).toBeInTheDocument();
  await userEvent.click(screen.getByText("1 results excluded from GPA"));
  expect(screen.getByText(/Seminar: Positive credit hours/)).toBeVisible();
});

it("school progress hides departmental summaries and filters real report requests", async () => {
  vi.mocked(api).mockImplementation(async path => path.startsWith("analytics/trends/") ? {
    window_days: 30, activity: [], attendance: [], assignment_scores: [], assignment_completion_pct: null,
    score_basis: "Released results", departments: [{unit_id: "legacy", unit: "Legacy department", learners: 2, courses: 1, average_score: null, average_attendance: null}], instructor_workload: [],
  } : {results: [], count: 0, next: null});
  mount(<Trends />);
  expect(await screen.findByRole("heading", {name: "Instructor workload"})).toBeInTheDocument();
  expect(screen.queryByRole("heading", {name: "Academic unit overview"})).not.toBeInTheDocument();
  expect(screen.queryByText("Legacy department")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Search learner or course")).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Course status"), "false");
  await waitFor(() => expect(api).toHaveBeenCalledWith("analytics/trends/?archived=false"));
  await waitFor(() => expect(vi.mocked(api).mock.calls.some(([path]) => path.startsWith("analytics/workload/?") && path.includes("archived=false"))).toBe(true));
});
