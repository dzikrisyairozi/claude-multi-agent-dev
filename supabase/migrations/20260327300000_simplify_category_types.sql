-- Simplify category_types: remove max_amount and attachment_requirement
ALTER TABLE category_types DROP COLUMN IF EXISTS max_amount;
ALTER TABLE category_types DROP COLUMN IF EXISTS attachment_requirement;
