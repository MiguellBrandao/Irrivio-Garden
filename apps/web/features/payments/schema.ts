import { z } from "zod"

export const paymentFormSchema = z.object({
  garden_id: z.string().min(1, "Seleciona um jardim."),
  billing_date: z.string().min(1, "Seleciona o mes e ano."),
  amount: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Indica um valor igual ou superior a 0."
    ),
  paid_at: z.string().trim().optional(),
  notes: z.string().trim().optional(),
})

export type PaymentFormValues = z.infer<typeof paymentFormSchema>

export const paymentFormDefaults: PaymentFormValues = {
  garden_id: "",
  billing_date: "",
  amount: "",
  paid_at: "",
  notes: "",
}
