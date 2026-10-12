import { afterEach, expect, it } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { useUrlFilters } from "./useUrlFilters";

afterEach(cleanup);

function Filters() {
  const [params, update] = useUrlFilters();
  const navigate = useNavigate();
  return (
    <>
      <select
        aria-label="Role"
        value={params.get("role") || ""}
        onChange={(event) => update("role", event.target.value)}
      >
        <option value="">All roles</option>
        <option value="teacher">Teacher</option>
        <option value="student">Student</option>
      </select>
      <select
        aria-label="Status"
        value={params.get("active") || ""}
        onChange={(event) => update("active", event.target.value)}
      >
        <option value="">Any status</option>
        <option value="true">Active</option>
      </select>
      <button onClick={() => navigate("?unit=other")}>Different report</button>
      <output>{params.toString()}</output>
    </>
  );
}

it("combines same-turn URL edits, clears individual filters and respects external navigation", () => {
  render(
    <MemoryRouter initialEntries={["/?unit=initial&page=3"]}>
      <Filters />
    </MemoryRouter>,
  );
  act(() => {
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "teacher" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "true" },
    });
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "unit=initial&role=teacher&active=true",
  );
  act(() => {
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "student" },
    });
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "unit=initial&role=student",
  );
  fireEvent.click(screen.getByRole("button", { name: "Different report" }));
  fireEvent.change(screen.getByLabelText("Status"), {
    target: { value: "true" },
  });
  expect(screen.getByRole("status")).toHaveTextContent(
    "unit=other&active=true",
  );
  expect(screen.getByLabelText("Role")).toHaveValue("");
});
