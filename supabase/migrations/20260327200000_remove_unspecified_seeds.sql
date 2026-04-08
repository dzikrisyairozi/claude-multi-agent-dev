-- "Unspecified" is not a real category type — it means category_type_id = null on submission
DELETE FROM category_types WHERE name = 'Unspecified';
