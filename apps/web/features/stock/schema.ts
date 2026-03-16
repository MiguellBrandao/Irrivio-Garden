import { z } from "zod"

export const productFormSchema = z.object({
  name: z.string().min(1, "Indica o nome do produto."),
  unit: z.enum(["unit", "kg", "g", "l", "ml", "m", "m2", "m3", "pack"]),
  stock_quantity: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Indica uma quantidade igual ou superior a 0."
    ),
  unit_price: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Indica um valor igual ou superior a 0."
    ),
})

export const stockQuantitySchema = z.object({
  stock_quantity: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Indica uma quantidade igual ou superior a 0."
    ),
})

export const stockRuleFormSchema = z.object({
  product_id: z.string().min(1, "Seleciona um produto."),
  operator: z.enum(["lt", "lte", "eq", "gt", "gte"]),
  threshold_quantity: z
    .string()
    .trim()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Indica uma quantidade igual ou superior a 0."
    ),
  emails: z
    .array(
      z.object({
        value: z
          .string()
          .trim()
          .min(1, "Indica um email.")
          .email("Indica um email valido."),
      })
    )
    .min(1, "Indica pelo menos um email valido."),
})

export type ProductFormValues = z.infer<typeof productFormSchema>
export type StockQuantityValues = z.infer<typeof stockQuantitySchema>
export type StockRuleFormValues = z.infer<typeof stockRuleFormSchema>

export const productFormDefaults: ProductFormValues = {
  name: "",
  unit: "unit",
  stock_quantity: "0",
  unit_price: "0",
}

export const stockRuleFormDefaults: StockRuleFormValues = {
  product_id: "",
  operator: "lt",
  threshold_quantity: "0",
  emails: [{ value: "" }],
}
