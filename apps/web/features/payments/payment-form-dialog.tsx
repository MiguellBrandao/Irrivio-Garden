"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { format } from "date-fns"
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
import { Textarea } from "@/components/ui/textarea"
import { listGardens } from "@/features/gardens/api"
import { createPayment, getPaymentById, updatePayment } from "@/features/payments/api"
import {
  paymentFormDefaults,
  paymentFormSchema,
  type PaymentFormValues,
} from "@/features/payments/schema"
import {
  formatMonthYear,
  toIsoDate,
  toPaymentFormValues,
  toPaymentPayload,
} from "@/features/payments/utils"
import { useAuthStore } from "@/lib/auth/store"

type PaymentFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  paymentId?: string
  defaultGardenId?: string
  defaultBillingDate?: string
  defaultAmount?: string
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  mode,
  paymentId,
  defaultGardenId,
  defaultBillingDate,
  defaultAmount,
}: PaymentFormDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const [gardenPickerOpen, setGardenPickerOpen] = useState(false)
  const [billingPickerOpen, setBillingPickerOpen] = useState(false)
  const [paidAtPickerOpen, setPaidAtPickerOpen] = useState(false)

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: paymentFormDefaults,
  })

  const gardensQuery = useQuery({
    queryKey: ["gardens", activeCompanyId, accessToken],
    queryFn: () => listGardens(accessToken ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId),
  })

  const paymentQuery = useQuery({
    queryKey: ["payments", "detail", paymentId, activeCompanyId, accessToken],
    queryFn: () => getPaymentById(accessToken ?? "", paymentId ?? ""),
    enabled: Boolean(open && accessToken && activeCompanyId && paymentId && mode === "edit"),
  })

  const selectedGardenId = useWatch({
    control: form.control,
    name: "garden_id",
  })
  const selectedGarden = useMemo(
    () => (gardensQuery.data ?? []).find((garden) => garden.id === selectedGardenId),
    [gardensQuery.data, selectedGardenId]
  )

  useEffect(() => {
    if (!open) {
      form.reset(paymentFormDefaults)
      return
    }

    if (mode === "edit" && paymentQuery.data) {
      form.reset(toPaymentFormValues(paymentQuery.data))
      return
    }

    if (mode === "create") {
      form.reset({
        ...paymentFormDefaults,
        garden_id: defaultGardenId ?? "",
        billing_date:
          defaultBillingDate ??
          toIsoDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
        amount: defaultAmount ?? "",
      })
    }
  }, [
    defaultAmount,
    defaultBillingDate,
    defaultGardenId,
    form,
    mode,
    open,
    paymentQuery.data,
  ])

  const saveMutation = useMutation({
    mutationFn: async (values: PaymentFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toPaymentPayload(values)

      if (mode === "edit" && paymentId) {
        return updatePayment(accessToken, paymentId, payload)
      }

      return createPayment(accessToken, payload)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["payments", "detail"] }),
      ])
      toast.success(
        mode === "edit"
          ? "Pagamento atualizado com sucesso."
          : "Pagamento criado com sucesso."
      )
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o pagamento.")
    },
  })

  function onSubmit(values: PaymentFormValues) {
    saveMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Editar pagamento" : "Criar pagamento"}
          </DialogTitle>
          <DialogDescription>
            Regista o valor recebido para um jardim e periodo.
          </DialogDescription>
        </DialogHeader>

        {mode === "edit" && paymentQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar pagamento...
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
                  name="billing_date"
                  render={({ field, fieldState }) => {
                    const selectedDate = field.value ? new Date(field.value) : undefined

                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Mes e ano</FieldLabel>
                        <Popover open={billingPickerOpen} onOpenChange={setBillingPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="justify-between">
                              <span>
                                {selectedDate ? formatMonthYear(selectedDate) : "Selecionar periodo"}
                              </span>
                              <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (!date) {
                                  return
                                }

                                field.onChange(
                                  toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1))
                                )
                                setBillingPickerOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )
                  }}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Controller
                  control={form.control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="payment-amount">Valor</FieldLabel>
                      <Input
                        {...field}
                        id="payment-amount"
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
                  name="paid_at"
                  render={({ field, fieldState }) => {
                    const selectedDate = field.value ? new Date(field.value) : undefined

                    return (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Quando foi pago</FieldLabel>
                        <Popover open={paidAtPickerOpen} onOpenChange={setPaidAtPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="outline" className="justify-between">
                              <span>
                                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Opcional"}
                              </span>
                              <HugeiconsIcon icon={Calendar02Icon} strokeWidth={2} />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                field.onChange(date ? toIsoDate(date) : "")
                                setPaidAtPickerOpen(false)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )
                  }}
                />
              </div>

              <Controller
                control={form.control}
                name="notes"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="payment-notes">Notas</FieldLabel>
                    <Textarea
                      {...field}
                      id="payment-notes"
                      className="min-h-28"
                      aria-invalid={fieldState.invalid}
                      placeholder="Opcional"
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
                      : "Criar pagamento"}
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
