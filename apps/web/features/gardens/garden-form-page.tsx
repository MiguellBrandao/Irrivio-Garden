"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createGarden,
  getGardenById,
  updateGarden,
} from "@/features/gardens/api"
import { listTeams } from "@/features/employees/api"
import type { TeamOption } from "@/features/employees/types"
import {
  gardenFormDefaults,
  gardenFormSchema,
  type GardenFormValues,
} from "@/features/gardens/schema"
import {
  frequencyLabels,
  getWeekdayFromIsoDate,
  toGardenFormValues,
  toGardenPayload,
  weekdayLabels,
} from "@/features/gardens/utils"
import { useAuthStore } from "@/lib/auth/store"

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

  const isRegularService = useWatch({
    control: form.control,
    name: "is_regular_service",
  })
  const maintenanceFrequency = useWatch({
    control: form.control,
    name: "maintenance_frequency",
  })
  const maintenanceAnchorDate = useWatch({
    control: form.control,
    name: "maintenance_anchor_date",
  })
  const selectedTeamIds = useWatch({
    control: form.control,
    name: "team_ids",
    defaultValue: [],
  })
  const previousMaintenanceFrequencyRef = useRef(maintenanceFrequency)

  const gardenQuery = useQuery({
    queryKey: ["gardens", "detail", gardenId, activeCompanyId, accessToken],
    queryFn: () => getGardenById(accessToken ?? "", gardenId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && gardenId && mode === "edit" && isAdmin),
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId),
  })

  useEffect(() => {
    if (mode === "edit" && gardenQuery.data) {
      const formValues = toGardenFormValues(gardenQuery.data)
      form.reset(formValues)
    }
  }, [form, gardenQuery.data, mode])

  // Initialize form with proper defaults based on mode
  useEffect(() => {
    if (mode === "create") {
      form.reset(gardenFormDefaults)
    }
    // For edit mode, let the first useEffect handle the reset when data arrives
  }, [form, mode])

  useEffect(() => {
    if (isRegularService) {
      return
    }

    // Only reset to defaults if we're creating a new garden or if garden data hasn't loaded yet
    if (mode === "edit" && gardenQuery.data && gardenQuery.isSuccess) {
      return
    }

    // For non-regular service, set maintenance fields to defaults
    form.setValue("show_in_calendar", false, { shouldDirty: true, shouldValidate: true })
    form.setValue("maintenance_frequency", "weekly", { shouldDirty: true })
    // Only set default day of week for create mode
    if (mode === "create") {
      form.setValue("maintenance_day_of_week", "monday", { shouldDirty: true })
    }
    form.setValue("maintenance_anchor_date", "", { shouldDirty: true, shouldValidate: true })
    form.setValue("maintenance_start_time", "", { shouldDirty: true })
    form.setValue("maintenance_end_time", "", { shouldDirty: true, shouldValidate: true })
  }, [form, isRegularService, mode, gardenQuery.data, gardenQuery.isSuccess])

  useEffect(() => {
    const previousMaintenanceFrequency = previousMaintenanceFrequencyRef.current

    if (
      previousMaintenanceFrequency &&
      previousMaintenanceFrequency !== "weekly" &&
      maintenanceFrequency === "weekly" &&
      form.getValues("maintenance_anchor_date")
    ) {
      form.setValue("maintenance_anchor_date", "", {
        shouldDirty: true,
        shouldValidate: true,
      })
    }

    previousMaintenanceFrequencyRef.current = maintenanceFrequency
  }, [form, maintenanceFrequency])

  useEffect(() => {
    if (maintenanceFrequency === "weekly") {
      return
    }

    const derivedWeekday = getWeekdayFromIsoDate(maintenanceAnchorDate)
    if (!derivedWeekday) {
      return
    }

    form.setValue("maintenance_day_of_week", derivedWeekday, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }, [form, maintenanceAnchorDate, maintenanceFrequency])

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

  function resetForm() {
    form.reset(mode === "edit" && gardenQuery.data ? toGardenFormValues(gardenQuery.data) : gardenFormDefaults)
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
    <Card className="mx-auto w-full max-w-5xl border-[#dfd7c0] bg-white">
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
            <section className="rounded-3xl border border-[#e7dfcd] bg-[#fbf8ef] p-5">
              <div className="mb-5 space-y-1">
                <h2 className="text-base font-semibold text-[#1f2f27]">Cliente e local</h2>
                <p className="text-sm text-muted-foreground">
                  Dados base do jardim e contacto principal.
                </p>
              </div>

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
                  name="team_ids"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Equipas atribuídas</FieldLabel>
                      {teamsQuery.isLoading ? (
                        <div className="rounded-xl border border-dashed border-[#dfd7c0] px-4 py-3 text-sm text-muted-foreground">
                          A carregar equipas...
                        </div>
                      ) : teamsQuery.data?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {teamsQuery.data.map((team: TeamOption) => {
                            const selected = selectedTeamIds.includes(team.id)

                            return (
                              <Button
                                key={team.id}
                                type="button"
                                variant={selected ? "default" : "outline"}
                                className={
                                  selected ? "bg-[#215442] text-white hover:bg-[#183b2f]" : ""
                                }
                                onClick={() => {
                                  const nextValue = selected
                                    ? selectedTeamIds.filter((value: string) => value !== team.id)
                                    : [...selectedTeamIds, team.id]
                                  field.onChange(nextValue)
                                }}
                              >
                                {team.name}
                              </Button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#dfd7c0] px-4 py-3 text-sm text-muted-foreground">
                          Ainda nao existem equipas disponiveis.
                        </div>
                      )}
                      <FieldDescription>
                        As equipas atribuídas ao jardim terão acesso às rotinas automáticas.
                      </FieldDescription>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </section>

            <section className="rounded-3xl border border-[#e7dfcd] bg-white p-5">
              <div className="mb-5 space-y-1">
                <h2 className="text-base font-semibold text-[#1f2f27]">Contrato e faturacao</h2>
                <p className="text-sm text-muted-foreground">
                  Valores comerciais e informacao administrativa do jardim.
                </p>
              </div>

              <FieldGroup className="gap-5">
                <div className="grid gap-5 md:grid-cols-2">
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

                  <Controller
                    control={form.control}
                    name="billing_day"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="garden-billing-day">Dia de cobranca</FieldLabel>
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

                <div className="grid gap-5 md:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="start_date"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="garden-start-date">Inicio contrato</FieldLabel>
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
                    name="status"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Estado</FieldLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
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
              </FieldGroup>
            </section>

            <section className="rounded-3xl border border-[#e7dfcd] bg-white p-5">
              <div className="mb-5 space-y-1">
                <h2 className="text-base font-semibold text-[#1f2f27]">Rotina de manutencao</h2>
                <p className="text-sm text-muted-foreground">
                  Agenda automatica para o calendario sem precisar de criar tarefas fixas.
                </p>
              </div>

              <FieldGroup className="gap-5">
                <Controller
                  control={form.control}
                  name="is_regular_service"
                  render={({ field }) => (
                    <Field>
                      <FieldLabel>Trabalho regular</FieldLabel>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant={field.value ? "default" : "outline"}
                          className={field.value ? "bg-[#215442] text-white hover:bg-[#183b2f]" : ""}
                          onClick={() => field.onChange(true)}
                        >
                          Sim, recorrente
                        </Button>
                        <Button
                          type="button"
                          variant={!field.value ? "default" : "outline"}
                          className={!field.value ? "bg-[#7a3126] text-white hover:bg-[#61271e]" : ""}
                          onClick={() => field.onChange(false)}
                        >
                          Nao, pontual
                        </Button>
                      </div>
                    </Field>
                  )}
                />

                {isRegularService ? (
                  <>
                    <Controller
                      control={form.control}
                      name="show_in_calendar"
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Mostrar no calendario</FieldLabel>
                          <FieldDescription>
                            Ativado por defeito para aparecer como evento automatico discreto.
                          </FieldDescription>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant={field.value ? "default" : "outline"}
                              className={field.value ? "bg-[#215442] text-white hover:bg-[#183b2f]" : ""}
                              onClick={() => field.onChange(true)}
                            >
                              Sim, mostrar
                            </Button>
                            <Button
                              type="button"
                              variant={!field.value ? "default" : "outline"}
                              className={!field.value ? "bg-[#805a2a] text-white hover:bg-[#6b4b23]" : ""}
                              onClick={() => field.onChange(false)}
                            >
                              Nao mostrar
                            </Button>
                          </div>
                        </Field>
                      )}
                    />

                    <div className="grid gap-5 lg:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="maintenance_frequency"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel>Frequencia</FieldLabel>
                            <Select
                              key={`maintenance-frequency-${field.value || "weekly"}`}
                              value={field.value || "weekly"}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="biweekly">Quinzenal</SelectItem>
                                <SelectItem value="monthly">Mensal</SelectItem>
                              </SelectContent>
                            </Select>
                            <FieldDescription>
                              {maintenanceFrequency === "weekly"
                                ? "Repete todas as semanas no mesmo dia."
                                : maintenanceFrequency === "biweekly"
                                  ? "Repete de duas em duas semanas a partir da data base."
                                  : maintenanceFrequency === "monthly"
                                    ? "Repete na mesma semana do mes e no mesmo dia da semana da data base."
                                    : "Escolhe a frequencia da rotina."}
                            </FieldDescription>
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />

                      {maintenanceFrequency === "weekly" ? (
                        <Controller
                          control={form.control}
                          name="maintenance_day_of_week"
                          render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel>Dia da semana</FieldLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                                  <SelectValue placeholder="Selecione um dia" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(weekdayLabels).map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FieldError errors={[fieldState.error]} />
                            </Field>
                          )}
                        />
                      ) : (
                        <Field>
                          <FieldLabel>Dia da semana</FieldLabel>
                          <div className="flex min-h-9 items-center rounded-4xl border border-input bg-input/30 px-3 text-sm text-foreground">
                            {maintenanceAnchorDate
                              ? weekdayLabels[getWeekdayFromIsoDate(maintenanceAnchorDate) ?? "monday"]
                              : "Escolhe primeiro a data base"}
                          </div>
                          <FieldDescription>
                            O dia da semana e calculado automaticamente a partir da data base.
                          </FieldDescription>
                        </Field>
                      )}
                    </div>

                    {maintenanceFrequency !== "weekly" ? (
                      <Controller
                        control={form.control}
                        name="maintenance_anchor_date"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="garden-maintenance-anchor-date">
                              Data base da recorrencia
                            </FieldLabel>
                            <Input
                              {...field}
                              value={field.value || ""}
                              id="garden-maintenance-anchor-date"
                              type="date"
                              aria-invalid={fieldState.invalid}
                            />
                            <FieldDescription>
                              Esta data fixa a semana, mes e ano de referencia para o padrao{" "}
                              {frequencyLabels[maintenanceFrequency]}.
                            </FieldDescription>
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    ) : null}

                    <div className="grid gap-5 md:grid-cols-2">
                      <Controller
                        control={form.control}
                        name="maintenance_start_time"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="garden-maintenance-start-time">
                              Hora de inicio
                            </FieldLabel>
                            <Input
                              {...field}
                              id="garden-maintenance-start-time"
                              type="time"
                              aria-invalid={fieldState.invalid}
                            />
                            <FieldDescription>Opcional, para aparecer no calendario.</FieldDescription>
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />

                      <Controller
                        control={form.control}
                        name="maintenance_end_time"
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="garden-maintenance-end-time">
                              Hora de fim
                            </FieldLabel>
                            <Input
                              {...field}
                              id="garden-maintenance-end-time"
                              type="time"
                              aria-invalid={fieldState.invalid}
                            />
                            <FieldDescription>Opcional, para aparecer no calendario.</FieldDescription>
                            <FieldError errors={[fieldState.error]} />
                          </Field>
                        )}
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] px-4 py-4 text-sm text-muted-foreground">
                    Este jardim fica sem agenda automatica. Podes continuar a criar tarefas manuais quando precisares.
                  </div>
                )}
              </FieldGroup>
            </section>

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
                    : "Criar jardim"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
              >
                Limpar formulario
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
