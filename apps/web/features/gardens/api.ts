import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type { Garden, SaveGardenPayload } from "@/features/gardens/types"

export function listGardens(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Garden[]>(appendCompanyId("/gardens", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function getGardenById(authToken: string, gardenId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Garden>(appendCompanyId(`/gardens/${gardenId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createGarden(authToken: string, payload: SaveGardenPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Garden>("/gardens", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateGarden(
  authToken: string,
  gardenId: string,
  payload: SaveGardenPayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Garden> & { id: string }>(`/gardens/${gardenId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deleteGarden(authToken: string, gardenId: string) {
  return apiFetch<void>(`/gardens/${gardenId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
