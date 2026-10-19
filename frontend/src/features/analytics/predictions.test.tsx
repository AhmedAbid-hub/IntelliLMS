import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Predictions } from "./Predictions";
import { PredictionAvailability, type PredictionReadiness } from "./PredictionAvailability";
import { api, post } from "../../lib/api";

const auth = vi.hoisted(() => ({
  role: "admin", selectWorkspace: vi.fn(),
  user: { institute_id: "institute", institute_profile: { name: "Northstar University", kind: "university", terminology: {} },
    memberships: [{ institute_id: "institute", role: "head", can_teach: false }] },
}));
vi.mock("../auth/Auth", () => ({ useAuth: () => auth }));
vi.mock("../../lib/api", async original => ({ ...(await original<typeof import("../../lib/api")>()), api: vi.fn(), post: vi.fn() }));

let coverage: PredictionReadiness;
const model = { id: "model", status: "ready", version: "oulad-test", selected_model: "gradient_boosting" };
const history = { count: 0, next: null, previous: null, results: [] };
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{element}</MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  auth.role = "admin"; auth.user.memberships[0].can_teach = false; auth.selectWorkspace.mockReset();
  coverage = { courses: 1, open_courses: 1, learner_course_pairs: 12, eligible_pairs: 10,
    insufficient_history_pairs: 1, no_upcoming_pairs: 1, historical_estimates: 16,
    model_status: "ready", can_generate: false,
    generation_reason: "Institute Admin has read-only oversight. Assigned teachers generate estimates in their teaching workspace." };
  vi.mocked(post).mockReset();
  vi.mocked(api).mockReset();
  vi.mocked(api).mockImplementation(async path => {
    if (path === "model-status/") return model;
    if (path.startsWith("predictions/summary/")) return { distribution: { high: 0, moderate: 0, low: 0 }, learner_course_pairs: 0, basis: "Current model only", readiness: coverage };
    return history;
  });
});
afterEach(cleanup);

it("explains older-model history and keeps Institute Admin generation disabled without zero risk cards", async () => {
  mount(<Predictions offering="course" />);
  await screen.findByText("No saved estimates from the current model");
  expect(screen.getByText(/16 older-model estimates/)).toBeVisible();
  expect(screen.queryByText("HIGH RISK")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Analyze class" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Generate estimate" })).not.toBeInTheDocument();
  expect(screen.getAllByText(/Institute Admin has read-only oversight/).length).toBeGreaterThan(0);
  expect(post).not.toHaveBeenCalled();
});

it("enables the assigned teacher's class action and sends only the chosen course", async () => {
  auth.role = "teacher"; coverage.can_generate = true; coverage.generation_reason = "";
  vi.mocked(post).mockResolvedValue({ id: "run", offering: "course", status: "completed", processed: 12, total: 12, counts: { insufficient_data: 12 } });
  mount(<Predictions offering="course" />);
  const action = await screen.findByRole("button", { name: "Analyze class" });
  await waitFor(() => expect(action).toBeEnabled());
  await userEvent.click(action);
  expect(post).toHaveBeenCalledWith("class-analysis/", { offering: "course" });
  await screen.findByText(/12 of 12 students processed/);
});

it("distinguishes insufficient history and missing upcoming work without inventing estimates", () => {
  coverage.eligible_pairs = 0;
  mount(<PredictionAvailability data={coverage} estimates={0} />);
  expect(screen.getByText(/need two released assignment scores/)).toBeVisible();
  expect(screen.getByText(/no published, unsubmitted assignment/)).toBeVisible();
  expect(screen.getByText(/data coverage, not a risk classification/)).toBeVisible();
});

it("offers a capability-authorized Head the existing My Teaching switch", async () => {
  auth.role = "head"; auth.user.memberships[0].can_teach = true;
  mount(<PredictionAvailability data={coverage} estimates={0} />);
  await userEvent.click(screen.getByRole("button", { name: "Switch to My Teaching" }));
  expect(auth.selectWorkspace).toHaveBeenCalledWith("teaching");
});

it("does not offer teaching access to a Head without capability", () => {
  auth.role = "head";
  mount(<PredictionAvailability data={coverage} estimates={0} />);
  expect(screen.queryByRole("button", { name: "Switch to My Teaching" })).not.toBeInTheDocument();
});

it("keeps the action disabled if scoped readiness fails", async () => {
  auth.role = "teacher";
  vi.mocked(api).mockImplementation(async path => {
    if (path.startsWith("predictions/summary/")) throw new Error("Scoped coverage unavailable");
    return path === "model-status/" ? model : history;
  });
  mount(<Predictions offering="course" />);
  await screen.findByText("Scoped coverage unavailable");
  expect(screen.getByRole("button", { name: "Analyze class" })).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});

it("explains absent courses and unavailable models", () => {
  coverage.courses = 0; coverage.model_status = "model_unavailable";
  mount(<PredictionAvailability data={coverage} estimates={0} />);
  expect(screen.getByRole("heading", { name: "Model unavailable" })).toBeVisible();
  expect(screen.getByText(/No courses are available in this scope/)).toBeVisible();
});

it("keeps raw prediction history and generation unavailable to students", async () => {
  auth.role = "student";
  mount(<Predictions />);
  expect(screen.queryByRole("button", { name: "Analyze class" })).not.toBeInTheDocument();
  expect(api).not.toHaveBeenCalled();
});

it("preserves searchable older-model history and labels an empty search accurately", async () => {
  const base = vi.mocked(api).getMockImplementation()!;
  vi.mocked(api).mockImplementation(async (path, options) => {
    if (path.startsWith("predictions/?")) {
      if (path.includes("search=nobody")) return history;
      return { ...history, count: 1, results: [{ id: "legacy", student_label: "Learner A", offering_label: "Computing", category: "high", probability: .8, version: "legacy-demo" }] };
    }
    return base(path, options);
  });
  mount(<Predictions />);
  await screen.findByText("legacy-demo");
  expect(within(screen.getByRole("table")).getByText("80.0%")).toBeVisible();
  await userEvent.type(screen.getByLabelText("Search estimates"), "nobody");
  await screen.findByText("No saved estimates match this search in the selected scope.");
});
