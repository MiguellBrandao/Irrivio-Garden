export type GardenStatus = "active" | "paused" | "cancelled"
export type GardenFrequency = "weekly" | "biweekly" | "monthly"
export type GardenWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type Garden = {
  id: string
  company_id: string
  client_name: string
  address: string
  phone: string | null
  monthly_price?: string | null
  is_regular_service: boolean
  show_in_calendar: boolean
  maintenance_frequency: GardenFrequency | null
  maintenance_day_of_week: GardenWeekday | null
  maintenance_anchor_date?: string | null
  maintenance_start_time?: string | null
  maintenance_end_time?: string | null
  start_date?: string | null
  billing_day?: number | null
  status: GardenStatus
  notes: string | null
  team_ids: string[]
  created_at: string
}

export type GardenProductUsage = {
  id: string
  company_id: string
  product_id: string
  product_name: string
  product_unit: import("@/features/stock/types").ProductUnit
  garden_id: string
  task_id: string | null
  company_membership_id: string | null
  company_membership_name: string | null
  quantity: string
  date: string
  notes: string | null
}

export type GardenExpenseCategory =
  | "fuel"
  | "tolls"
  | "parking"
  | "equipment"
  | "maintenance"
  | "transport"
  | "other"

export type IrrigationFrequencyType = "daily" | "every_n_days" | "weekly"

export type IrrigationWeekDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

export type GardenExpense = {
  id: string
  company_id: string
  garden_id: string
  category: GardenExpenseCategory
  description: string | null
  amount: string
  date: string
}

export type IrrigationZone = {
  id: string
  company_id: string
  garden_id: string
  name: string
  frequency_type: IrrigationFrequencyType
  interval_days: number | null
  week_days: IrrigationWeekDay[]
  start_date: string
  start_time: string
  end_time: string
  active: boolean
  created_at: string
}

export type SaveGardenPayload = {
  client_name: string
  address: string
  phone?: string
  monthly_price?: number | null
  is_regular_service?: boolean
  show_in_calendar?: boolean
  maintenance_frequency?: GardenFrequency | null
  maintenance_day_of_week?: GardenWeekday | null
  maintenance_anchor_date?: string | null
  maintenance_start_time?: string | null
  maintenance_end_time?: string | null
  start_date?: string | null
  billing_day?: number | null
  status?: GardenStatus
  notes?: string | null
  team_id?: string | null
  team_ids?: string[] | null
}

export type SaveGardenProductUsagePayload = {
  product_id: string
  quantity: number
  date: string
  notes?: string
  task_id?: string
}

export type SaveGardenExpensePayload = {
  category: GardenExpenseCategory
  description?: string
  amount: number
  date: string
}

export type SaveIrrigationZonePayload = {
  name: string
  frequency_type: IrrigationFrequencyType
  interval_days?: number
  week_days?: IrrigationWeekDay[]
  start_date: string
  start_time: string
  end_time: string
  active?: boolean
}
