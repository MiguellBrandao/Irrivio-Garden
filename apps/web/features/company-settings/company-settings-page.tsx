"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Building03Icon, PaintBoardIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { getCompanyById, updateCompanySettings } from "@/features/company-settings/api"
import {
  companySettingsFormDefaults,
  companySettingsFormSchema,
  type CompanySettingsFormValues,
} from "@/features/company-settings/schema"
import {
  toCompanySettingsFormValues,
  toCompanySettingsPayload,
} from "@/features/company-settings/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUser } from "@/lib/auth/api"
import { useAuthStore } from "@/lib/auth/store"

export function CompanySettingsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const form = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsFormSchema),
    defaultValues: companySettingsFormDefaults,
  })

  const companyQuery = useQuery({
    queryKey: ["companies", "settings", activeCompanyId, accessToken],
    queryFn: () => getCompanyById(accessToken ?? "", activeCompanyId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  useEffect(() => {
    if (companyQuery.data) {
      form.reset(toCompanySettingsFormValues(companyQuery.data))
    }
  }, [companyQuery.data, form])

  const saveMutation = useMutation({
    mutationFn: async (values: CompanySettingsFormValues) => {
      if (!accessToken || !activeCompanyId) {
        throw new Error("Sem sessao ativa.")
      }

      await updateCompanySettings(
        accessToken,
        activeCompanyId,
        toCompanySettingsPayload(values)
      )

      const me = await getCurrentUser(accessToken)
      useAuthStore.getState().setSession({
        accessToken,
        user: me.user,
        companies: me.companies,
      })
    },
    onSuccess: () => {
      toast.success("Empresa atualizada com sucesso.")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel atualizar a empresa.")
    },
  })

  async function handleAssetSelection(
    fieldName: "logo_path" | "favicon_path",
    files: FileList | null
  ) {
    const file = files?.[0]
    if (!file) {
      return
    }

    try {
      const value = await readFileAsDataUrl(file)
      form.setValue(fieldName, value, {
        shouldDirty: true,
        shouldValidate: true,
      })
    } catch {
      toast.error("Nao foi possivel ler a imagem selecionada.")
    }
  }

  function onSubmit(values: CompanySettingsFormValues) {
    saveMutation.mutate(values)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>Faz login novamente antes de gerir a empresa.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId || !activeCompany) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>Seleciona uma empresa antes de abrir as definicoes.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso reservado</CardTitle>
          <CardDescription>
            Apenas admins da empresa podem editar estas definicoes.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const logoPath = form.watch("logo_path")
  const faviconPath = form.watch("favicon_path")

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="rounded-[2rem] border border-[#d8cfb6] bg-[linear-gradient(135deg,_#fbf8ef_0%,_#f2ead7_100%)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d8cfb6] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#215442]">
              <HugeiconsIcon icon={Building03Icon} strokeWidth={2} />
              Definicoes da empresa
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[#1f2f27]">
                {activeCompany.name}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-[#4d5a51]">
                Atualiza a identidade visual, contacto e dados de faturacao da tua empresa.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" className="bg-white/80">
            <Link href="/dashboard">Voltar ao painel</Link>
          </Button>
        </div>
      </section>

      <form className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]" onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-[#dfd7c0] bg-white">
          <CardHeader>
            <CardTitle>Dados principais</CardTitle>
            <CardDescription>
              Informacao institucional usada em orcamentos, pagamentos e identificacao da empresa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <CompanyField control={form.control} name="name" label="Nome" />
                <CompanyField control={form.control} name="slug" label="Slug" />
                <CompanyField control={form.control} name="email" label="Email" type="email" />
                <CompanyField control={form.control} name="mobile_phone" label="Telemovel" />
                <CompanyField control={form.control} name="nif" label="NIF" />
                <CompanyField control={form.control} name="iban" label="IBAN" />
              </div>

              <CompanyField control={form.control} name="address" label="Morada" />

              {saveMutation.isError ? <FieldError>{saveMutation.error.message}</FieldError> : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  disabled={saveMutation.isPending}
                >
                  <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                  {saveMutation.isPending ? "A guardar..." : "Guardar alteracoes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset(
                      companyQuery.data
                        ? toCompanySettingsFormValues(companyQuery.data)
                        : companySettingsFormDefaults
                    )
                  }
                >
                  Repor formulario
                </Button>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-[#dfd7c0] bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} />
                Identidade visual
              </CardTitle>
              <CardDescription>
                Mantem o logo e o favicon alinhados com a imagem da tua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <CompanyAssetField
                id="company-logo"
                label="Logo"
                value={logoPath}
                error={form.formState.errors.logo_path}
                onClear={() => {
                  form.setValue("logo_path", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
                onFileChange={(files) => handleAssetSelection("logo_path", files)}
              />
              <CompanyAssetField
                id="company-favicon"
                label="Favicon"
                value={faviconPath}
                error={form.formState.errors.favicon_path}
                onClear={() => {
                  form.setValue("favicon_path", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
                onFileChange={(files) => handleAssetSelection("favicon_path", files)}
              />
            </CardContent>
          </Card>

          <Card className="border-[#dfd7c0] bg-[#fbf8ef]">
            <CardHeader>
              <CardTitle>Onde isto aparece</CardTitle>
              <CardDescription>
                Estas alteracoes refletem-se no seletor de empresa, favicon, ecras internas e documentos.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </form>
    </div>
  )
}

function CompanyField({
  control,
  name,
  label,
  type,
}: {
  control: ReturnType<typeof useForm<CompanySettingsFormValues>>["control"]
  name: keyof CompanySettingsFormValues
  label: string
  type?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={String(name)}>{label}</FieldLabel>
          <Input {...field} id={String(name)} type={type} aria-invalid={fieldState.invalid} />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

function CompanyAssetField({
  id,
  label,
  value,
  error,
  onFileChange,
  onClear,
}: {
  id: string
  label: string
  value: string
  error?: { message?: string }
  onFileChange: (files: FileList | null) => void
  onClear: () => void
}) {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="file"
        accept="image/*"
        onChange={(event) => {
          onFileChange(event.target.files)
          event.currentTarget.value = ""
        }}
        aria-invalid={Boolean(error)}
      />
      <FieldDescription>
        A imagem fica guardada diretamente na base de dados em base64.
      </FieldDescription>
      {value ? (
        <div className="space-y-3 rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4">
          <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#dfd7c0] bg-white p-4">
            <img src={value} alt={label} className="max-h-20 max-w-full object-contain" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            Remover imagem
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] px-4 py-6 text-sm text-muted-foreground">
          Nenhuma imagem selecionada.
        </div>
      )}
      <FieldError errors={[error]} />
    </Field>
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Nao foi possivel ler o ficheiro."))
    reader.readAsDataURL(file)
  })
}
