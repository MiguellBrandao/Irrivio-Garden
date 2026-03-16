import type { ProductUnit } from "@/features/stock/types"

export const TASK_TYPES = [
  "maintenance",
  "pruning",
  "cleaning",
  "installation",
  "inspection",
  "emergency",
] as const

export type TaskType = (typeof TASK_TYPES)[number]

export type Task = {
  id: string
  company_id: string
  garden_id: string
  team_id: string | null
  date: string
  start_time: string | null
  end_time: string | null
  task_type: TaskType
  description: string | null
  created_at: string
}

export type SaveTaskPayload = {
  garden_id: string
  team_id: string
  date: string
  start_time?: string
  end_time?: string
  task_type: TaskType
  description?: string
}

export type TaskProductUsage = {
  id: string
  company_id: string
  product_id: string
  product_name: string
  product_unit: ProductUnit
  garden_id: string
  task_id: string | null
  company_membership_id: string | null
  company_membership_name: string | null
  quantity: string
  date: string
  notes: string | null
}

export type CreateTaskProductUsagePayload = {
  garden_id: string
  task_id: string
  product_id: string
  quantity: number
  date: string
  notes?: string
}

export type TaskWorkLog = {
  id: string
  company_id: string
  task_id: string
  team_id: string
  garden_id: string
  start_time: string | null
  end_time: string | null
  description: string | null
  created_at: string
}

export type CompleteTaskPayload = {
  task_id: string
  team_id: string
  start_time: string
  end_time: string
  description?: string
}
