import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type { Payment, SavePaymentPayload } from "@/features/payments/types"

export function listPayments(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Payment[]>(appendCompanyId("/payments", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function getPaymentById(authToken: string, paymentId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Payment>(appendCompanyId(`/payments/${paymentId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createPayment(authToken: string, payload: SavePaymentPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Payment>("/payments", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updatePayment(
  authToken: string,
  paymentId: string,
  payload: SavePaymentPayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Payment> & { id: string }>(`/payments/${paymentId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deletePayment(authToken: string, paymentId: string) {
  return apiFetch<void>(`/payments/${paymentId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
