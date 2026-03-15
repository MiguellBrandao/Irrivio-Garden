export type CompanyRole = "admin" | "employee"

export type AuthCompany = {
  id: string
  name: string
  slug: string
  logo_path: string | null
  favicon_path: string | null
  address: string
  nif: string
  mobile_phone: string
  email: string
  iban: string
  role: CompanyRole
}

export type AuthUser = {
  id: string
  name: string
  email: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  user: AuthUser
  companies: AuthCompany[]
}

export type UpdateProfilePayload = {
  name?: string
  password?: string
}

export type UserResponse = {
  user: AuthUser
}

export type RefreshResponse = {
  accessToken: string
}

export type MeResponse = {
  user: AuthUser
  companies: AuthCompany[]
}
