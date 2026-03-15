import { useAuthStore } from "@/lib/auth/store"

export function getActiveCompanyId() {
  return useAuthStore.getState().activeCompanyId
}

export function requireActiveCompanyId() {
  const companyId = getActiveCompanyId()

  if (!companyId) {
    throw new Error("Seleciona uma empresa antes de continuar.")
  }

  return companyId
}

export function appendCompanyId(path: string, companyId: string) {
  const separator = path.includes("?") ? "&" : "?"
  return `${path}${separator}company_id=${encodeURIComponent(companyId)}`
}
