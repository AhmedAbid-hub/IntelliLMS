import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvitationReview } from "./InvitationReview";
import { post } from "../../lib/api";

vi.mock("../../lib/api", () => ({ post: vi.fn() }));
afterEach(cleanup);
beforeEach(() => vi.mocked(post).mockReset());
const invitation = { state: "pending", email_status: "failed", issued_at: null, expires_at: null, accepted_at: null };
function mount(overrides = {}) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <InvitationReview row={{ id: "member", username: "invited", active: true, invitation: { ...invitation, ...overrides } }} />
  </QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Invitation" }));
}

describe("invitation delivery evidence", () => {
  it("uses the returned failure immediately even without a parent refetch", async () => {
    vi.mocked(post).mockResolvedValue({ ...invitation, email_status: "failed" });
    mount({ email_status: "accepted" });
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));
    expect(await screen.findByText("Email sending failed")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be submitted");
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText("Submitted to email provider")).not.toBeInTheDocument();
  });

  it("shows sending, blocks duplicate clicks, then reports provider acceptance", async () => {
    let complete!: (value: unknown) => void;
    vi.mocked(post).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Resend invitation" }));
    expect(screen.getByRole("button", { name: "Sending…" })).toBeDisabled();
    expect(screen.getByText("Sending")).toBeInTheDocument();
    complete({ ...invitation, email_status: "accepted" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("does not confirm inbox delivery"));
    expect(screen.getByText("Submitted to email provider")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each(["local", "sent"])("does not call %s provider delivery", status => {
    mount({ email_status: status });
    expect(screen.queryByText("Submitted to email provider")).not.toBeInTheDocument();
    expect(screen.getByText(status === "local" ? /local test mailbox/ : /older record does not identify/)).toBeInTheDocument();
  });

  it.each([["accepted", "Invitation accepted", false], ["expired", "Invitation expired", true], ["pending", "Pending setup", true]])("shows %s setup independently from mail", (state, label, resend) => {
    mount({ state });
    expect(screen.getByText(label as string)).toBeInTheDocument();
    expect(!!screen.queryByRole("button", { name: "Resend invitation" })).toBe(resend);
  });
});
