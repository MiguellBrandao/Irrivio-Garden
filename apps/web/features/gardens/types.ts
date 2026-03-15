export type GardenStatus = "active" | "paused" | "cancelled"
export type GardenFrequency = "weekly" | "biweekly" | "monthly"

export type Garden = {
  id: string
  company_id: string
  client_name: string
  address: string
  phone: string | null
  monthly_price?: string | null
  maintenance_frequency: GardenFrequency | null
  start_date?: string | null
  billing_day?: number | null
  status: GardenStatus
  notes: string | null
  created_at: string
}

export type SaveGardenPayload = {
  client_name: string
  address: string
  phone?: string
  monthly_price?: number
  maintenance_frequency?: GardenFrequency
  start_date?: string
  billing_day?: number
  status?: GardenStatus
  notes?: string
}
