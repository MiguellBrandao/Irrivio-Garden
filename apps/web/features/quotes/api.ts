import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type { Quote, SaveQuotePayload } from "@/features/quotes/types"

export function listQuotes(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Quote[]>(appendCompanyId("/quotes", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function getQuoteById(authToken: string, quoteId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Quote>(appendCompanyId(`/quotes/${quoteId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createQuote(authToken: string, payload: SaveQuotePayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Quote>("/quotes", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateQuote(
  authToken: string,
  quoteId: string,
  payload: SaveQuotePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Quote>(`/quotes/${quoteId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deleteQuote(authToken: string, quoteId: string) {
  return apiFetch<void>(`/quotes/${quoteId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
