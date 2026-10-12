import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Login } from "./auth/Login";
import { Protected } from "./auth/Auth";
import { ResourceForm } from "./resources/ResourceForm";
import { WorkflowDialog } from "./resources/WorkflowDialog";
import { Gradebook } from "./analytics/Dashboard";
import { Workload } from "./analytics/Workload";
import { RelationSelect } from "../components/RelationSelect";
import { ReportFilters } from "../components/ReportControls";
import { ResourceFilters } from "./resources/ResourceFilters";
import { useState } from "react";
import { Shell } from "../components/layouts/Shell";
import { WorkspaceRoute } from "../components/layouts/WorkspaceRoute";
import { Breadcrumbs } from "../components/layouts/Breadcrumbs";
import { ToastProvider, notifySaved } from "../components/ToastProvider";
import { allPages, api, post } from "../lib/api";
const auth = vi.hoisted(() => ({
  user: null as null | {
    id: string;
    username: string;
    first_name: string;
    institute_id: string;
    memberships: unknown[];
  },
  role: "student",
  refresh: vi.fn(),
  select: vi.fn(),
}));
vi.mock("./auth/Auth", async (original) => ({
  ...(await original<typeof import("./auth/Auth")>()),
  useAuth: () => auth,
}));
vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  api: vi.fn(),
  allPages: vi.fn(),
  post: vi.fn(),
}));
function mount(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  auth.user = null;
  auth.role = "student";
  vi.mocked(api).mockReset();
  vi.mocked(allPages).mockImplementation(
    (...args) => vi.mocked(api)(...args) as ReturnType<typeof allPages>,
  );
  vi.mocked(post).mockReset();
  vi.mocked(post).mockResolvedValue({});
  vi.mocked(api).mockResolvedValue({ results: [], count: 0, next: null });
});
afterEach(cleanup);
describe("authentication and navigation", () => {
  it("keeps report and resource filters bounded and retains selected filters across pages", async () => {
    vi.mocked(api).mockImplementation(async (path) => {
      const second = String(path).includes("page=2");
      return {
        count: 51,
        next: second ? null : "next",
        previous: second ? "previous" : null,
        results: [
          {
            id: second ? "second" : "first",
            name: second ? "Later term" : "Initial term",
          },
        ],
      };
    });
    function Filters() {
      const [filters, setFilters] = useState<Record<string, string>>({});
      return (
        <>
          <ReportFilters value={filters} onChange={setFilters} />
          <ResourceFilters
            resource="offerings"
            value={new URLSearchParams(filters)}
            onChange={(key, value) => setFilters({ ...filters, [key]: value })}
          />
        </>
      );
    }
    mount(<Filters />);
    await userEvent.click(screen.getByRole("button", {name:"Filter Academic term"}));
    await screen.findByRole("option", {name:"Initial term"});
    // Both term filters share the same bounded request; neither crawls page two.
    expect(api).toHaveBeenCalledTimes(1);
    await userEvent.click(
      screen.getByRole("button", { name: "Next Filter Academic term page" }),
    );
    await screen.findByText("Later term");
    await userEvent.click(screen.getByRole("option",{name:"Later term"}));
    expect(screen.getByRole("button",{name:"Filter Academic term"})).toHaveTextContent("Later term");
    // Both controls receive the same selected identifier, even on different option pages.
    expect(document.querySelectorAll('select.relation-native-select option:checked[value="second"]')).toHaveLength(2);
    await userEvent.click(screen.getByRole("button",{name:"Filter Academic term"}));
    await userEvent.click(screen.getByRole("button",{name:"Previous Filter Academic term page"}));
    await screen.findByRole("option",{name:"Initial term"});
    expect(screen.getByRole("button",{name:"Filter Academic term"})).toHaveTextContent("Later term");

  });
  it("redirects a student before restricted content mounts", async () => {
    auth.user = {
      id: "1",
      username: "student",
      first_name: "Zara",
      institute_id: "i",
      memberships: [],
    };
    mount(
      <Routes>
        <Route path="/" element={<Link to="/audit">Audit</Link>} />
        <Route
          path="/audit"
          element={
            <WorkspaceRoute>
              <div>Private audit data</div>
            </WorkspaceRoute>
          }
        />
        <Route path="/unauthorized" element={<h1>Access unavailable</h1>} />
      </Routes>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Audit" }));
    expect(
      await screen.findByRole("heading", { name: "Access unavailable" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Private audit data")).not.toBeInTheDocument();
  });
  it("shows a usable breadcrumb and dismissible saved notification", async () => {
    mount(
      <ToastProvider>
        <Breadcrumbs />
        <button onClick={() => notifySaved("Enrollment saved.")}>Save</button>
      </ToastProvider>,
    );
    expect(
      screen.getByRole("navigation", { name: "Breadcrumb" }),
    ).toHaveTextContent("Overview");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Enrollment saved.");
    await userEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
  it("validates an empty login form without a network mutation", async () => {
    mount(<Login />);
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your username")).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });
  it("submits credentials through the session API", async () => {
    mount(<Login />);
    await userEvent.type(screen.getByLabelText("Username"), "learner");
    await userEvent.type(
      screen.getByLabelText("Password"),
      "Test-password123!",
    );
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("auth/login/", {
        username: "learner",
        password: "Test-password123!",
      }),
    );
  });
  it("shows server authentication errors", async () => {
    vi.mocked(post).mockRejectedValue(new Error("Invalid credentials."));
    mount(<Login />);
    await userEvent.type(screen.getByLabelText("Username"), "learner");
    await userEvent.type(screen.getByLabelText("Password"), "bad");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid credentials.",
    );
  });
  it("hides administrative navigation from students", () => {
    auth.user = {
      id: "1",
      username: "student",
      first_name: "Zara",
      institute_id: "i",
      memberships: [],
    };
    mount(<Shell />);
    expect(screen.getByText("My courses")).toBeInTheDocument();
    expect(screen.queryByText("Academic structure")).not.toBeInTheDocument();
    expect(screen.queryByText("Learning insights")).not.toBeInTheDocument();
  });
});
describe("academic workflows", () => {
  it("shows released manual feedback without student grading controls", () => {
    mount(
      <WorkflowDialog
        resource="manual-grades"
        row={{
          id: "m1",
          title: "Practical",
          marks: "7.25",
          max_marks: 10,
          released: true,
          feedback: "Explain your conclusion.",
          offering_label: "Biology",
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("Explain your conclusion.")).toBeInTheDocument();
    expect(screen.getByText("7.25 / 10 marks")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });
  it("accepts fractional manual marks in the edit form", async () => {
    auth.role = "teacher";
    mount(
      <ResourceForm
        resource="manual-grades"
        initial={{
          id: "m1",
          title: "Practical",
          offering: "o1",
          student: "s1",
          marks: "7.25",
          max_marks: 10,
          feedback: "Good",
          released: true,
        }}
        onDone={vi.fn()}
      />,
    );
    const marks = screen.getByRole("spinbutton", {
      name: /^Marks/,
    }) as HTMLInputElement;
    expect(marks.value).toBe("7.25");
    expect(marks.validity.stepMismatch).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "manual-grades/m1/",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining('"marks":7.25'),
        }),
      ),
    );
  });
  it("loads saved short-answer grades including zero and preserves them on edit", async () => {
    auth.role = "teacher";
    vi.mocked(api).mockResolvedValue({
      results: [
        { id: "q1", prompt: "First question", marks: 5, kind: "short" },
        { id: "q2", prompt: "Second question", marks: 10, kind: "short" },
      ],
      next: null,
    });
    mount(
      <WorkflowDialog
        resource="attempts"
        row={{
          id: "a1",
          quiz: "quiz1",
          answers: {},
          manual_marks: { q1: 0, q2: 7.5 },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByLabelText("Marks (maximum 5)")).toHaveValue(0);
    expect(screen.getByLabelText("Marks (maximum 10)")).toHaveValue(7.5);
    await userEvent.clear(screen.getByLabelText("Marks (maximum 10)"));
    await userEvent.type(screen.getByLabelText("Marks (maximum 10)"), "8.25");
    await userEvent.click(
      screen.getByRole("button", { name: "Save manual grades" }),
    );
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("attempts/a1/grade/", {
        manual_marks: { q1: "0", q2: "8.25" },
      }),
    );
  });
  it("loads only requested choice pages and preserves multiple selected records", async () => {
    vi.mocked(api).mockImplementation(async (path) => {
      const second = String(path).includes("page=2");
      return {
        count: 101,
        next: "another-page",
        previous: second ? "previous" : null,
        results: [
          {
            id: second ? "m2" : "m1",
            user: second ? "u2" : "u1",
            username: second ? "Teacher two" : "Teacher one",
          },
        ],
      };
    });
    function Form() {
      const [value, setValue] = useState<string | string[]>([]);
      return (
        <RelationSelect
          label="Teachers"
          source="memberships?role=teacher"
          value={value}
          onChange={setValue}
          multiple
        />
      );
    }
    mount(<Form />);
    await userEvent.click(screen.getByRole("button",{name:"Teachers"}));
    await screen.findByRole("option",{name:"Teacher one"});
    expect(api).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("option", {name:"Teacher one"}));
    await userEvent.click(
      screen.getByRole("button", { name: "Next Teachers page" }),
    );
    await screen.findByText("Teacher two");
    expect(api).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button",{name:"Teachers"})).toHaveTextContent("1 selected");
    await userEvent.click(screen.getByRole("option",{name:"Teacher two"}));
    await userEvent.type(screen.getByRole("searchbox"), "Math");
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(
        "memberships/?role=teacher&page=1&search=Math",
      ),
    );
    expect(screen.getByRole("button",{name:"Teachers"})).toHaveTextContent("2 selected");
    expect(screen.getByRole("button",{name:"Remove Teacher two"})).toBeInTheDocument();
  });
  it("pages and searches instructor workload through the scoped API", async () => {
    vi.mocked(api).mockImplementation(async (path) => {
      const second = String(path).includes("page=2");
      return {
        count: 26,
        next: second ? null : "next",
        previous: second ? "previous" : null,
        results: [
          {
            id: second ? "t2" : "t1",
            teacher: second ? "Second instructor" : "First instructor",
            courses: 2,
            learners: 10,
          },
        ],
      };
    });
    mount(<Workload />);
    await screen.findByText("First instructor");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Second instructor");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Search instructor"), "Zara");
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(
        "analytics/workload/?search=Zara&page=1",
      ),
    );
    await userEvent.selectOptions(
      screen.getByLabelText("Course status"),
      "false",
    );
    await waitFor(() =>
      expect(api).toHaveBeenLastCalledWith(
        "analytics/workload/?search=Zara&page=1&archived=false",
      ),
    );
  });
  it("creates an enrollment with selected student and offering identifiers", async () => {
    vi.mocked(api).mockImplementation(async (path) =>
      path.startsWith("offerings")
        ? { results: [{ id: "o1", title: "Mathematics" }], next: null }
        : path.startsWith("memberships")
          ? {
              results: [{ id: "m1", user: "s1", username: "Zara" }],
              next: null,
            }
          : {},
    );
    mount(<ResourceForm resource="enrollments" onDone={vi.fn()} />);
    await userEvent.click(screen.getByRole("button",{name:/Course offering/}));
    await userEvent.click(await screen.findByRole("option",{name:"Mathematics"}));
    await userEvent.click(screen.getByRole("button",{name:/Student/}));
    await userEvent.click(await screen.findByRole("option",{name:"Zara"}));
    await userEvent.click(
      screen.getByRole("button", { name: "Create record" }),
    );
    await waitFor(() =>
      expect(api).toHaveBeenCalledWith(
        "enrollments/",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ offering: "o1", student: "s1", active: true }),
        }),
      ),
    );
  });
  it("submits an assignment answer as multipart data", async () => {
    mount(
      <WorkflowDialog
        resource="assignments"
        row={{
          id: "a1",
          title: "Essay",
          due_at: "2026-12-01T12:00:00Z",
          max_marks: 100,
        }}
        onClose={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText("Your answer"), "My reasoning");
    await userEvent.click(
      screen.getByRole("button", { name: "Submit assignment" }),
    );
    await waitFor(() => expect(post).toHaveBeenCalled());
    const body = vi.mocked(post).mock.calls[0][1] as FormData;
    expect(body.get("text")).toBe("My reasoning");
  });
  it("sends bulk attendance with the chosen status", async () => {
    auth.role = "teacher";
    vi.mocked(api).mockResolvedValue({
      results: [{ id: "e1", student: "s1", student_label: "Zara" }],
      next: null,
    });
    mount(
      <WorkflowDialog
        resource="attendance-sessions"
        row={{ id: "meeting", offering: "o1", title: "Monday" }}
        onClose={vi.fn()}
      />,
    );
    await userEvent.selectOptions(
      await screen.findByLabelText("Attendance status for Zara"),
      "absent",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^Save attendance/ }),
    );
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("attendance-sessions/meeting/mark/", {
        records: [{ student: "s1", status: "absent" }],
      }),
    );
  });
  it("keeps attendance edits when a page save fails and only submits the reviewed page", async () => {
    auth.role="teacher";
    vi.mocked(api).mockImplementation(async (path) => {
      const second = String(path).includes("page=2");
      return {
        count: 51,
        next: second ? null : "next",
        previous: second ? "previous" : null,
        results: [
          {
            id: second ? "e2" : "e1",
            student: second ? "s2" : "s1",
            student_label: second ? "Second learner" : "First learner",
            status: second ? null : "late",
          },
        ],
      };
    });
    mount(
      <WorkflowDialog
        resource="attendance-sessions"
        row={{ id: "meeting", title: "Attendance" }}
        onClose={vi.fn()}
      />,
    );
    expect(await screen.findByLabelText("Attendance status for First learner")).toHaveValue("late");
    expect(api).toHaveBeenCalledTimes(1);
    await userEvent.selectOptions(
      screen.getByLabelText("Attendance status for First learner"),
      "absent",
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("searchbox")).toBeDisabled();
    vi.mocked(post).mockRejectedValueOnce(new Error("Save unavailable"));
    await userEvent.click(
      screen.getByRole("button", { name: /^Save attendance/ }),
    );
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Attendance status for First learner")).toHaveValue("absent");
    await userEvent.click(
      screen.getByRole("button", { name: /^Save attendance/ }),
    );
    await screen.findByText("1 attendance record saved successfully.");
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByLabelText("Attendance status for Second learner")).toHaveValue(
      "",
    );
    await userEvent.selectOptions(screen.getByLabelText("Attendance status for Second learner"), "present");
    await userEvent.click(
      screen.getByRole("button", { name: /^Save attendance/ }),
    );
    await waitFor(() =>
      expect(post).toHaveBeenLastCalledWith(
        "attendance-sessions/meeting/mark/",
        { records: [{ student: "s2", status: "present" }] },
      ),
    );
  });
  it("renders analytics request failures", async () => {
    vi.mocked(api).mockRejectedValue(new Error("Connection unavailable"));
    mount(<Gradebook />);
    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent(
      "Connection unavailable",
    );
  });
  it("shows a useful empty gradebook", async () => {
    vi.mocked(api).mockResolvedValue({
      results: [],
      count: 0,
      next: null,
      previous: null,
    });
    mount(<Gradebook />);
    expect(await screen.findByText(/No records yet/)).toBeInTheDocument();
  });
});

