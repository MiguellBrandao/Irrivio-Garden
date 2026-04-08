import type { AuthCompany } from "@/lib/auth/types"
import type { CompanySettingsFormValues } from "@/features/company-settings/schema"
import type { UpdateCompanySettingsPayload } from "@/features/company-settings/api"

export function toCompanySettingsFormValues(
  company: AuthCompany
): CompanySettingsFormValues {
  return {
    name: company.name,
    slug: company.slug,
    logo_path: company.logo_path ?? "",
    favicon_path: company.favicon_path ?? "",
    address: company.address,
    nif: company.nif,
    mobile_phone: company.mobile_phone,
    email: company.email,
    iban: company.iban,
  }
}

export function toCompanySettingsPayload(
  values: CompanySettingsFormValues
): UpdateCompanySettingsPayload {
  return {
    name: values.name.trim(),
    slug: values.slug.trim().toLowerCase(),
    logo_path: values.logo_path.trim() || undefined,
    favicon_path: values.favicon_path.trim() || undefined,
    address: values.address.trim(),
    nif: values.nif.trim(),
    mobile_phone: values.mobile_phone.trim(),
    email: values.email.trim().toLowerCase(),
    iban: values.iban.trim(),
  }
}
