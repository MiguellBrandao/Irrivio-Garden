import { z } from "zod"

export const employeeFormSchema = z.object({
  role: z.enum(["admin", "employee"]),
  name: z.string().min(1, "Indica o nome do membro."),
  email: z.string(),
  password: z.string(),
  phone: z.string().trim().optional(),
  active: z.boolean(),
  team_ids: z.array(z.string()),
})

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>

export const employeeFormDefaults: EmployeeFormValues = {
  role: "employee",
  name: "",
  email: "",
  password: "",
  phone: "",
  active: true,
  team_ids: [],
}
