BEGIN;

CREATE TABLE garden_teams (
  garden_id uuid NOT NULL REFERENCES gardens(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (garden_id, team_id)
);

INSERT INTO garden_teams (garden_id, team_id)
SELECT id, team_id
FROM gardens
WHERE team_id IS NOT NULL;

ALTER TABLE gardens DROP CONSTRAINT IF EXISTS gardens_team_id_fkey;
ALTER TABLE gardens DROP COLUMN IF EXISTS team_id;

COMMIT;
