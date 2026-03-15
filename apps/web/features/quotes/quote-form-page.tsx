"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, Controller, useForm } from "react-hook-form"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listGardens } from "@/features/gardens/api"
import { createQuote, getQuoteById, updateQuote } from "@/features/quotes/api"
import { GenerateQuotePdfButton } from "@/features/quotes/generate-quote-pdf-button"
import {
  quoteFormDefaults,
  quoteFormSchema,
  type QuoteFormValues,
} from "@/features/quotes/schema"
import { getGardenLabel, toQuoteFormValues, toQuotePayload } from "@/features/quotes/utils"
import { useAuthStore } from "@/lib/auth/store"

type QuoteFormPageProps = {
  mode: "create" | "edit"
  quoteId?: string
}

export function QuoteFormPage({ mode, quoteId }: QuoteFormPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: quoteFormDefaults,
  })

  const servicesFieldArray = useFieldArray({
    control: form.control,
    name: "services",
  })

  const quoteQuery = useQuery({
    queryKey: ["quotes", "detail", quoteId, activeCompanyId, accessToken],
    queryFn: () => getQuoteById(accessToken ?? "", quoteId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && quoteId && mode === "edit" && isAdmin),
  })

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  useEffect(() => {
    if (mode === "edit" && quoteQuery.data) {
      form.reset(toQuoteFormValues(quoteQuery.data))
    }
  }, [form, mode, quoteQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toQuotePayload(values)

      if (mode === "edit" && quoteId) {
        return updateQuote(accessToken, quoteId, payload)
      }

      return createQuote(accessToken, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quotes"] })
      toast.success(
        mode === "edit"
          ? "Orcamento atualizado com sucesso."
          : "Orcamento criado com sucesso."
      )
      router.push("/quotes")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o orcamento.")
    },
  })

  function onSubmit(values: QuoteFormValues) {
    saveMutation.mutate(values)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir orcamentos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!activeCompanyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Empresa em falta</CardTitle>
          <CardDescription>
            Seleciona uma empresa antes de gerir orcamentos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso restrito</CardTitle>
          <CardDescription>
            Apenas administradores podem criar ou editar orcamentos.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="mx-auto w-full max-w-4xl border-[#dfd7c0] bg-white">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle>
              {mode === "edit" ? "Editar orcamento" : "Criar orcamento"}
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            {mode === "edit" && quoteQuery.data ? (
              <GenerateQuotePdfButton quote={quoteQuery.data} variant="outline" label="Gerar PDF" />
            ) : null}
            <Button asChild variant="outline">
              <Link href="/quotes">Voltar a listagem</Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" && quoteQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar orcamento...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="garden_id"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="quote-garden">Jardim</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="quote-garden" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Seleciona o jardim" />
                        </SelectTrigger>
                        <SelectContent>
                          {(gardensQuery.data ?? []).map((garden) => (
                            <SelectItem key={garden.id} value={garden.id}>
                              {getGardenLabel(garden)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="valid_until"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="quote-valid-until">Valido ate</FieldLabel>
                      <Input
                        {...field}
                        id="quote-valid-until"
                        type="date"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="price"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="quote-price">Valor</FieldLabel>
                    <Input
                      {...field}
                      id="quote-price"
                      type="number"
                      min="0"
                      step="0.01"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Field>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <FieldLabel>Servicos</FieldLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => servicesFieldArray.append({ value: "" })}
                  >
                    <HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
                    Adicionar servico
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {servicesFieldArray.fields.map((serviceField, index) => (
                    <div
                      key={serviceField.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4 sm:flex-row sm:items-start"
                    >
                      <div className="flex-1">
                        <Controller
                          control={form.control}
                          name={`services.${index}.value`}
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel htmlFor={`quote-service-${index}`}>
                                Servico {index + 1}
                              </FieldLabel>
                              <Input
                                {...field}
                                id={`quote-service-${index}`}
                                aria-invalid={fieldState.invalid}
                                placeholder="Ex.: Limpeza das ervas com rocadora"
                              />
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:mt-7"
                        onClick={() => {
                          if (servicesFieldArray.fields.length === 1) {
                            form.setValue("services.0.value", "", {
                              shouldDirty: true,
                              shouldValidate: true,
                            })
                            return
                          }

                          servicesFieldArray.remove(index)
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
                {typeof form.formState.errors.services?.message === "string" ? (
                  <FieldError>{form.formState.errors.services.message}</FieldError>
                ) : null}
              </Field>

              {saveMutation.isError ? (
                <FieldError>{saveMutation.error.message}</FieldError>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="submit"
                  className="bg-[#215442] text-white hover:bg-[#183b2f]"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending
                    ? "A guardar..."
                    : mode === "edit"
                      ? "Guardar alteracoes"
                      : "Criar orcamento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset(
                      mode === "edit" && quoteQuery.data
                        ? toQuoteFormValues(quoteQuery.data)
                        : quoteFormDefaults
                    )
                  }
                >
                  Limpar formulario
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
