import { describe, it, expect } from "vitest";
import { termLabel } from "./terminology";
describe("academic terminology", () => {
  it("uses independent configured singular and plural names", () => {
    expect(
      termLabel({ program: "Grade", program_plural: "Grades" }, "program"),
    ).toBe("Grade");
    expect(
      termLabel({ unit: "Faculty", unit_plural: "Faculties" }, "unit", true),
    ).toBe("Faculties");
  });
  it("keeps usable defaults and field labels without configuration", () => {
    expect(termLabel({}, "term")).toBe("Term");
    expect(termLabel({}, "first_name")).toBe("first name");
  });
});
