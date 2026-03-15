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
