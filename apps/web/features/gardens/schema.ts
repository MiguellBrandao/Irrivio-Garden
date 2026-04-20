import { z } from "zod"

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/
const isoTimeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

export const gardenFormSchema = z
  .object({
    client_name: z.string().min(1, "Indica o nome do cliente."),
    address: z.string().min(1, "Indica a morada."),
    phone: z.string().trim().optional(),
    monthly_price: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || (!Number.isNaN(Number(value)) && Number(value) >= 0),
        "O valor mensal tem de ser um numero igual ou superior a 0."
      ),
    is_regular_service: z.boolean(),
    show_in_calendar: z.boolean(),
    maintenance_frequency: z.enum(["weekly", "biweekly", "monthly"]),
    maintenance_day_of_week: z.enum([
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ]),
    team_ids: z.array(z.string()),
    maintenance_anchor_date: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isoDateRegex.test(value),
        "A data base tem de estar no formato YYYY-MM-DD."
      ),
    maintenance_start_time: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isoTimeRegex.test(value),
        "A hora de inicio tem de estar no formato HH:mm."
      ),
    maintenance_end_time: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isoTimeRegex.test(value),
        "A hora de fim tem de estar no formato HH:mm."
      ),
    start_date: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || isoDateRegex.test(value),
        "A data de inicio tem de estar no formato YYYY-MM-DD."
      ),
    billing_day: z
      .string()
      .trim()
      .refine(
        (value) =>
          value === "" ||
          (!Number.isNaN(Number(value)) && Number(value) >= 1 && Number(value) <= 31),
        "O dia de cobranca deve estar entre 1 e 31."
      ),
    status: z.enum(["active", "paused", "cancelled"]),
    notes: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.is_regular_service) {
      return
    }

    if (values.maintenance_frequency === "weekly" && !values.maintenance_day_of_week) {
      ctx.addIssue({
        code: "custom",
        path: ["maintenance_day_of_week"],
        message: "Escolhe o dia da semana da manutencao.",
      })
    }

    if (
      (values.maintenance_frequency === "biweekly" ||
        values.maintenance_frequency === "monthly") &&
      !values.maintenance_anchor_date.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maintenance_anchor_date"],
        message: "Indica a data base da recorrencia.",
      })
    }

    if (
      values.maintenance_start_time.trim() &&
      values.maintenance_end_time.trim() &&
      values.maintenance_end_time < values.maintenance_start_time
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["maintenance_end_time"],
        message: "A hora de fim deve ser posterior a hora de inicio.",
      })
    }
  })

export type GardenFormValues = z.infer<typeof gardenFormSchema>

export const gardenFormDefaults: GardenFormValues = {
  client_name: "",
  address: "",
  phone: "",
  monthly_price: "",
  is_regular_service: true,
  show_in_calendar: true,
  maintenance_frequency: "weekly",
  maintenance_day_of_week: "monday",
  maintenance_anchor_date: "",
  maintenance_start_time: "",
  maintenance_end_time: "",
  start_date: "",
  billing_day: "",
  status: "active",
  notes: "",
  team_ids: [],
}