import { StaffLifecycle } from './resources/StaffLifecycle';
import { BulkEnrollment } from './courses/BulkEnrollment';
describe('membership and enrollment consequence reviews', () => {
  it('reviews consequences, submits a reason and resets a reopened dialog', async () => {
    auth.role = 'admin';
    vi.mocked(api).mockResolvedValue({ active_assignments: 0, active_enrollments: 1, courses: [] });
    mount(<StaffLifecycle row={{ id: 'membership-1', user: 'student-1', username: 'learner', role: 'student', active: true }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Manage access' }));
    expect(await screen.findByText(/Reactivating membership will not automatically restore enrollments/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Reason'), 'Leaving this institute');
    await user.click(screen.getByRole('button', { name: 'Confirm membership change' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('memberships/membership-1/transition/', { operation: 'deactivate', reason: 'Leaving this institute' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Manage access' }));
    expect(await screen.findByLabelText('Reason')).toHaveValue('');
  });
  it('retains bulk selections across server pages and keeps them after validation failure', async () => {
    vi.mocked(api).mockImplementation(async path => {
      const second = String(path).includes('page=2');
      return { count: 51, next: second ? null : 'next', results: [{ id: second ? 'm2' : 'm1', user: second ? 's2' : 's1', username: second ? 'second' : 'first', enrollment_active: second ? false : true }] };
    });
    vi.mocked(post).mockRejectedValueOnce(new Error('Enrollment rejected'));
    mount(<BulkEnrollment offering={{ id: 'course-1', title: 'Computing' }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Enroll students' }));
    await user.click(await screen.findByLabelText('Select first'));
    await user.click(screen.getByRole('button', { name: 'Next students' }));
    await user.click(await screen.findByLabelText('Select second'));
    await user.type(screen.getByLabelText('Reason'), 'Term registration');
    await user.click(screen.getByRole('button', { name: 'Confirm enrollment changes' }));
    expect(await screen.findByText('Enrollment rejected')).toBeInTheDocument();
    expect(screen.getByText('2 students selected')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('offerings/course-1/bulk-enrollment/', { students: ['s1', 's2'], operation: 'enroll', reason: 'Term registration' });
  });
});

import { QuizAuthoring } from './quizzes/QuizAuthoring';
import { InstituteSettings } from './auth/InstituteSettings';
describe('bulk quiz authoring and institute presets', () => {
  it('submits multiple questions together and retains edits when the server rejects a batch', async () => {
    vi.mocked(post).mockRejectedValueOnce(new Error('Questions are locked after attempts begin.'));
    mount(<QuizAuthoring quiz={{ id: 'quiz-1', title: 'Review quiz', has_attempts: false }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Quiz authoring' }));
    await user.type(screen.getByLabelText('Prompt'), 'Explain your answer');
    await user.selectOptions(screen.getByLabelText('Type'), 'short');
    await user.click(screen.getByRole('button', { name: 'Add another question' }));
    await user.type(screen.getAllByLabelText('Prompt')[1], 'Is this true?');
    await user.selectOptions(screen.getAllByLabelText('Type')[1], 'boolean');
    await user.selectOptions(screen.getByLabelText('Correct answer', { exact: true }), 'true');
    await user.click(screen.getByRole('button', { name: 'Save question batch' }));
    expect(await screen.findByText('Questions are locked after attempts begin.')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Prompt')[0]).toHaveValue('Explain your answer');
    expect(post).toHaveBeenCalledWith('quizzes/quiz-1/bulk-questions/', { questions: [
      { prompt: 'Explain your answer', kind: 'short', options: [], answer: '', marks: 1 },
      { prompt: 'Is this true?', kind: 'boolean', options: [], answer: 'true', marks: 1 },
    ] });
  });
  it('locks editing of attempted quizzes while allowing an unpublished duplicate', async () => {
    mount(<QuizAuthoring quiz={{ id: 'quiz-1', title: 'Locked quiz', has_attempts: true }} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Quiz authoring' }));
    expect(screen.getByRole('button', { name: 'Bulk editor & CSV' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Create draft copy' }));
    await waitFor(() => expect(post).toHaveBeenCalledWith('quizzes/quiz-1/duplicate/', { title: 'Locked quiz (copy)' }));
  });
  it('applies a school preset locally and saves customized terminology', async () => {
    auth.role = 'admin';
    auth.user = { id: 'admin', username: 'admin', first_name: 'Admin', institute_id: 'inst-1', memberships: [] };
    vi.mocked(api).mockResolvedValue({ id: 'inst-1', name: 'Institute', kind: 'university', terminology: {}, grading_rules: {} });
    mount(<InstituteSettings />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText('Terminology preset'), 'school');
    await user.click(screen.getByRole('button', { name: 'Apply terminology preset' }));
    await user.click(screen.getByText('Advanced terminology settings'));
    expect(screen.getByLabelText('Singular course', { exact: true })).toHaveValue('Subject');
    await user.clear(screen.getByLabelText('Plural course', { exact: true }));
    await user.type(screen.getByLabelText('Plural course', { exact: true }), 'Learning subjects');
    await user.click(screen.getByRole('button', { name: 'Save institute settings' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith('institutes/inst-1/', expect.objectContaining({ method: 'PATCH', body: expect.stringContaining('Learning subjects') })));
  });
});

import { ImportPeople } from './resources/ImportPeople';
import { CourseDetail } from './courses/CourseDetail';
describe('account import preview and unified course workspace', () => {
  it('previews accounts without importing them and displays student identifiers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ created: 0, would_create: 1, errors: [], preview: [{ username: 'new-student', role: 'student', display_name: 'New Student', student_identifier: 'ST001' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    try {
      mount(<ImportPeople />);
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: 'Import CSV' }));
      await user.upload(screen.getByLabelText('CSV file'), new File(['username,email,role\nnew-student,new@example.test,student'], 'students.csv', { type: 'text/csv' }));
      await user.click(screen.getByRole('button', { name: 'Preview import' }));
      expect(await screen.findByText('ST001')).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('No accounts or invitations have been created');
      expect(fetchMock.mock.calls[0][1].body.get('preview')).toBe('true');
    } finally { vi.unstubAllGlobals(); }
  });
  it('keeps embedded gradebook requests in the opened course', async () => {
    auth.role = 'teacher';
    vi.mocked(api).mockImplementation(async path => String(path).startsWith('offerings/course-1/') ? { id: 'course-1', title: 'Computing', term_label: 'Fall', course_label: 'Computing', assignment_weight: 60, quiz_weight: 40, manual_weight: 0 } : { results: [], count: 0, next: null });
    mount(<><Link to='/course/course-1'>Open workspace</Link><Routes><Route path='/course/:id' element={<CourseDetail />} /></Routes></>);
    const user = userEvent.setup();
    await user.click(screen.getByRole('link', { name: 'Open workspace' }));
    expect(await screen.findByRole('heading', { name: 'Course overview' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Grades' }));
    await waitFor(() => expect(api).toHaveBeenCalledWith(expect.stringMatching(/^grades\/\?.*offering=course-1/)));
    expect(screen.getByRole('link', { name: /manual assessment grades/ })).toHaveAttribute('href', '/manual-grades?offering=course-1');
  });
});

it('keeps platform navigation focused on platform responsibilities', () => {
  auth.role = 'superadmin';
  mount(<Shell />);
  expect(screen.getByRole('link', { name: 'Platform overview' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'My courses' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Gradebook' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Academic structure' })).not.toBeInTheDocument();
});

it('requires an explicit admin assignment override and retains the existing instructor selection', async () => {
  auth.role = 'admin';
  vi.mocked(api).mockResolvedValue({ count: 1, results: [{ id: 'membership-1', user: 'teacher-1', username: 'current.teacher' }], next: null });
  mount(<ResourceForm resource='offerings' initial={{ id: 'offering-1', title: 'Course', teachers: ['teacher-1'], course: 'course-1', term: 'term-1' }} onDone={vi.fn()} />);
  expect(screen.queryByRole('listbox', { name: /Instructors/ })).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('checkbox', { name: /Use administrative teaching-assignment override/ }));
  const instructors = await screen.findByRole('button', { name: /Instructors/ });
  expect(instructors).toHaveTextContent('1 selected');
  expect(screen.getByLabelText(/Administrative assignment override reason/)).toBeInTheDocument();
});

import { ClassAnalysis } from './analytics/ClassAnalysis';
it('resumes class analysis after a request failure and keeps actual values separate from estimates', async () => {
  const run = { id: 'run1', offering: 'course', status: 'active', total: 12, processed: 0, counts: {}, created_at: '2026-10-12T00:00:00Z', finished_at: null, warning: 'Synthetic demonstration only' };
  let advances = 0;
  vi.mocked(post).mockImplementation(async path => {
    if (path === 'class-analysis/') return run;
    advances += 1;
    if (advances === 1) throw new Error('Connection lost; results remain saved');
    return { ...run, status: 'completed', processed: 12, counts: { ready: 1, insufficient_data: 11 } };
  });
  vi.mocked(api).mockResolvedValue({ count: 1, next: null, previous: null, results: [{ student: 's1', student_label: 'Learner One', status: 'ready', result: { probability: .2, category: 'low', version: 'demo-v1', created_at: '2026-10-12T00:00:00Z', academic: { attendance_pct: 66.666, score: 75 } } }] });
  mount(<ClassAnalysis offering="course" />);
  await userEvent.click(screen.getByRole('button', { name: 'Analyze class' }));
  await screen.findByText('Connection lost; results remain saved');
  await userEvent.click(screen.getByRole('button', { name: 'Resume analysis' }));
  await screen.findByText('12 of 12 students processed · Completed');
  expect(screen.getByText('66.7%')).toBeInTheDocument();
  expect(screen.getByText('20.0%')).toBeInTheDocument();
  expect(screen.getByText('Low')).toBeInTheDocument();
  expect(screen.getByText('75.0%')).toBeInTheDocument();
  expect(vi.mocked(post)).toHaveBeenCalledWith('class-analysis/', { offering: 'course' });
});

import { ProfilePicture } from './auth/ProfilePicture';
it('retains a rejected profile image for retry and uploads it as multipart data', async () => {
  auth.user = { id: 'one', username: 'learner', first_name: 'Learner', institute_id: 'institute', memberships: [] };
  let uploads = 0;
  vi.mocked(api).mockImplementation(async (path, options) => {
    if (path === 'auth/avatar/' && options?.method === 'PUT') {
      expect(options.body).toBeInstanceOf(FormData);
      uploads += 1;
      if (uploads === 1) throw new Error('Choose a smaller image');
      return { avatar_url: '/api/v1/auth/avatar/?v=new' };
    }
    return {};
  });
  mount(<ProfilePicture />);
  await userEvent.upload(screen.getByLabelText('Select profile picture'), new File(['image'], 'photo.png', { type: 'image/png' }));
  await userEvent.click(screen.getByRole('button', { name: 'Upload picture' }));
  await screen.findByText('Choose a smaller image');
  expect(screen.getByRole('button', { name: 'Upload picture' })).toBeEnabled();
  await userEvent.click(screen.getByRole('button', { name: 'Upload picture' }));
  await screen.findByText('Your profile picture has been updated.');
  expect(uploads).toBe(2);
});

import { StudentPriorities } from './analytics/StudentPriorities';
it('shows actual student priorities with actionable links and rounded academic values', async () => {
  vi.mocked(api).mockResolvedValue({ pending_assignments: 1, overdue_assignments: 1, pending_quizzes: 0, missed_quizzes: 0, preview_limit: 20, tasks: [{ id: 'task', kind: 'assignment', title: 'Essay', course: 'History', deadline: '2026-10-01T12:00:00Z', overdue: true, opens_at: null, action: 'Ask your teacher about the missed deadline', url: '/assignments?offering=course' }] });
  mount(<StudentPriorities progress={[{ student:'learner',student_label:'Learner',offering:'course',offering_label:'History',score:65.66666,attendance_pct:null,completion_pct:20,assignment_pct:null,quiz_pct:null,manual_pct:null,activity_count:0 }]} />);
  await screen.findByText('Essay');
  expect(screen.getByRole('link', { name: 'Ask your teacher about the missed deadline' })).toHaveAttribute('href', '/assignments?offering=course');
  expect(screen.getByText(/Released assessment summary: 65.7%/)).toBeInTheDocument();
  expect(screen.getByText(/Attendance has not been recorded yet/)).toBeInTheDocument();
});

import { TeacherAppointments } from './resources/TeacherAppointments';
it('reviews an eligible teacher appointment with a reason and preserves the dialog on rejection', async () => {
  auth.role = 'head';
  auth.user = { id: 'head', username: 'head', first_name: 'Head', institute_id: 'institute', memberships: [{ institute_id: 'institute', unit_id: 'department', role: 'head' }] };
  vi.mocked(api).mockImplementation(async path => String(path).includes('candidates') ? { count:1, next:null, previous:null, results:[{id:'candidate',username:'newteacher',appointed:false}] } : { count:0,next:null,previous:null,results:[] });
  vi.mocked(post).mockRejectedValueOnce(new Error('Eligibility changed; refresh the candidate list')).mockResolvedValueOnce({id:'appointment'});
  mount(<TeacherAppointments />);
  await userEvent.click(screen.getByRole('button', {name:'Eligible teacher'}));
  await userEvent.click(await screen.findByRole('option', { name: 'newteacher' }));
  await userEvent.click(screen.getByRole('button', { name: 'Review appointment' }));
  await userEvent.type(screen.getByLabelText('Appointment reason'), 'Department teaching appointment');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm appointment change' }));
  await screen.findByText('Eligibility changed; refresh the candidate list');
  expect(screen.getByLabelText('Appointment reason')).toHaveValue('Department teaching appointment');
  await userEvent.click(screen.getByRole('button', { name: 'Confirm appointment change' }));
  await screen.findByText('Departmental appointment updated. Historical records preserved.');
  expect(post).toHaveBeenLastCalledWith('teacher-appointments/', { membership:'candidate',unit:'department',reason:'Department teaching appointment' });
});


it("shows persisted setup progress and direct links without claiming operations are verified", async()=>{
  const {InstituteSetup}=await import("./resources/InstituteSetup");
  vi.mocked(api).mockResolvedValue({completed:1,total:2,ready:false,steps:[{key:"curriculum",title:"Configure curriculum",complete:true,optional:false,owner:"Institute Admin",path:"/curriculum"},{key:"batches",title:"Create batches",complete:false,optional:false,owner:"Institute Admin",path:"/batches"}]});
  mount(<InstituteSetup/>);
  expect(await screen.findByText("1 of 2 essentials configured")).toBeInTheDocument();
  expect(screen.getByRole("link",{name:"Open: Create batches"})).toHaveAttribute("href","/batches");
  expect(screen.getByRole("progressbar")).toHaveAttribute("value","1");
  expect(screen.getByText(/indicators confirm that records exist/)).toBeInTheDocument();
});


it("preserves invitation review after resend failure and explains transport status",async()=>{
 const {InvitationReview}=await import("./resources/InvitationReview");
 vi.mocked(post).mockRejectedValueOnce(new Error("Please retry")).mockResolvedValueOnce({});
 mount(<InvitationReview row={{id:"member",username:"invited",active:true,invitation:{state:"pending",email_status:"failed",issued_at:null,expires_at:null,accepted_at:null}}}/>);
 await userEvent.click(screen.getByRole("button",{name:"Invitation"}));
 expect(screen.getByText(/does not confirm delivery/)).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button",{name:"Resend invitation"}));
 expect(await screen.findByText("Please retry")).toBeInTheDocument();
 await userEvent.click(screen.getByRole("button",{name:"Resend invitation"}));
 expect(await screen.findByRole("status")).toHaveTextContent("Invitation request processed");
 expect(post).toHaveBeenLastCalledWith("memberships/member/resend-invitation/");
});


it("keeps a correction proposal and reason after a rejected save",async()=>{
 auth.role="teacher";
 const {AcademicControl}=await import("./resources/AcademicControl");
 vi.mocked(api).mockResolvedValue({kind:"manual",target:"grade",finalized:true,current:{marks:"40.00",feedback:"Original",released:true},can_finalize:false,can_review:false});
 vi.mocked(post).mockRejectedValueOnce(new Error("A correction is already pending"));
 mount(<AcademicControl resource="manual-grades" row={{id:"grade"}}/>);
 await userEvent.click(screen.getByRole("button",{name:"Academic control"}));
 const marks=await screen.findByLabelText("Proposed marks");await userEvent.clear(marks);await userEvent.type(marks,"55.50");await userEvent.type(screen.getByLabelText("Reason for this academic action"),"Verified marking sheet");await userEvent.click(screen.getByRole("button",{name:"Request correction"}));
 expect(await screen.findByText("A correction is already pending")).toBeInTheDocument();expect(marks).toHaveValue(55.5);expect(screen.getByLabelText("Reason for this academic action")).toHaveValue("Verified marking sheet");expect(screen.queryByRole("button",{name:"Finalize record"})).not.toBeInTheDocument();
});


it("keeps notification destinations local and permits marking a private event read", async()=>{
 const {ResourcePage}=await import("./resources/ResourcePage");
 vi.mocked(api).mockResolvedValue({count:2,next:null,results:[{id:"notice",title:"Course assigned",body:"",read:false,created_at:"2026-10-12T00:00:00Z",destination:"/course/assigned"},{id:"unsafe",title:"Legacy event",body:"",read:true,created_at:"2026-10-12T00:00:00Z",destination:"//outside.test"}]});
 mount(<ResourcePage resource="notifications"/>);
 expect(await screen.findByRole("link",{name:"Open notification"})).toHaveAttribute("href","/course/assigned");
 expect(screen.getAllByRole("link",{name:"Open notification"})).toHaveLength(1);
 await userEvent.click(screen.getByRole("button",{name:"Mark read"}));
 expect(post).toHaveBeenCalledWith("notifications/notice/read/");
});

it("duplicates and reorders independent draft questions before saving a batch", async()=>{
 mount(<QuizAuthoring quiz={{id:"draft",title:"Draft questions",has_attempts:false}}/>);
 await userEvent.click(screen.getByRole("button",{name:"Quiz authoring"}));
 expect(screen.getByRole("dialog")).toHaveClass("dialog-wide");
 await userEvent.selectOptions(screen.getByLabelText("Type"),"short");
 await userEvent.type(screen.getByLabelText("Prompt"),"Original prompt");
 await userEvent.click(screen.getByRole("button",{name:"Duplicate question 1"}));
 await userEvent.clear(screen.getAllByLabelText("Prompt")[1]);
 await userEvent.type(screen.getAllByLabelText("Prompt")[1],"Copied draft");
 await userEvent.click(screen.getByRole("button",{name:"Move draft question 2 up"}));
 expect(screen.getAllByLabelText("Prompt")[0]).toHaveValue("Copied draft");
 expect(screen.getAllByLabelText("Prompt")[1]).toHaveValue("Original prompt");
 vi.mocked(post).mockResolvedValue({created:2});
 await userEvent.click(screen.getByRole("button",{name:"Save question batch"}));
 expect(post).toHaveBeenCalledWith("quizzes/draft/bulk-questions/",{questions:[expect.objectContaining({prompt:"Copied draft"}),expect.objectContaining({prompt:"Original prompt"})]});
});
