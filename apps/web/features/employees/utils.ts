import type { EmployeeFormValues } from "@/features/employees/schema"
import type {
  CreateEmployeePayload,
  Employee,
  UpdateEmployeePayload,
} from "@/features/employees/types"

export function toCreateEmployeePayload(
  values: EmployeeFormValues
): CreateEmployeePayload {
  return {
    email: values.email.trim().toLowerCase(),
    password: values.password.trim(),
    role: values.role,
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    team_ids: values.team_ids,
    active: values.active,
  }
}

export function toUpdateEmployeePayload(
  values: EmployeeFormValues
): UpdateEmployeePayload {
  return {
    role: values.role,
    name: values.name.trim(),
    phone: values.phone?.trim() || undefined,
    team_ids: values.team_ids,
    active: values.active,
  }
}

export function toEmployeeFormValues(employee: Employee): EmployeeFormValues {
  return {
    role: employee.role,
    name: employee.name,
    email: employee.email ?? "",
    password: "",
    phone: employee.phone ?? "",
    active: employee.active ?? true,
    team_ids: employee.team_ids ?? [],
  }
}

export function formatEmployeeDate(value?: string) {
  if (!value) {
    return "-"
  }

  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}
