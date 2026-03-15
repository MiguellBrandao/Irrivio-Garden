import { z } from "zod"

const serviceLineSchema = z.object({
  value: z.string().trim().min(1, "Indica o servico."),
})

export const quoteFormSchema = z.object({
  garden_id: z.string().min(1, "Seleciona o jardim."),
  valid_until: z
    .string()
    .trim()
    .refine(
      (value) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      "A validade tem de estar no formato YYYY-MM-DD."
    ),
  price: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "O valor tem de ser um numero igual ou superior a 0."
    ),
  services: z.array(serviceLineSchema).min(1, "Adiciona pelo menos um servico."),
})

export type QuoteFormValues = z.infer<typeof quoteFormSchema>

function getDefaultValidUntil() {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().slice(0, 10)
}

export const quoteFormDefaults: QuoteFormValues = {
  garden_id: "",
  valid_until: getDefaultValidUntil(),
  price: "",
  services: [{ value: "" }],
}
