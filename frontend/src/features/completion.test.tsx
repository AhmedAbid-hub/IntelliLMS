import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadWorkspace } from "./auth/HeadWorkspace";
import { InstituteSettings } from "./auth/InstituteSettings";
import { CourseComparisons } from "./analytics/CourseComparisons";
import { api } from "../lib/api";
const auth = vi.hoisted(() => ({
  role: "head",
  selectWorkspace: vi.fn(),
  user: {
    institute_id: "institute",
    academic_workspace: "department",
    memberships: [{ institute_id: "institute", role: "head", can_teach: true }],
  },
}));
vi.mock("./auth/Auth", () => ({ useAuth: () => auth }));
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: vi.fn(),
}));
function mount(element: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.mocked(api).mockReset();
  auth.role = "head";
  auth.user.memberships[0].can_teach = true;
  auth.selectWorkspace.mockReset();
});
afterEach(cleanup);

it("keeps Head workspace errors visible and disables teaching when capability is absent", async () => {
  auth.selectWorkspace.mockRejectedValue(
    new Error("Teaching access was revoked"),
  );
  const view = mount(<HeadWorkspace />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "My teaching" }));
  expect(
    await screen.findByText("Teaching access was revoked"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Department management" }),
  ).toHaveAttribute("aria-pressed", "true");
  view.unmount();
  auth.user.memberships[0].can_teach = false;
  mount(<HeadWorkspace />);
  expect(screen.getByRole("button", { name: "My teaching" })).toBeDisabled();
});

it("saves protection rules and justification while preserving existing grading configuration", async () => {
  auth.role = "admin";
  vi.mocked(api).mockResolvedValue({
    id: "institute",
    name: "Institute",
    terminology: {},
    grading_rules: {
      pass_mark: 55,
      quiz_attempt_policy: "best",
      missing_category_policy: "zero",
    },
  });
  mount(<InstituteSettings />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByLabelText(
      "Require an audited correction for released grades",
    ),
  );
  await user.type(screen.getByLabelText(/Attendance editing window/), "7");
  await user.type(
    screen.getByLabelText("Reason for protection policy change"),
    "Approved academic policy",
  );
  await user.click(
    screen.getByRole("button", { name: "Save institute settings" }),
  );
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "institutes/institute/",
      expect.objectContaining({ method: "PATCH" }),
    ),
  );
  const call = vi
    .mocked(api)
    .mock.calls.find(([, options]) => options?.method === "PATCH")!;
  const payload = JSON.parse(String(call[1]?.body));
  expect(payload.policy_change_reason).toBe("Approved academic policy");
  expect(payload.grading_rules).toMatchObject({
    pass_mark: 55,
    quiz_attempt_policy: "best",
    missing_category_policy: "zero",
    lock_released_grades: true,
    attendance_edit_window_days: 7,
  });
});

it("renders factual course statistics and resets pagination when sort changes", async () => {
  vi.mocked(api).mockResolvedValue({
    count: 26,
    next: "next",
    previous: null,
    results: [
      {
        id: "course",
        title: "Computing",
        department: "Department",
        term: "Fall",
        section: null,
        learners: 30,
        instructors: 1,
        missing_submissions: 4,
        released_grades: 20,
        below_pass_mark: 3,
        meeting_pass_mark: 17,
        assignment_average: 62.5,
        attendance_records: 0,
        attendance_percentage: null,
      },
    ],
  });
  mount(<CourseComparisons />);
  expect(
    await screen.findByRole("link", { name: "Computing" }),
  ).toHaveAttribute("href", "/course/course");
  expect(screen.getByText("4 missing submissions")).toBeInTheDocument();
  expect(screen.getByText("No records")).toBeInTheDocument();
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /^Next$/ }));
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "analytics/courses/?page=2&ordering=title",
    ),
  );
  await user.selectOptions(screen.getByLabelText("Sort courses"), "-learners");
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "analytics/courses/?page=1&ordering=-learners",
    ),
  );
});
