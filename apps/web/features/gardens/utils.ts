import type {
  Garden,
  GardenFrequency,
  GardenStatus,
  SaveGardenPayload,
} from "@/features/gardens/types"
import type { GardenFormValues } from "@/features/gardens/schema"

export const frequencyLabels: Record<GardenFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quinzenal",
  monthly: "Mensal",
}

export const statusLabels: Record<GardenStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  cancelled: "Cancelado",
}

export function toGardenPayload(values: GardenFormValues): SaveGardenPayload {
  return {
    client_name: values.client_name.trim(),
    address: values.address.trim(),
    phone: values.phone?.trim() || undefined,
    monthly_price:
      values.monthly_price.trim() === ""
        ? undefined
        : Number(values.monthly_price),
    maintenance_frequency: values.maintenance_frequency,
    start_date: values.start_date.trim() || undefined,
    billing_day:
      values.billing_day.trim() === "" ? undefined : Number(values.billing_day),
    status: values.status,
    notes: values.notes?.trim() || undefined,
  }
}

export function toGardenFormValues(garden: Garden): GardenFormValues {
  return {
    client_name: garden.client_name,
    address: garden.address,
    phone: garden.phone ?? "",
    monthly_price: garden.monthly_price ?? "",
    maintenance_frequency: garden.maintenance_frequency ?? "weekly",
    start_date: garden.start_date ?? "",
    billing_day: garden.billing_day?.toString() ?? "",
    status: garden.status,
    notes: garden.notes ?? "",
  }
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(value)
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
  }).format(new Date(value))
}
