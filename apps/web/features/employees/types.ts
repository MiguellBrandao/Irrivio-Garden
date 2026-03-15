import type { CompanyRole } from "@/lib/auth/types"

export type Employee = {
  id: string
  company_id: string
  user_id?: string | null
  email?: string | null
  role: CompanyRole
  name: string
  phone: string | null
  active?: boolean
  created_at?: string
  team_ids: string[]
}

export type TeamOption = {
  id: string
  company_id?: string
  name: string
  created_at: string
}

export type CreateEmployeePayload = {
  email: string
  password: string
  role: CompanyRole
  name: string
  phone?: string
  team_ids?: string[]
  active?: boolean
}

export type UpdateEmployeePayload = {
  role?: CompanyRole
  name?: string
  phone?: string
  team_ids?: string[]
  active?: boolean
}
