INSERT INTO "companies" (
	"name",
	"slug",
	"address",
	"nif",
	"mobile_phone",
	"email",
	"iban"
)
VALUES (
	'Floripa Jardins',
	'floripa-jardins',
	'Rua Horta do Palacio- Edf. Palacio Apart.1007, 8500-512 Portimao',
	'233125825',
	'965403815',
	'talesbrandao@hotmail.com',
	'PT 50 0007 02 87 302 5220 0028 0'
)
ON CONFLICT ("slug") DO UPDATE
SET
	"name" = EXCLUDED."name",
	"address" = EXCLUDED."address",
	"nif" = EXCLUDED."nif",
	"mobile_phone" = EXCLUDED."mobile_phone",
	"email" = EXCLUDED."email",
	"iban" = EXCLUDED."iban";
