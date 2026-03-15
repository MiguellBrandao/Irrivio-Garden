import { z } from "zod"

export const gardenFormSchema = z.object({
  client_name: z.string().min(1, "Indica o nome do cliente."),
  address: z.string().min(1, "Indica a morada."),
  phone: z.string().trim().optional(),
  monthly_price: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
      "O valor mensal tem de ser um número igual ou superior a 0."
    ),
  maintenance_frequency: z.enum(["weekly", "biweekly", "monthly"]),
  start_date: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "A data de início tem de estar no formato YYYY-MM-DD."
    ),
  billing_day: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        (!Number.isNaN(Number(value)) &&
          Number(value) >= 1 &&
          Number(value) <= 31),
      "O dia de cobrança deve estar entre 1 e 31."
    ),
  status: z.enum(["active", "paused", "cancelled"]),
  notes: z.string().trim().optional(),
})

export type GardenFormValues = z.infer<typeof gardenFormSchema>

export const gardenFormDefaults: GardenFormValues = {
  client_name: "",
  address: "",
  phone: "",
  monthly_price: "",
  maintenance_frequency: "weekly",
  start_date: "",
  billing_day: "",
  status: "active",
  notes: "",
}
