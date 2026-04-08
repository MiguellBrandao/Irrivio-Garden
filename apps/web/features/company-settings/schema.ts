import { z } from "zod"

export const companySettingsFormSchema = z.object({
  name: z.string().trim().min(1, "Indica o nome da empresa."),
  slug: z.string().trim().min(1, "Indica o slug da empresa."),
  logo_path: z.string(),
  favicon_path: z.string(),
  address: z.string().trim().min(1, "Indica a morada."),
  nif: z.string().trim().min(1, "Indica o NIF."),
  mobile_phone: z.string().trim().min(1, "Indica o telemovel."),
  email: z.string().trim().email("Indica um email valido."),
  iban: z.string().trim().min(1, "Indica o IBAN."),
})

export type CompanySettingsFormValues = z.infer<typeof companySettingsFormSchema>

export const companySettingsFormDefaults: CompanySettingsFormValues = {
  name: "",
  slug: "",
  logo_path: "",
  favicon_path: "",
  address: "",
  nif: "",
  mobile_phone: "",
  email: "",
  iban: "",
}
