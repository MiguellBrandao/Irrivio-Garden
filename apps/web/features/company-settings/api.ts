import { apiFetch } from "@/lib/api/http"
import type { AuthCompany } from "@/lib/auth/types"

export type UpdateCompanySettingsPayload = {
  name: string
  slug: string
  logo_path?: string
  favicon_path?: string
  address: string
  nif: string
  mobile_phone: string
  email: string
  iban: string
}

export function getCompanyById(authToken: string, companyId: string) {
  return apiFetch<AuthCompany>(`/companies/${companyId}`, {
    authToken,
    requireAuth: true,
  })
}

export function updateCompanySettings(
  authToken: string,
  companyId: string,
  payload: UpdateCompanySettingsPayload
) {
  return apiFetch<AuthCompany>(`/companies/${companyId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify(payload),
  })
}
