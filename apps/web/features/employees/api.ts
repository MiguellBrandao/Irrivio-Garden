import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type {
  CreateEmployeePayload,
  Employee,
  TeamOption,
  UpdateEmployeePayload,
} from "@/features/employees/types"

export function listEmployees(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Employee[]>(appendCompanyId("/company-memberships", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function getEmployeeById(authToken: string, employeeId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Employee>(appendCompanyId(`/company-memberships/${employeeId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createEmployee(
  authToken: string,
  payload: CreateEmployeePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Employee>("/company-memberships", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateEmployee(
  authToken: string,
  employeeId: string,
  payload: UpdateEmployeePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Employee> & { id: string }>(`/company-memberships/${employeeId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function listTeams(authToken: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<TeamOption[]>(appendCompanyId("/teams", companyId), {
    authToken,
    requireAuth: true,
  })
}

export function deleteEmployee(authToken: string, employeeId: string) {
  return apiFetch<void>(`/company-memberships/${employeeId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}
