"use client"

import { useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deletePayment } from "@/features/payments/api"
import type { DerivedPaymentEntry } from "@/features/payments/types"
import {
  formatCurrency,
  formatDate,
  paymentStatusLabels,
} from "@/features/payments/utils"
import { useAuthStore } from "@/lib/auth/store"

type PaymentDetailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DerivedPaymentEntry | null
  onEditPayment: (paymentId: string) => void
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  entry,
  onEditPayment,
}: PaymentDetailsDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const totalPaid = useMemo(
    () => entry?.payments.reduce((sum, item) => sum + Number(item.amount), 0) ?? 0,
    [entry]
  )

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }

      await deletePayment(accessToken, paymentId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["payments", "detail"] }),
      ])
      toast.success("Pagamento apagado com sucesso.")
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar o pagamento.")
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Detalhes do pagamento</DialogTitle>
          <DialogDescription>
            {entry ? `${entry.garden_name} • ${entry.period_label}` : "Sem pagamento selecionado."}
          </DialogDescription>
        </DialogHeader>

        {entry ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-5">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-[#1f2f27]">{entry.garden_name}</h3>
                <p className="text-sm text-muted-foreground">{entry.garden_address}</p>
              </div>

              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <SimpleInfo label="Estado" value={paymentStatusLabels[entry.status]} />
                <SimpleInfo label="Periodo" value={entry.period_label} />
                <SimpleInfo label="Valor mensal" value={formatCurrency(entry.monthly_amount)} />
                <SimpleInfo label="Total pago" value={formatCurrency(totalPaid)} />
                <SimpleInfo label="Em falta" value={formatCurrency(entry.remaining_amount)} />
                <SimpleInfo label="Inicio contrato" value={formatDate(entry.start_date)} />
                <SimpleInfo label="Dia cobranca" value={entry.billing_day?.toString() ?? "-"} />
              </dl>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium text-[#1f2f27]">Pagamentos registados</h3>
                <span className="text-xs text-muted-foreground">
                  {entry.payments.length} registo(s)
                </span>
              </div>

              {entry.payments.length ? (
                <div className="space-y-3">
                  {entry.payments.map((payment) => (
                    <article
                      key={payment.id}
                      className="rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-base font-semibold text-[#1f2f27]">
                          {formatCurrency(Number(payment.amount))}
                        </p>

                        <div className="ml-auto flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            onClick={() => onEditPayment(payment.id)}
                          >
                            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                            <span className="sr-only">Editar pagamento</span>
                          </Button>
                          <DeleteConfirmDialog
                            title="Apagar pagamento"
                            description="Tens a certeza que queres apagar este pagamento? Esta acao nao pode ser revertida."
                            onConfirm={() => deleteMutation.mutate(payment.id)}
                            isPending={deleteMutation.isPending}
                            srLabel="Apagar pagamento"
                          />
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
                  Ainda nao existem pagamentos registados para este periodo.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function SimpleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium text-[#1f2f27]">{value}</dd>
    </div>
  )
}
