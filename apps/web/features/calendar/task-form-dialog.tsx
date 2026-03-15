"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import {
  Calendar02Icon,
  CheckmarkCircle02Icon,
  SearchIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createTask, getTaskById, updateTask } from "@/features/calendar/api"
import {
  taskFormDefaults,
  taskFormSchema,
  type TaskFormValues,
} from "@/features/calendar/schema"
import {
  taskTypeLabels,
  toIsoDate,
  toTaskFormValues,
  toTaskPayload,
} from "@/features/calendar/utils"
import { listTeams } from "@/features/employees/api"
import { listGardens } from "@/features/gardens/api"
import { useAuthStore } from "@/lib/auth/store"

type TaskFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  taskId?: string
  defaultDate?: string
}

export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  taskId,
  defaultDate,
}: TaskFormDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const [gardenPickerOpen, setGardenPickerOpen] = useState(false)
  const [teamPickerOpen, setTeamPickerOpen] = useState(false)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: taskFormDefaults,
  })

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId),
  })

  const teamsQuery = useQuery({
    queryKey: ["teams", activeCompanyId, accessToken],
    queryFn: () => listTeams(accessToken ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId),
  })

  const taskQuery = useQuery({
    queryKey: ["tasks", "detail", taskId, activeCompanyId, accessToken],
    queryFn: () => getTaskById(accessToken ?? "", taskId ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId && taskId && mode === "edit"),
  })

  const selectedGardenId = useWatch({
    control: form.control,
    name: "garden_id",
  })
  const selectedTeamId = useWatch({
    control: form.control,
    name: "team_id",
  })

  const selectedGarden = useMemo(
    () => (gardensQuery.data ?? []).find((garden) => garden.id === selectedGardenId),
    [gardensQuery.data, selectedGardenId]
  )
  const selectedTeam = useMemo(
    () => (teamsQuery.data ?? []).find((team) => team.id === selectedTeamId),
    [selectedTeamId, teamsQuery.data]
  )

  useEffect(() => {
    if (!open) {
      form.reset(taskFormDefaults)
      return
    }

    if (mode === "edit" && taskQuery.data) {
      form.reset(toTaskFormValues(taskQuery.data))
      return
    }

    if (mode === "create") {
      form.reset({
        ...taskFormDefaults,
        date: defaultDate ?? toIsoDate(new Date()),
      })
    }
  }, [defaultDate, form, mode, open, taskQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toTaskPayload(values)

      if (mode === "edit" && taskId) {
        return updateTask(accessToken, taskId, payload)
      }

      return createTask(accessToken, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "detail"] }),
      ])
      toast.success(
        mode === "edit"
          ? "Tarefa atualizada com sucesso."
          : "Tarefa criada com sucesso."
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar a tarefa.")
    },
  })

  function onSubmit(values: TaskFormValues) {
    saveMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar tarefa" : "Criar tarefa"}
          </DialogTitle>
          <DialogDescription>
            Define a equipa, o jardim, a data e os detalhes da tarefa.
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && taskQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar tarefa...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <Controller
                  control={form.control}
                  name="garden_id"
                  render={({ fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Jardim</FieldLabel>
                      <Popover open={gardenPickerOpen} onOpenChange={setGardenPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="justify-between">
                            <span className="truncate">
                              {selectedGarden?.client_name ?? "Selecionar jardim"}
                            </span>
                            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Pesquisar jardim..." />
                            <CommandList>
                              <CommandEmpty>Nenhum jardim encontrado.</CommandEmpty>
                              {(gardensQuery.data ?? []).map((garden) => (
                                <CommandItem
                                  key={garden.id}
                                  value={`${garden.client_name} ${garden.address}`}
                                  onSelect={() => {
                                    form.setValue("garden_id", garden.id, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    })
                                    setGardenPickerOpen(false)
                                  }}
                                >
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate">{garden.client_name}</span>
                                    <span className="truncate text-xs text-muted-foreground">
                                      {garden.address}
                                    </span>
                                  </div>
                                  {selectedGardenId === garden.id ? (
                                    <HugeiconsIcon
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={2}
                                      className="ml-auto"
                                    />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="team_id"
                  render={({ fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Equipa</FieldLabel>
                      <Popover open={teamPickerOpen} onOpenChange={setTeamPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" className="justify-between">
                            <span className="truncate">
                              {selectedTeam?.name ?? "Selecionar equipa"}
                            </span>
                            <HugeiconsIcon icon={SearchIcon} strokeWidth={2} />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Pesquisar equipa..." />
                            <CommandList>
                              <CommandEmpty>Nenhuma equipa encontrada.</CommandEmpty>
                              {(teamsQuery.data ?? []).map((team) => (
                                <CommandItem
                                  key={team.id}
                                  value={team.name}
                                  onSelect={() => {
                                    form.setValue("team_id", team.id, {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    })
                                    setTeamPickerOpen(false)
                                  }}
                                >
                                  <span className="truncate">{team.name}</span>
                                  {selectedTeamId === team.id ? (
                                    <HugeiconsIcon
                                      icon={CheckmarkCircle02Icon}
                                      strokeWidth={2}
                                      className="ml-auto"
                                    />
                                  ) : null}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr_1fr]">
                <Controller
                  control={form.control}
                  name="date"
                  render={({ field, fieldState }) => {
                    const selectedDate = field.value
                      ? new Date(`${field.value}T00:00:00`)
                      : undefined

                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Data</FieldLabel>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="justify-between">
                              <span>
                                {selectedDate
                                  ? format(selectedDate, "dd/MM/yyyy")
                                  : "Selecionar data"}
                              </span>
                              <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (!date) {
                                  return
                                }

                                field.onChange(toIsoDate(date))
                                setDatePickerOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )
                  }}
                />

                <Controller
                  control={form.control}
                  name="start_time"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="task-start-time">Hora inicial</FieldLabel>
                      <Input
                        {...field}
                        id="task-start-time"
                        type="time"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="end_time"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="task-end-time">Hora final</FieldLabel>
                      <Input
                        {...field}
                        id="task-end-time"
                        type="time"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                control={form.control}
                name="task_type"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>Tipo de tarefa</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(taskTypeLabels).map(([value, label]) => (
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

              <Controller
                control={form.control}
                name="description"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="task-description">Descricao</FieldLabel>
                    <Textarea
                      {...field}
                      id="task-description"
                      className="min-h-28"
                      aria-invalid={fieldState.invalid}
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
                      ? "Guardar alteracoes"
                      : "Criar tarefa"}
                </Button>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
