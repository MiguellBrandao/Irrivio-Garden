import type { TeamFormValues } from "@/features/teams/schema"
import type { SaveTeamPayload, Team } from "@/features/teams/types"

export function toTeamPayload(values: TeamFormValues): SaveTeamPayload {
  return {
    name: values.name.trim(),
  }
}

export function toTeamFormValues(team: Team): TeamFormValues {
  return {
    name: team.name,
  }
}

export function formatTeamDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}
