import { describe, it, expect } from "vitest";
import {
  evaluateGroup,
  evaluateRouteConditions,
} from "@/lib/approvalRouteEvaluation";

// ---------------------------------------------------------------------------
// evaluateGroup — AND logic within a single condition group
// ---------------------------------------------------------------------------

describe("evaluateGroup", () => {
  describe("empty / no conditions", () => {
    it("empty conditions object → matches with score 0", () => {
      const result = evaluateGroup({}, "purchasing", "IT", 100000);
      expect(result).toEqual({ matches: true, score: 0 });
    });
  });

  describe("category matching", () => {
    it("matching category → matches, score 1", () => {
      const result = evaluateGroup(
        { categories: ["purchasing"] },
        "purchasing",
        null,
        null
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("non-matching category → no match", () => {
      const result = evaluateGroup(
        { categories: ["purchasing"] },
        "contracts",
        null,
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("null category vs required category → no match", () => {
      const result = evaluateGroup(
        { categories: ["purchasing"] },
        null,
        null,
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("multiple allowed categories → matches if submission is one of them", () => {
      const result = evaluateGroup(
        { categories: ["purchasing", "expenses"] },
        "expenses",
        null,
        null
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });
  });

  describe("department matching", () => {
    it("matching department → matches, score 1", () => {
      const result = evaluateGroup(
        { departments: ["Marketing"] },
        null,
        "Marketing",
        null
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("non-matching department → no match", () => {
      const result = evaluateGroup(
        { departments: ["Marketing"] },
        null,
        "Engineering",
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("null department vs required department → no match", () => {
      const result = evaluateGroup(
        { departments: ["Marketing"] },
        null,
        null,
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });
  });

  describe("amount matching", () => {
    it("min_amount only: amount above → matches", () => {
      const result = evaluateGroup(
        { min_amount: 100000 },
        null,
        null,
        150000
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("min_amount only: amount exactly at min (strict >) → no match", () => {
      const result = evaluateGroup(
        { min_amount: 100000 },
        null,
        null,
        100000
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("min_amount inclusive: amount exactly at min (>=) → matches", () => {
      const result = evaluateGroup(
        { min_amount: 100000, min_amount_inclusive: true },
        null,
        null,
        100000
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("min_amount only: amount below → no match", () => {
      const result = evaluateGroup(
        { min_amount: 100000 },
        null,
        null,
        50000
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("max_amount only: amount below → matches", () => {
      const result = evaluateGroup(
        { max_amount: 500000 },
        null,
        null,
        300000
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("max_amount only: amount above → no match", () => {
      const result = evaluateGroup(
        { max_amount: 500000 },
        null,
        null,
        600000
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("amount range (min + max): amount within → matches, score 2", () => {
      const result = evaluateGroup(
        { min_amount: 100000, max_amount: 500000 },
        null,
        null,
        250000
      );
      expect(result).toEqual({ matches: true, score: 2 });
    });

    it("amount range: amount outside → no match", () => {
      const result = evaluateGroup(
        { min_amount: 100000, max_amount: 500000 },
        null,
        null,
        600000
      );
      expect(result).toEqual({ matches: false, score: 1 });
    });

    it("null amount vs required amount → no match", () => {
      const result = evaluateGroup(
        { min_amount: 100000 },
        null,
        null,
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });
  });

  describe("category_type_ids matching", () => {
    it("matching category type ID → matches, score 1", () => {
      const result = evaluateGroup(
        { category_type_ids: ["ct-uuid-1"] },
        null,
        null,
        null,
        "ct-uuid-1"
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });

    it("non-matching category type ID → no match", () => {
      const result = evaluateGroup(
        { category_type_ids: ["ct-uuid-1"] },
        null,
        null,
        null,
        "ct-uuid-2"
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("null category type vs required → no match", () => {
      const result = evaluateGroup(
        { category_type_ids: ["ct-uuid-1"] },
        null,
        null,
        null,
        null
      );
      expect(result).toEqual({ matches: false, score: 0 });
    });

    it("multiple allowed category type IDs → matches one", () => {
      const result = evaluateGroup(
        { category_type_ids: ["ct-uuid-1", "ct-uuid-2"] },
        null,
        null,
        null,
        "ct-uuid-2"
      );
      expect(result).toEqual({ matches: true, score: 1 });
    });
  });

  describe("AND logic — multiple conditions", () => {
    it("all conditions match → matches with combined score", () => {
      const result = evaluateGroup(
        {
          categories: ["purchasing"],
          departments: ["Marketing"],
          min_amount: 100000,
          category_type_ids: ["ct-uuid-1"],
        },
        "purchasing",
        "Marketing",
        200000,
        "ct-uuid-1"
      );
      expect(result).toEqual({ matches: true, score: 4 });
    });

    it("one condition fails → entire group fails", () => {
      const result = evaluateGroup(
        {
          categories: ["purchasing"],
          departments: ["Marketing"],
          min_amount: 100000,
        },
        "purchasing",
        "Engineering", // ← wrong department
        200000
      );
      expect(result.matches).toBe(false);
    });

    it("category matches but amount fails → no match, partial score", () => {
      const result = evaluateGroup(
        {
          categories: ["purchasing"],
          min_amount: 500000,
        },
        "purchasing",
        null,
        100000 // below min
      );
      expect(result.matches).toBe(false);
      expect(result.score).toBe(1); // category matched
    });
  });
});

// ---------------------------------------------------------------------------
// evaluateRouteConditions — flat vs group-based formats
// ---------------------------------------------------------------------------

describe("evaluateRouteConditions", () => {
  describe("empty / null conditions", () => {
    it("null → matches everything, score 0", () => {
      expect(evaluateRouteConditions(null, "purchasing")).toEqual({
        matches: true,
        score: 0,
      });
    });

    it("empty object → matches everything, score 0", () => {
      expect(evaluateRouteConditions({}, "purchasing")).toEqual({
        matches: true,
        score: 0,
      });
    });

    it("undefined → matches everything, score 0", () => {
      expect(evaluateRouteConditions(undefined, "purchasing")).toEqual({
        matches: true,
        score: 0,
      });
    });
  });

  describe("flat format (single group, AND)", () => {
    it("flat conditions that match → matches", () => {
      const conditions = {
        categories: ["purchasing"],
        departments: ["Marketing"],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        "Marketing",
        null
      );
      expect(result).toEqual({ matches: true, score: 2 });
    });

    it("flat conditions partial mismatch → no match", () => {
      const conditions = {
        categories: ["purchasing"],
        departments: ["Marketing"],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        "Engineering",
        null
      );
      expect(result.matches).toBe(false);
    });
  });

  describe("group-based format (OR between groups)", () => {
    it("one matching group out of two → matches", () => {
      const conditions = {
        groups: [
          { categories: ["purchasing"], departments: ["Marketing"] },
          { categories: ["expenses"], departments: ["Engineering"] },
        ],
      };
      // Matches second group
      const result = evaluateRouteConditions(
        conditions,
        "expenses",
        "Engineering",
        null
      );
      expect(result.matches).toBe(true);
      expect(result.score).toBe(2);
    });

    it("no matching groups → no match", () => {
      const conditions = {
        groups: [
          { categories: ["purchasing"], departments: ["Marketing"] },
          { categories: ["expenses"], departments: ["Engineering"] },
        ],
      };
      const result = evaluateRouteConditions(
        conditions,
        "contracts", // neither group has contracts
        "HR",
        null
      );
      expect(result.matches).toBe(false);
    });

    it("both groups match → returns best score", () => {
      const conditions = {
        groups: [
          { categories: ["purchasing"] }, // score 1
          { categories: ["purchasing"], departments: ["Marketing"] }, // score 2
        ],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        "Marketing",
        null
      );
      expect(result.matches).toBe(true);
      expect(result.score).toBe(2); // best group
    });

    it("group with category_type_ids → matches", () => {
      const conditions = {
        groups: [
          {
            categories: ["purchasing"],
            category_type_ids: ["ct-uuid-office"],
          },
        ],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        null,
        null,
        "ct-uuid-office"
      );
      expect(result.matches).toBe(true);
      expect(result.score).toBe(2);
    });

    it("group with category_type_ids mismatch → no match", () => {
      const conditions = {
        groups: [
          {
            categories: ["purchasing"],
            category_type_ids: ["ct-uuid-office"],
          },
        ],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        null,
        null,
        "ct-uuid-hardware"
      );
      expect(result.matches).toBe(false);
    });
  });

  describe("scoring — most specific wins", () => {
    it("route with more conditions scores higher", () => {
      const generalRoute = { categories: ["purchasing"] };
      const specificRoute = {
        categories: ["purchasing"],
        departments: ["Marketing"],
        min_amount: 100000,
      };

      const generalResult = evaluateRouteConditions(
        generalRoute,
        "purchasing",
        "Marketing",
        200000
      );
      const specificResult = evaluateRouteConditions(
        specificRoute,
        "purchasing",
        "Marketing",
        200000
      );

      expect(generalResult.score).toBe(1);
      expect(specificResult.score).toBe(3);
      expect(specificResult.score).toBeGreaterThan(generalResult.score);
    });

    it("route with 5 conditions has max score of 5", () => {
      const conditions = {
        categories: ["purchasing"],
        departments: ["Marketing"],
        min_amount: 100000,
        max_amount: 500000,
        category_type_ids: ["ct-uuid-1"],
      };
      const result = evaluateRouteConditions(
        conditions,
        "purchasing",
        "Marketing",
        200000,
        "ct-uuid-1"
      );
      expect(result).toEqual({ matches: true, score: 5 });
    });
  });

  describe("edge cases", () => {
    it("amount exactly at min_amount boundary (strict >) → no match", () => {
      const result = evaluateRouteConditions(
        { min_amount: 100000 },
        null,
        null,
        100000
      );
      expect(result.matches).toBe(false);
    });

    it("amount exactly at min_amount boundary (inclusive >=) → matches", () => {
      const result = evaluateRouteConditions(
        { min_amount: 100000, min_amount_inclusive: true },
        null,
        null,
        100000
      );
      expect(result.matches).toBe(true);
    });

    it("amount exactly at max_amount boundary (strict <) → no match", () => {
      const result = evaluateRouteConditions(
        { max_amount: 500000 },
        null,
        null,
        500000
      );
      expect(result.matches).toBe(false);
    });

    it("amount exactly at max_amount boundary (inclusive <=) → matches", () => {
      const result = evaluateRouteConditions(
        { max_amount: 500000, max_amount_inclusive: true },
        null,
        null,
        500000
      );
      expect(result.matches).toBe(true);
    });

    it("amount 0 vs min_amount 0 (strict >) → no match", () => {
      const result = evaluateRouteConditions(
        { min_amount: 0 },
        null,
        null,
        0
      );
      expect(result.matches).toBe(false);
    });

    it("amount 0 vs min_amount 0 (inclusive >=) → matches", () => {
      const result = evaluateRouteConditions(
        { min_amount: 0, min_amount_inclusive: true },
        null,
        null,
        0
      );
      expect(result.matches).toBe(true);
    });

    it("empty groups array → matches (no conditions)", () => {
      const result = evaluateRouteConditions(
        { groups: [] },
        "purchasing"
      );
      // groups array exists but is empty — no group matches → false
      expect(result.matches).toBe(false);
    });
  });
});
