import { apiFetch } from "@/lib/api/http"
import {
  appendCompanyId,
  requireActiveCompanyId,
} from "@/lib/auth/company"

import type {
  CompleteTaskPayload,
  CreateTaskProductUsagePayload,
  SaveTaskPayload,
  Task,
  TaskProductUsage,
  TaskWorkLog,
} from "@/features/calendar/types"

type ListTasksFilters = {
  garden_id?: string
  team_id?: string
  date_from?: string
  date_to?: string
}

export function listTasks(authToken: string, filters?: ListTasksFilters) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams()

  params.set("company_id", companyId)

  if (filters?.garden_id) {
    params.set("garden_id", filters.garden_id)
  }

  if (filters?.team_id) {
    params.set("team_id", filters.team_id)
  }

  if (filters?.date_from) {
    params.set("date_from", filters.date_from)
  }

  if (filters?.date_to) {
    params.set("date_to", filters.date_to)
  }

  const query = params.toString()

  return apiFetch<Task[]>(`/tasks${query ? `?${query}` : ""}`, {
    authToken,
    requireAuth: true,
  })
}

export function getTaskById(authToken: string, taskId: string) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Task>(appendCompanyId(`/tasks/${taskId}`, companyId), {
    authToken,
    requireAuth: true,
  })
}

export function createTask(authToken: string, payload: SaveTaskPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Task>("/tasks", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateTask(
  authToken: string,
  taskId: string,
  payload: SaveTaskPayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<Task> & { id: string }>(`/tasks/${taskId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deleteTask(authToken: string, taskId: string) {
  return apiFetch<void>(`/tasks/${taskId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}

export function listTaskProductUsage(authToken: string, taskId: string) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams({
    company_id: companyId,
    task_id: taskId,
  })

  return apiFetch<TaskProductUsage[]>(`/product-usage?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function createTaskProductUsage(
  authToken: string,
  payload: CreateTaskProductUsagePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<TaskProductUsage>("/product-usage", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function updateTaskProductUsage(
  authToken: string,
  usageId: string,
  payload: CreateTaskProductUsagePayload
) {
  const companyId = requireActiveCompanyId()

  return apiFetch<Partial<TaskProductUsage> & { id: string }>(`/product-usage/${usageId}`, {
    method: "PATCH",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}

export function deleteTaskProductUsage(authToken: string, usageId: string) {
  return apiFetch<void>(`/product-usage/${usageId}`, {
    method: "DELETE",
    authToken,
    requireAuth: true,
  })
}

export function listTaskWorkLogs(authToken: string, taskId: string) {
  const companyId = requireActiveCompanyId()
  const params = new URLSearchParams({
    company_id: companyId,
    task_id: taskId,
  })

  return apiFetch<TaskWorkLog[]>(`/worklogs?${params.toString()}`, {
    authToken,
    requireAuth: true,
  })
}

export function completeTask(authToken: string, payload: CompleteTaskPayload) {
  const companyId = requireActiveCompanyId()

  return apiFetch<TaskWorkLog>("/worklogs", {
    method: "POST",
    authToken,
    requireAuth: true,
    body: JSON.stringify({ ...payload, company_id: companyId }),
  })
}
