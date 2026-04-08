import { describe, it, expect } from "vitest";
import {
  getAvailableFields,
  getAvailableAmountOperators,
  getAmountRangeWarning,
  ConditionGroup,
  ConditionRow,
} from "@/app/admin/approval-routes/_components/approval-route-conditions-editor";

function makeRow(
  field: ConditionRow["field"],
  operator: ConditionRow["operator"] = "is",
  value = ""
): ConditionRow {
  return { id: Math.random().toString(36).slice(2), field, operator, value };
}

function makeGroup(rows: ConditionRow[]): ConditionGroup {
  return { id: "g1", rows };
}

describe("getAvailableFields", () => {
  it("empty group → all base fields available", () => {
    const group = makeGroup([]);
    const fields = getAvailableFields(group);
    expect(fields).toEqual(["department", "amount", "category"]);
  });

  it("group with category → no duplicate category, category_type appears", () => {
    const group = makeGroup([makeRow("category", "is", "purchasing")]);
    const fields = getAvailableFields(group);
    expect(fields).toContain("department");
    expect(fields).toContain("amount");
    expect(fields).not.toContain("category");
    expect(fields).toContain("category_type");
  });

  it("group with category (no value) → category_type NOT available", () => {
    const group = makeGroup([makeRow("category", "is", "")]);
    const fields = getAvailableFields(group);
    expect(fields).not.toContain("category_type");
  });

  it("group with category + category_type → neither available", () => {
    const group = makeGroup([
      makeRow("category", "is", "purchasing"),
      makeRow("category_type", "is", "IT Equipment"),
    ]);
    const fields = getAvailableFields(group);
    expect(fields).not.toContain("category");
    expect(fields).not.toContain("category_type");
    expect(fields).toContain("department");
    expect(fields).toContain("amount");
  });

  it("group with department → no duplicate department", () => {
    const group = makeGroup([makeRow("department", "is", "IT")]);
    const fields = getAvailableFields(group);
    expect(fields).not.toContain("department");
    expect(fields).toContain("amount");
    expect(fields).toContain("category");
  });

  it("group with amount(>) → amount still available (for < direction)", () => {
    const group = makeGroup([makeRow("amount", "is_greater_than", "100000")]);
    const fields = getAvailableFields(group);
    expect(fields).toContain("amount");
  });

  it("group with amount(>) + amount(<) → amount NOT available", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", "100000"),
      makeRow("amount", "is_less_than", "500000"),
    ]);
    const fields = getAvailableFields(group);
    expect(fields).not.toContain("amount");
  });

  it("all fields used → empty (no more conditions possible)", () => {
    const group = makeGroup([
      makeRow("department", "is", "IT"),
      makeRow("amount", "is_greater_than", "100000"),
      makeRow("amount", "is_less_than", "500000"),
      makeRow("category", "is", "purchasing"),
      makeRow("category_type", "is", "IT Equipment"),
    ]);
    const fields = getAvailableFields(group);
    expect(fields).toEqual([]);
  });

  it("currentRowId excludes that row from consideration", () => {
    const catRow = makeRow("category", "is", "purchasing");
    const group = makeGroup([catRow]);
    // When editing the category row itself, category should be available
    const fields = getAvailableFields(group, catRow.id);
    expect(fields).toContain("category");
  });
});

describe("getAvailableAmountOperators", () => {
  it("no other amount rows → all four operators available", () => {
    const row = makeRow("amount", "is_greater_than", "100000");
    const group = makeGroup([row]);
    const ops = getAvailableAmountOperators(group, row.id);
    expect(ops).toContain("is_greater_than");
    expect(ops).toContain("is_greater_than_or_equal");
    expect(ops).toContain("is_less_than");
    expect(ops).toContain("is_less_than_or_equal");
  });

  it("other row has is_greater_than → only upper-bound operators available", () => {
    const row1 = makeRow("amount", "is_greater_than", "100000");
    const row2 = makeRow("amount", "is_less_than", "");
    const group = makeGroup([row1, row2]);
    const ops = getAvailableAmountOperators(group, row2.id);
    expect(ops).toEqual(["is_less_than", "is_less_than_or_equal"]);
  });

  it("other row has is_greater_than_or_equal → only upper-bound operators available", () => {
    const row1 = makeRow("amount", "is_greater_than_or_equal", "100000");
    const row2 = makeRow("amount", "is_less_than", "");
    const group = makeGroup([row1, row2]);
    const ops = getAvailableAmountOperators(group, row2.id);
    expect(ops).toEqual(["is_less_than", "is_less_than_or_equal"]);
  });

  it("other row has is_less_than → only lower-bound operators available", () => {
    const row1 = makeRow("amount", "is_less_than", "500000");
    const row2 = makeRow("amount", "is_greater_than", "");
    const group = makeGroup([row1, row2]);
    const ops = getAvailableAmountOperators(group, row2.id);
    expect(ops).toEqual(["is_greater_than", "is_greater_than_or_equal"]);
  });

  it("other row has is_less_than_or_equal → only lower-bound operators available", () => {
    const row1 = makeRow("amount", "is_less_than_or_equal", "500000");
    const row2 = makeRow("amount", "is_greater_than", "");
    const group = makeGroup([row1, row2]);
    const ops = getAvailableAmountOperators(group, row2.id);
    expect(ops).toEqual(["is_greater_than", "is_greater_than_or_equal"]);
  });
});

describe("getAmountRangeWarning", () => {
  it("no amount rows → null", () => {
    const group = makeGroup([makeRow("department", "is", "IT")]);
    expect(getAmountRangeWarning(group)).toBeNull();
  });

  it("single amount row → null", () => {
    const group = makeGroup([makeRow("amount", "is_greater_than", "100000")]);
    expect(getAmountRangeWarning(group)).toBeNull();
  });

  it("valid range (> 100000 AND < 500000) → null", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", "100000"),
      makeRow("amount", "is_less_than", "500000"),
    ]);
    expect(getAmountRangeWarning(group)).toBeNull();
  });

  it(">= X AND <= X (same value) → exactMatch", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than_or_equal", "1000000"),
      makeRow("amount", "is_less_than_or_equal", "1000000"),
    ]);
    expect(getAmountRangeWarning(group)).toBe("exactMatch");
  });

  it("> X AND < X (same value) → impossible", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", "1000000"),
      makeRow("amount", "is_less_than", "1000000"),
    ]);
    expect(getAmountRangeWarning(group)).toBe("impossible");
  });

  it("> X AND <= X (same value) → impossible", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", "1000000"),
      makeRow("amount", "is_less_than_or_equal", "1000000"),
    ]);
    expect(getAmountRangeWarning(group)).toBe("impossible");
  });

  it(">= X AND < X (same value) → impossible", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than_or_equal", "1000000"),
      makeRow("amount", "is_less_than", "1000000"),
    ]);
    expect(getAmountRangeWarning(group)).toBe("impossible");
  });

  it("lower > upper (inverted range) → impossible", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", "500000"),
      makeRow("amount", "is_less_than", "100000"),
    ]);
    expect(getAmountRangeWarning(group)).toBe("impossible");
  });

  it("empty value rows → null (ignored)", () => {
    const group = makeGroup([
      makeRow("amount", "is_greater_than", ""),
      makeRow("amount", "is_less_than", ""),
    ]);
    expect(getAmountRangeWarning(group)).toBeNull();
  });
});
