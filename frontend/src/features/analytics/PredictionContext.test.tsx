import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { PredictionContext } from "./PredictionContext";
afterEach(cleanup);

describe("Prediction provenance", () => {
  it("distinguishes public-data estimates from academic records and institute pass marks", () => {
    render(<PredictionContext info={{ mode: "external_public", target_label: "Next submitted assignment score below 40%", source: { name: "OULAD", license: "CC BY 4.0" }, test_metrics: { precision: .33, recall: .38, f1: .35 } }} warning="Not validated on IntelliLMS students" observations={{ assignments: [{ id: "a", title: "Recorded assignment", percentage: 55, due_at: "2026-10-01" }] }} />);
    expect(screen.getByText("Next submitted assignment score below 40%")).toBeVisible();
    expect(screen.getByText(/not this institute’s pass mark/)).toBeVisible();
    expect(screen.getByText(/Recorded assignment: 55.0%/)).toBeVisible();
    expect(screen.getByText(/not model inputs/)).toBeVisible();
  });
  it("retains the original synthetic warning on historical predictions", () => {
    render(<PredictionContext warning="DEMO — SYNTHETIC DATA" />);
    expect(screen.getByText("DEMO — SYNTHETIC DATA")).toBeVisible();
    expect(screen.queryByText(/OULAD/)).not.toBeInTheDocument();
  });
});
