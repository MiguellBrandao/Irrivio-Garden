import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type {
  GardenExpense,
  GardenProductUsage,
  Garden,
  IrrigationZone,
  SaveGardenExpensePayload,
  SaveGardenPayload,
  SaveGardenProductUsagePayload,
  SaveIrrigationZonePayload,
} from "@/features/gardens/types"

type ProductUsageFilters = {
  garden_id?: string
  date_from?: string
  date_to?: string
}

type ExpenseFilters = {
  garden_id?: string
  date_from?: string
  date_to?: string
}

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

export function listGardenProductUsage(authToken: string, gardenId: string) {
  return listProductUsage(authToken, { garden_id: gardenId })
}

export function listProductUsage(authToken: string, filters?: ProductUsageFilters) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams({ company_id: companyId })

  if (filters?.garden_id) {
    params.set("garden_id", filters.garden_id)
  }
  if (filters?.date_from) {
    params.set("date_from", filters.date_from)
  }
  if (filters?.date_to) {
    params.set("date_to", filters.date_to)
  }

  return apiFetch<GardenProductUsage[]>(`/product-usage?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function createGardenProductUsage(
  authToken: string,
  gardenId: string,
  payload: SaveGardenProductUsagePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<GardenProductUsage>("/product-usage", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function updateGardenProductUsage(
  authToken: string,
  usageId: string,
  gardenId: string,
  payload: SaveGardenProductUsagePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<GardenProductUsage> & { id: string }>(`/product-usage/${usageId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function deleteGardenProductUsage(authToken: string, usageId: string) {
  return apiFetch<void>(`/product-usage/${usageId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}

export function listGardenExpenses(authToken: string, gardenId: string) {
  return listExpenses(authToken, { garden_id: gardenId })
}

export function listExpenses(authToken: string, filters?: ExpenseFilters) {
  const companyId = requireActiveCompanyId()

  const params = new URLSearchParams({ company_id: companyId })

  if (filters?.garden_id) {
    params.set("garden_id", filters.garden_id)
  }
  if (filters?.date_from) {
    params.set("date_from", filters.date_from)
  }
  if (filters?.date_to) {
    params.set("date_to", filters.date_to)
  }

  return apiFetch<GardenExpense[]>(`/expenses?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function createGardenExpense(
  authToken: string,
  gardenId: string,
  payload: SaveGardenExpensePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<GardenExpense>("/expenses", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function updateGardenExpense(
  authToken: string,
  expenseId: string,
  gardenId: string,
  payload: SaveGardenExpensePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<GardenExpense> & { id: string }>(`/expenses/${expenseId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function deleteGardenExpense(authToken: string, expenseId: string) {
  return apiFetch<void>(`/expenses/${expenseId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}

export function listGardenIrrigationZones(authToken: string, gardenId: string) {
  return listIrrigationZones(authToken, gardenId)
}

export function listIrrigationZones(authToken: string, gardenId?: string) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams({ company_id: companyId })

  if (gardenId) {
    params.set("garden_id", gardenId)
  }

  return apiFetch<IrrigationZone[]>(`/irrigation-zones?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function createGardenIrrigationZone(
  authToken: string,
  gardenId: string,
  payload: SaveIrrigationZonePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<IrrigationZone>("/irrigation-zones", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function updateGardenIrrigationZone(
  authToken: string,
  zoneId: string,
  gardenId: string,
  payload: SaveIrrigationZonePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<IrrigationZone> & { id: string }>(`/irrigation-zones/${zoneId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({
      ...payload,
      garden_id: gardenId,
      company_id: companyId,
    }),
  })
}

export function deleteGardenIrrigationZone(authToken: string, zoneId: string) {
  return apiFetch<void>(`/irrigation-zones/${zoneId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
