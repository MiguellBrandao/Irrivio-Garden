import { z } from "zod"

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Indica o nome da equipa.")
    .max(150, "O nome da equipa nao pode ter mais de 150 caracteres."),
})

export type TeamFormValues = z.infer<typeof teamFormSchema>

export const teamFormDefaults: TeamFormValues = {
  name: "",
}
