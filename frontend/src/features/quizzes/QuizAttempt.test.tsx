import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api, allPages, post, type RecordData } from "../../lib/api";
import { QuizAttempt } from "./QuizAttempt";

vi.mock("../../lib/api", async (original) => ({
  ...(await original<typeof import("../../lib/api")>()),
  api: vi.fn(),
  allPages: vi.fn(),
  post: vi.fn(),
}));
vi.mock("../auth/Auth", () => ({ useAuth: () => ({role:"student",user:null}) }));
const attempt = () => ({
  id: "a1",
  quiz: "q1",
  answers: { short: "Saved answer" },
  deadline: new Date(Date.now() + 600_000).toISOString(),
  submitted_at: null,
});
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/attempt/a1"]}>
        <Routes>
          <Route path="/attempt/:id" element={<QuizAttempt />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  vi.mocked(api).mockReset().mockResolvedValue(attempt());
  vi.mocked(allPages)
    .mockReset()
    .mockResolvedValue({
      results: [{ id: "short", kind: "short", prompt: "Explain", marks: 5 }],
      count: 1,
      next: null,
      previous: null,
    });
  vi.mocked(post).mockReset().mockResolvedValue(attempt());
});
afterEach(cleanup);

it("renders a failed attempt request instead of waiting for a disabled questions query", async () => {
  vi.mocked(api).mockRejectedValue(new Error("Attempt access denied"));
  mount();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Attempt access denied",
  );
  expect(allPages).not.toHaveBeenCalled();
});
it("preserves unsaved answers across a background refresh and failed save", async () => {
  const client = mount();
  const input = await screen.findByLabelText("Your answer");
  await userEvent.clear(input);
  await userEvent.type(input, "My draft");
  act(() => {
    client.setQueryData(["attempt", "a1"], {
      ...attempt(),
      answers: { short: "Server answer" },
    });
  });
  expect(input).toHaveValue("My draft");
  vi.mocked(post).mockRejectedValue(new Error("Connection lost"));
  await userEvent.click(screen.getByRole("button", { name: "Save answers" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection lost");
  expect(input).toHaveValue("My draft");
});
it("retains edits typed during an in-flight save and submits the latest draft", async () => {
  let resolve!: (value: RecordData) => void;
  vi.mocked(post).mockImplementationOnce(
    () =>
      new Promise<RecordData>((done) => {
        resolve = done;
      }),
  );
  mount();
  const input = await screen.findByLabelText("Your answer");
  await userEvent.click(screen.getByRole("button", { name: "Save answers" }));
  await userEvent.type(input, " plus new work");
  await act(async () => resolve(attempt()));
  expect(input).toHaveValue("Saved answer plus new work");
  expect(screen.getByRole("status")).toHaveTextContent(
    "New changes are unsaved",
  );
  vi.mocked(post).mockResolvedValueOnce({
    ...attempt(),
    submitted_at: new Date().toISOString(),
    released: false,
  });
  await userEvent.click(screen.getByRole("button", { name: "Submit attempt" }));
  await waitFor(() =>
    expect(post).toHaveBeenLastCalledWith("attempts/a1/submit/", {
      answers: { short: "Saved answer plus new work" },
    }),
  );
  expect(
    await screen.findByRole("heading", { name: "Attempt submitted" }),
  ).toBeInTheDocument();
});
