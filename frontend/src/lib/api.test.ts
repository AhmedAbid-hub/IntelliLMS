import { afterEach, expect, it, vi } from "vitest";
import { allPages } from "./api";
afterEach(() => vi.unstubAllGlobals());
it("loads subsequent API pages so assessment questions are not omitted", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        count: 51,
        results: Array.from({ length: 50 }, (_, id) => ({ id })),
        next: "http://localhost/api/v1/questions/?page=2",
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 51, results: [{ id: 50 }], next: null }),
    });
  vi.stubGlobal("fetch", fetch);
  const data = await allPages<{ id: number }>("questions/");
  expect(data.results).toHaveLength(51);
  expect(data.results[50].id).toBe(50);
  expect(fetch.mock.calls[1][0]).toBe("/api/v1/questions/?page=2");
});
