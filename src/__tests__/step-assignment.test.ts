import { describe, it, expect } from "vitest";
import {
  getStepMode,
  getActiveFilters,
  getAvailableFilters,
} from "@/app/admin/approval-routes/_components/approval-route-steps-editor";
import { CreateApprovalRouteStepParams } from "@/types/approvalRoute";

function makeStep(
  overrides: Partial<CreateApprovalRouteStepParams> = {}
): CreateApprovalRouteStepParams {
  return {
    step_order: 1,
    name: "Test Step",
    ...overrides,
  };
}

describe("getStepMode", () => {
  it("empty step → filter mode", () => {
    expect(getStepMode(makeStep())).toBe("filter");
  });

  it("step with role → filter mode", () => {
    expect(getStepMode(makeStep({ approver_role: "approver" }))).toBe("filter");
  });

  it("step with position + department → filter mode", () => {
    expect(
      getStepMode(makeStep({ approver_position_id: "pos1", approver_department_id: "dept1" }))
    ).toBe("filter");
  });

  it("step with members → member mode", () => {
    expect(getStepMode(makeStep({ assignee_user_ids: ["u1", "u2"] }))).toBe("member");
  });

  it("step with empty members array → member mode (user toggled to members)", () => {
    expect(getStepMode(makeStep({ assignee_user_ids: [] }))).toBe("member");
  });
});

describe("getActiveFilters", () => {
  it("empty step → no active filters", () => {
    expect(getActiveFilters(makeStep())).toEqual([]);
  });

  it("step with role → ['role']", () => {
    expect(getActiveFilters(makeStep({ approver_role: "approver" }))).toEqual(["role"]);
  });

  it("step with role (empty string, just added) → ['role']", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getActiveFilters(makeStep({ approver_role: "" as any }))).toEqual(["role"]);
  });

  it("step with role + department → ['role', 'department']", () => {
    expect(
      getActiveFilters(makeStep({ approver_role: "approver", approver_department_id: "dept1" }))
    ).toEqual(["role", "department"]);
  });

  it("step with all three → ['role', 'position', 'department']", () => {
    expect(
      getActiveFilters(
        makeStep({
          approver_role: "accounting",
          approver_position_id: "pos1",
          approver_department_id: "dept1",
        })
      )
    ).toEqual(["role", "position", "department"]);
  });

  it("step with position + department → ['position', 'department']", () => {
    expect(
      getActiveFilters(makeStep({ approver_position_id: "pos1", approver_department_id: "dept1" }))
    ).toEqual(["position", "department"]);
  });
});

describe("getAvailableFilters", () => {
  it("empty step → all filters available", () => {
    expect(getAvailableFilters(makeStep())).toEqual(["role", "position", "department"]);
  });

  it("step with role → position and department available", () => {
    expect(getAvailableFilters(makeStep({ approver_role: "approver" }))).toEqual([
      "position",
      "department",
    ]);
  });

  it("step with role + department → only position available", () => {
    expect(
      getAvailableFilters(
        makeStep({ approver_role: "approver", approver_department_id: "dept1" })
      )
    ).toEqual(["position"]);
  });

  it("step with all three → none available", () => {
    expect(
      getAvailableFilters(
        makeStep({
          approver_role: "accounting",
          approver_position_id: "pos1",
          approver_department_id: "dept1",
        })
      )
    ).toEqual([]);
  });
});
