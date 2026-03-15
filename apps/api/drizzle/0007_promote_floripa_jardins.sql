DO $$
DECLARE
	default_company_id uuid;
	floripa_company_id uuid;
BEGIN
	SELECT "id"
	INTO default_company_id
	FROM "companies"
	WHERE "slug" = 'default-company'
	LIMIT 1;

	SELECT "id"
	INTO floripa_company_id
	FROM "companies"
	WHERE "slug" = 'floripa-jardins'
	LIMIT 1;

	IF floripa_company_id IS NULL AND default_company_id IS NOT NULL THEN
		UPDATE "companies"
		SET
			"name" = 'Floripa Jardins',
			"slug" = 'floripa-jardins',
			"address" = 'Rua Horta do Palacio- Edf. Palacio Apart.1007, 8500-512 Portimao',
			"nif" = '233125825',
			"mobile_phone" = '965403815',
			"email" = 'talesbrandao@hotmail.com',
			"iban" = 'PT 50 0007 02 87 302 5220 0028 0'
		WHERE "id" = default_company_id;
	ELSIF floripa_company_id IS NOT NULL AND default_company_id IS NOT NULL AND floripa_company_id <> default_company_id THEN
		UPDATE "employees"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "employee_teams"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "teams"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "gardens"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "tasks"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "work_logs"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "products"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "product_usage"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "payments"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		UPDATE "quotes"
		SET "company_id" = floripa_company_id
		WHERE "company_id" = default_company_id;

		DELETE FROM "companies"
		WHERE "id" = default_company_id;
	END IF;
END $$;
