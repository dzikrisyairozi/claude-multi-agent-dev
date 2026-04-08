-- Add "other" to allowed categories
ALTER TABLE category_types DROP CONSTRAINT IF EXISTS category_types_category_check;
ALTER TABLE category_types ADD CONSTRAINT category_types_category_check
  CHECK (category IN ('purchasing', 'contracts', 'expenses', 'other'));
