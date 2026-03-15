import { z } from "zod"

export const loginFormSchema = z.object({
  email: z.email("Introduce um email valido."),
  password: z
    .string()
    .min(6, "A password tem de ter pelo menos 6 caracteres."),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>
