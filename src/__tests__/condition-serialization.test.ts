import { describe, it, expect } from "vitest";
import {
  rowsToConditions,
  conditionsToGroups,
  groupsToConditions,
  ConditionRow,
} from "@/app/admin/approval-routes/_components/approval-route-conditions-editor";

function makeRow(
  field: ConditionRow["field"],
  operator: ConditionRow["operator"] = "is",
  value = ""
): ConditionRow {
  return { id: Math.random().toString(36).slice(2), field, operator, value };
}

// ---------------------------------------------------------------------------
// rowsToConditions — serialize UI rows → stored JSONB
// ---------------------------------------------------------------------------

describe("rowsToConditions", () => {
  it("empty rows → empty object", () => {
    expect(rowsToConditions([])).toEqual({});
  });

  it("category row → categories array", () => {
    const rows = [makeRow("category", "is", "purchasing")];
    expect(rowsToConditions(rows)).toEqual({ categories: ["purchasing"] });
  });

  it("department row → departments array", () => {
    const rows = [makeRow("department", "is", "Marketing")];
    expect(rowsToConditions(rows)).toEqual({ departments: ["Marketing"] });
  });

  it("amount greater than → min_amount (strict)", () => {
    const rows = [makeRow("amount", "is_greater_than", "100000")];
    expect(rowsToConditions(rows)).toEqual({ min_amount: 100000, min_amount_inclusive: false });
  });

  it("amount greater than or equal → min_amount (inclusive)", () => {
    const rows = [makeRow("amount", "is_greater_than_or_equal", "100000")];
    expect(rowsToConditions(rows)).toEqual({ min_amount: 100000, min_amount_inclusive: true });
  });

  it("amount less than → max_amount (strict)", () => {
    const rows = [makeRow("amount", "is_less_than", "500000")];
    expect(rowsToConditions(rows)).toEqual({ max_amount: 500000, max_amount_inclusive: false });
  });

  it("amount less than or equal → max_amount (inclusive)", () => {
    const rows = [makeRow("amount", "is_less_than_or_equal", "500000")];
    expect(rowsToConditions(rows)).toEqual({ max_amount: 500000, max_amount_inclusive: true });
  });

  it("category_type row → category_type_ids array", () => {
    const rows = [makeRow("category_type", "is", "ct-uuid-123")];
    expect(rowsToConditions(rows)).toEqual({
      category_type_ids: ["ct-uuid-123"],
    });
  });

  it("category_type row with empty value → not serialized", () => {
    const rows = [makeRow("category_type", "is", "")];
    expect(rowsToConditions(rows)).toEqual({});
  });

  it("all field types combined → complete condition object", () => {
    const rows = [
      makeRow("department", "is", "Marketing"),
      makeRow("amount", "is_greater_than", "100000"),
      makeRow("amount", "is_less_than", "500000"),
      makeRow("category", "is", "purchasing"),
      makeRow("category_type", "is", "ct-uuid-office"),
    ];
    expect(rowsToConditions(rows)).toEqual({
      departments: ["Marketing"],
      min_amount: 100000,
      min_amount_inclusive: false,
      max_amount: 500000,
      max_amount_inclusive: false,
      categories: ["purchasing"],
      category_type_ids: ["ct-uuid-office"],
    });
  });
});

// ---------------------------------------------------------------------------
// conditionsToGroups — deserialize stored JSONB → UI groups
// ---------------------------------------------------------------------------

