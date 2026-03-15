import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type { SaveTeamPayload, Team } from "@/features/teams/types"

export function listTeams(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Team[]>(appendCompanyId("/teams", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function getTeamById(authToken: string, teamId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Team>(appendCompanyId(`/teams/${teamId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createTeam(authToken: string, payload: SaveTeamPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Team>("/teams", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateTeam(
  authToken: string,
  teamId: string,
  payload: SaveTeamPayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Team> & { id: string }>(`/teams/${teamId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deleteTeam(authToken: string, teamId: string) {
  return apiFetch<void>(`/teams/${teamId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
