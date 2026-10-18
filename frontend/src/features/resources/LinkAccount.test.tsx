import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LinkAccount } from "./LinkAccount";
import { post } from "../../lib/api";

const auth = vi.hoisted(() => ({ user: { institute_id: "target-institute" } }));
vi.mock("../auth/Auth", () => ({ useAuth: () => auth }));
vi.mock("../../lib/api", async (original) => ({
  ...(await original<typeof import("../../lib/api")>()), post: vi.fn(),
}));
beforeEach(() => {
  auth.user.institute_id = "target-institute";
  vi.mocked(post).mockReset().mockResolvedValue({});
});
afterEach(cleanup);
function mount() {
  render(<QueryClientProvider client={new QueryClient()}>
    <LinkAccount row={{ id: "existing-admin", username: "school.admin" }} />
  </QueryClientProvider>);
}

it("links the existing administrator to the explicitly selected institute", async () => {
  mount();
  await userEvent.click(screen.getByRole("button", { name: "Link to institute" }));
  await userEvent.click(screen.getByRole("button", { name: "Link administrator" }));
  expect(post).toHaveBeenCalledWith("memberships/attach/", {
    user: "existing-admin", role: "admin", institute: "target-institute",
  });
  expect(await screen.findByText("Administrator linked successfully")).toBeVisible();
});

it("cannot start linking without a selected institute", () => {
  auth.user.institute_id = "";
  mount();
  expect(screen.getByRole("button", { name: "Link to institute" })).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});
