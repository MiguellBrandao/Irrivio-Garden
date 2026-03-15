import { z } from "zod"

import { TASK_TYPES } from "@/features/calendar/types"

const timePattern = /^\d{2}:\d{2}$/

export const taskFormSchema = z
  .object({
    garden_id: z.string().min(1, "Seleciona o jardim."),
    team_id: z.string().min(1, "Seleciona a equipa."),
    date: z
      .string()
      .trim()
      .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Seleciona a data."),
    task_type: z.enum(TASK_TYPES),
    start_time: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || timePattern.test(value),
        "A hora inicial deve estar no formato HH:mm."
      ),
    end_time: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || timePattern.test(value),
        "A hora final deve estar no formato HH:mm."
      ),
    description: z.string().trim().optional(),
  })
  .superRefine((values, context) => {
    if (
      values.start_time &&
      values.end_time &&
      values.end_time < values.start_time
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["end_time"],
        message: "A hora final nao pode ser mais cedo do que a hora inicial.",
      })
    }
  })

export type TaskFormValues = z.infer<typeof taskFormSchema>

export const taskFormDefaults: TaskFormValues = {
  garden_id: "",
  team_id: "",
  date: "",
  task_type: "maintenance",
  start_time: "",
  end_time: "",
  description: "",
}
