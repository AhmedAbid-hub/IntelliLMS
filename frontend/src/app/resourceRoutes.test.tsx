import { cleanup, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resources } from "../features/resources/config";
import { ResourceRoute, resourceRoutes } from "./resourceRoutes";

vi.mock("../features/resources/ResourcePage", () => ({
  ResourcePage: ({ resource }: { resource?: string }) => (
    <div data-testid="resource-entry">{resource ?? "unknown-resource"}</div>
  ),
}));
afterEach(cleanup);

describe("resource page entry wiring", () => {
  it("keeps every configured resource discoverable", () => {
    expect(Object.keys(resourceRoutes).sort()).toEqual(
      Object.keys(resources).sort(),
    );
  });

  for (const resource of Object.keys(resources)) {
    it(`opens the existing /${resource} resource`, async () => {
      render(
        <MemoryRouter initialEntries={[`/${resource}`]}>
          <Suspense fallback={<div>Loading</div>}>
            <Routes>
              <Route path=":resource" element={<ResourceRoute />} />
            </Routes>
          </Suspense>
        </MemoryRouter>,
      );
      expect(await screen.findByTestId("resource-entry")).toHaveTextContent(
        resource,
      );
    });
  }

  it("retains the unknown-resource fallback", async () => {
    render(
      <MemoryRouter initialEntries={["/unknown-resource"]}>
        <Suspense fallback={<div>Loading</div>}>
          <Routes>
            <Route path=":resource" element={<ResourceRoute />} />
          </Routes>
        </Suspense>
      </MemoryRouter>,
    );
    expect(await screen.findByTestId("resource-entry")).toHaveTextContent(
      "unknown-resource",
    );
  });
});
