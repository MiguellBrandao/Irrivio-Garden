"use client"

import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createEmployee,
  getEmployeeById,
  listTeams,
  updateEmployee,
} from "@/features/employees/api"
import {
  employeeFormDefaults,
  employeeFormSchema,
  type EmployeeFormValues,
} from "@/features/employees/schema"
import {
  toCreateEmployeePayload,
  toEmployeeFormValues,
  toUpdateEmployeePayload,
} from "@/features/employees/utils"
import { useAuthStore } from "@/lib/auth/store"

type EmployeeFormPageProps = {
  mode: "create" | "edit"
  employeeId?: string
}

export function EmployeeFormPage({
  mode,
  employeeId,
}: EmployeeFormPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(
      employeeFormSchema.superRefine((values, ctx) => {
        if (mode === "create") {
          if (!values.email.trim()) {
            ctx.addIssue({
              code: "custom",
              path: ["email"],
              message: "Indica o email do membro.",
            })
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
            ctx.addIssue({
              code: "custom",
              path: ["email"],
              message: "Indica um email valido.",
            })
          }

          if (!values.password.trim()) {
            ctx.addIssue({
              code: "custom",
              path: ["password"],
              message: "Indica a palavra-passe.",
            })
          } else if (values.password.trim().length < 8) {
            ctx.addIssue({
              code: "custom",
              path: ["password"],
              message: "A palavra-passe deve ter pelo menos 8 caracteres.",
            })
          }
        }
      })
    ),
    defaultValues: employeeFormDefaults,
  })
  const selectedTeamIds = useWatch({
    control: form.control,
    name: "team_ids",
  })

  const employeeQuery = useQuery({
    queryKey: ["employees", "detail", employeeId, activeCompanyId, accessToken],
    queryFn: () => getEmployeeById(accessToken ?? "", employeeId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && employeeId && mode === "edit" && isAdmin),
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && isAdmin),
  })

  useEffect(() => {
    if (mode === "edit" && employeeQuery.data) {
      form.reset(toEmployeeFormValues(employeeQuery.data))
    }
  }, [employeeQuery.data, form, mode])

  const saveMutation = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      if (mode === "edit" && employeeId) {
        return updateEmployee(accessToken, employeeId, toUpdateEmployeePayload(values))
      }

      return createEmployee(accessToken, toCreateEmployeePayload(values))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["employees"] })
      toast.success(
        mode === "edit"
          ? "Funcionario atualizado com sucesso."
          : "Funcionario criado com sucesso."
      )
      router.push("/employees")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o membro.")
    },
  })

  function onSubmit(values: EmployeeFormValues) {
    saveMutation.mutate(values)
  }

  function toggleTeamSelection(teamId: string) {
    const selectedIds = form.getValues("team_ids")
    const nextValue = selectedIds.includes(teamId)
      ? selectedIds.filter((value) => value !== teamId)
      : [...selectedIds, teamId]

    form.setValue("team_ids", nextValue, { shouldDirty: true, shouldValidate: true })
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir membros.
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
            Seleciona uma empresa antes de gerir membros.
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
            Apenas administradores podem criar ou editar membros.
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
              {mode === "edit" ? "Editar membro" : "Criar membro"}
            </CardTitle>
          </div>
          <Button asChild variant="outline">
            <Link href="/employees">Voltar a listagem</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" && employeeQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar membro...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="role"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employee-role">Perfil</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="employee-role" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Seleciona o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employee-name">Nome</FieldLabel>
                      <Input {...field} id="employee-name" aria-invalid={fieldState.invalid} />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="employee-phone">Telefone</FieldLabel>
                      <Input
                        {...field}
                        id="employee-phone"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              {mode === "create" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="email"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="employee-email">Email</FieldLabel>
                        <Input
                          {...field}
                          id="employee-email"
                          type="email"
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="password"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="employee-password">
                          Palavra-passe
                        </FieldLabel>
                        <Input
                          {...field}
                          id="employee-password"
                          type="password"
                          aria-invalid={fieldState.invalid}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </div>
              ) : employeeQuery.data?.email ? (
                <Field>
                  <FieldLabel htmlFor="employee-email-view">Email</FieldLabel>
                  <Input
                    id="employee-email-view"
                    value={employeeQuery.data.email}
                    disabled
                  />
                </Field>
              ) : null}

              <Controller
                control={form.control}
                name="active"
                render={({ field }) => (
                  <Field>
                    <FieldLabel>Estado</FieldLabel>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        className={field.value ? "bg-[#215442] text-white hover:bg-[#183b2f]" : ""}
                        onClick={() => field.onChange(true)}
                      >
                        Ativo
                      </Button>
                      <Button
                        type="button"
                        variant={!field.value ? "default" : "outline"}
                        className={!field.value ? "bg-[#7a3126] text-white hover:bg-[#61271e]" : ""}
                        onClick={() => field.onChange(false)}
                      >
                        Inativo
                      </Button>
                    </div>
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="team_ids"
                render={({ fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Equipas</FieldLabel>
                    {teamsQuery.isLoading ? (
                      <div className="rounded-xl border border-dashed border-[#dfd7c0] px-4 py-3 text-sm text-muted-foreground">
                        A carregar equipas...
                      </div>
                    ) : teamsQuery.data?.length ? (
                        <div className="flex flex-wrap gap-2">
                        {teamsQuery.data.map((team) => {
                          const selected = selectedTeamIds.includes(team.id)

                          return (
                            <Button
                              key={team.id}
                              type="button"
                              variant={selected ? "default" : "outline"}
                              className={
                                selected
                                  ? "bg-[#215442] text-white hover:bg-[#183b2f]"
                                  : ""
                              }
                              onClick={() => toggleTeamSelection(team.id)}
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
                      ? "Guardar alteracoes"
                      : "Criar membro"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset(
                      mode === "edit" && employeeQuery.data
                        ? toEmployeeFormValues(employeeQuery.data)
                        : employeeFormDefaults
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
