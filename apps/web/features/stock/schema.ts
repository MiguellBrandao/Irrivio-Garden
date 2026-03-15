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

export type ProductFormValues = z.infer<typeof productFormSchema>
export type StockQuantityValues = z.infer<typeof stockQuantitySchema>

export const productFormDefaults: ProductFormValues = {
  name: "",
  unit: "unit",
  stock_quantity: "0",
}