describe("conditionsToGroups", () => {
  it("null → empty groups", () => {
    expect(conditionsToGroups(null)).toEqual([]);
  });

  it("empty object → empty groups", () => {
    expect(conditionsToGroups({})).toEqual([]);
  });

  it("flat conditions → single group with rows", () => {
    const conditions = {
      categories: ["purchasing"],
      departments: ["Marketing"],
      min_amount: 100000,
    };
    const groups = conditionsToGroups(conditions);
    expect(groups).toHaveLength(1);
    expect(groups[0].rows).toHaveLength(3);

    const fields = groups[0].rows.map((r) => r.field).sort();
    expect(fields).toEqual(["amount", "category", "department"]);
  });

  it("flat conditions with category_type_ids → includes category_type row", () => {
    const conditions = {
      categories: ["purchasing"],
      category_type_ids: ["ct-uuid-1"],
    };
    const groups = conditionsToGroups(conditions);
    expect(groups).toHaveLength(1);

    const ctRow = groups[0].rows.find((r) => r.field === "category_type");
    expect(ctRow).toBeDefined();
    expect(ctRow!.value).toBe("ct-uuid-1");
    expect(ctRow!.operator).toBe("is");
  });

  it("group-based conditions → multiple groups", () => {
    const conditions = {
      groups: [
        { categories: ["purchasing"], departments: ["Marketing"] },
        { categories: ["expenses"], min_amount: 50000 },
      ],
    };
    const groups = conditionsToGroups(conditions);
    expect(groups).toHaveLength(2);
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1].rows).toHaveLength(2);
  });

  it("group-based with empty group → filters out empty groups", () => {
    const conditions = {
      groups: [
        { categories: ["purchasing"] },
        {}, // empty group
      ],
    };
    const groups = conditionsToGroups(conditions);
    expect(groups).toHaveLength(1);
  });

  it("group with category_type_ids → deserializes correctly", () => {
    const conditions = {
      groups: [
        {
          categories: ["purchasing"],
          category_type_ids: ["ct-uuid-office", "ct-uuid-hardware"],
        },
      ],
    };
    const groups = conditionsToGroups(conditions);
    expect(groups).toHaveLength(1);

    const ctRows = groups[0].rows.filter((r) => r.field === "category_type");
    expect(ctRows).toHaveLength(2);
    expect(ctRows.map((r) => r.value).sort()).toEqual([
      "ct-uuid-hardware",
      "ct-uuid-office",
    ]);
  });
});

// ---------------------------------------------------------------------------
// groupsToConditions — serialize UI groups → stored JSONB
// ---------------------------------------------------------------------------

describe("groupsToConditions", () => {
  it("empty groups → empty object", () => {
    expect(groupsToConditions([])).toEqual({});
  });

  it("single group → flat condition (no groups wrapper)", () => {
    const groups = [
      {
        id: "g1",
        rows: [makeRow("category", "is", "purchasing")],
      },
    ];
    const result = groupsToConditions(groups);
    expect(result).toEqual({ categories: ["purchasing"] });
    expect(result).not.toHaveProperty("groups");
  });

  it("multiple groups → groups wrapper", () => {
    const groups = [
      {
        id: "g1",
        rows: [makeRow("category", "is", "purchasing")],
      },
      {
        id: "g2",
        rows: [makeRow("category", "is", "expenses")],
      },
    ];
    const result = groupsToConditions(groups);
    expect(result).toHaveProperty("groups");
    const typed = result as { groups: unknown[] };
    expect(typed.groups).toHaveLength(2);
  });

  it("groups with empty rows → filtered out", () => {
    const groups = [
      { id: "g1", rows: [makeRow("category", "is", "purchasing")] },
      { id: "g2", rows: [] }, // empty
    ];
    const result = groupsToConditions(groups);
    // Only one non-empty group → flat format
    expect(result).toEqual({ categories: ["purchasing"] });
  });
});

// ---------------------------------------------------------------------------
// Round-trip: groups → JSON → groups
// ---------------------------------------------------------------------------

describe("round-trip serialization", () => {
  it("flat condition with all fields round-trips correctly", () => {
    const original = {
      departments: ["Marketing"],
      min_amount: 100000,
      min_amount_inclusive: false,
      max_amount: 500000,
      max_amount_inclusive: false,
      categories: ["purchasing"],
      category_type_ids: ["ct-uuid-1"],
    };

    const groups = conditionsToGroups(original);
    const result = groupsToConditions(groups);

    expect(result).toEqual(original);
  });

  it("multi-group condition round-trips correctly", () => {
    const original = {
      groups: [
        { categories: ["purchasing"], departments: ["Marketing"] },
        { categories: ["expenses"], min_amount: 50000, min_amount_inclusive: false },
      ],
    };

    const groups = conditionsToGroups(original);
    expect(groups).toHaveLength(2);

    const result = groupsToConditions(groups) as { groups: unknown[] };
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0]).toEqual(original.groups[0]);
    expect(result.groups[1]).toEqual(original.groups[1]);
  });

  it("condition with category_type_ids round-trips correctly", () => {
    const original = {
      categories: ["purchasing"],
      category_type_ids: ["ct-uuid-office"],
    };

    const groups = conditionsToGroups(original);
    const result = groupsToConditions(groups);

    expect(result).toEqual(original);
  });
});
