"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

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
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  createGarden,
  getGardenById,
  updateGarden,
} from "@/features/gardens/api"
import {
  gardenFormDefaults,
  gardenFormSchema,
  type GardenFormValues,
} from "@/features/gardens/schema"
import { useAuthStore } from "@/lib/auth/store"
import { toGardenFormValues, toGardenPayload } from "@/features/gardens/utils"

type GardenFormPageProps = {
  mode: "create" | "edit"
  gardenId?: string
}

export function GardenFormPage({ mode, gardenId }: GardenFormPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const form = useForm<GardenFormValues>({
    resolver: zodResolver(gardenFormSchema),
    defaultValues: gardenFormDefaults,
  })

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && gardenId && mode === "edit" && isAdmin),
  })

  useEffect(() => {
    if (mode === "edit" && gardenQuery.data) {
      form.reset(toGardenFormValues(gardenQuery.data))
    }
  }, [form, gardenQuery.data, mode])

  const saveMutation = useMutation({
    mutationFn: async (values: GardenFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessão ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toGardenPayload(values)

      if (mode === "edit" && gardenId) {
        return updateGarden(accessToken, gardenId, payload)
      }

      return createGarden(accessToken, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gardens"] })
      toast.success(
        mode === "edit"
          ? "Jardim atualizado com sucesso."
          : "Jardim criado com sucesso."
      )
      router.push("/gardens")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o jardim.")
    },
  })

  function onSubmit(values: GardenFormValues) {
    saveMutation.mutate(values)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessão em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir jardins.
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
            Seleciona uma empresa antes de gerir jardins.
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
            Apenas administradores podem criar ou editar jardins.
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
              {mode === "edit" ? "Editar jardim" : "Criar jardim"}
            </CardTitle>
          </div>
          <Button asChild variant="outline">
            <Link href="/gardens">Voltar à listagem</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" && gardenQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar jardim...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <Controller
                control={form.control}
                name="client_name"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="garden-client-name">Cliente</FieldLabel>
                    <Input
                      {...field}
                      id="garden-client-name"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="address"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="garden-address">Morada</FieldLabel>
                    <Textarea
                      {...field}
                      id="garden-address"
                      aria-invalid={fieldState.invalid}
                      className="min-h-24"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="garden-phone">Telefone</FieldLabel>
                      <Input
                        {...field}
                        id="garden-phone"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="monthly_price"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="garden-monthly-price">
                        Valor mensal
                      </FieldLabel>
                      <Input
                        {...field}
                        id="garden-monthly-price"
                        type="number"
                        min="0"
                        step="0.01"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="maintenance_frequency"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Frequência</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Semanal</SelectItem>
                          <SelectItem value="biweekly">Quinzenal</SelectItem>
                          <SelectItem value="monthly">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="status"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Estado</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="paused">Pausado</SelectItem>
                          <SelectItem value="cancelled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="start_date"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="garden-start-date">
                        Início contrato
                      </FieldLabel>
                      <Input
                        {...field}
                        id="garden-start-date"
                        type="date"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="billing_day"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="garden-billing-day">
                        Dia cobrança
                      </FieldLabel>
                      <Input
                        {...field}
                        id="garden-billing-day"
                        type="number"
                        min="1"
                        max="31"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="garden-notes">Notas</FieldLabel>
                    <Textarea
                      {...field}
                      id="garden-notes"
                      aria-invalid={fieldState.invalid}
                      className="min-h-28"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

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
                      ? "Guardar alterações"
                      : "Criar jardim"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset(gardenFormDefaults)}
                >
                  Limpar formulário
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
