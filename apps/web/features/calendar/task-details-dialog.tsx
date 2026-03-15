"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { PencilEdit02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteTask, getTaskById } from "@/features/calendar/api"
import {
  formatTaskDate,
  formatTaskTimeRange,
  taskTypeLabels,
} from "@/features/calendar/utils"
import { useAuthStore } from "@/lib/auth/store"

type TaskDetailsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId?: string
  gardenNameById: Record<string, string>
  teamNameById: Record<string, string>
  canManage: boolean
  onEdit: (taskId: string) => void
}

export function TaskDetailsDialog({
  open,
  onOpenChange,
  taskId,
  gardenNameById,
  teamNameById,
  canManage,
  onEdit,
}: TaskDetailsDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const taskQuery = useQuery({
    queryKey: ["tasks", "detail", taskId, accessToken],
    queryFn: () => getTaskById(accessToken ?? "", taskId ?? ""),
    enabled: Boolean(open && accessToken && taskId),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!accessToken || !taskId) {
        throw new Error("Sem sessao ativa.")
      }

      await deleteTask(accessToken, taskId)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
        queryClient.invalidateQueries({ queryKey: ["tasks", "detail"] }),
      ])
      toast.success("Tarefa apagada com sucesso.")
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel apagar a tarefa.")
    },
  })

  const task = taskQuery.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da tarefa</DialogTitle>
          <DialogDescription>
            Consulta a tarefa agendada e gere-a quando necessario.
          </DialogDescription>
        </DialogHeader>

        {taskQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar tarefa...
          </div>
        ) : task ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#dfd7c0] bg-[#fbf8ef] p-5">
              <div className="space-y-2">
                <Badge variant={task.task_type === "emergency" ? "destructive" : "secondary"}>
                  {taskTypeLabels[task.task_type]}
                </Badge>
                <h3 className="text-lg font-semibold text-[#1f2f27]">
                  {gardenNameById[task.garden_id] ?? "Jardim"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {teamNameById[task.team_id ?? ""] ?? "Sem equipa"}
                </p>
              </div>

              {canManage ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      onOpenChange(false)
                      onEdit(task.id)
                    }}
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
                    <span className="sr-only">Editar tarefa</span>
                  </Button>
                  <DeleteConfirmDialog
                    title="Apagar tarefa"
                    description="Tens a certeza que queres apagar esta tarefa? Esta acao nao pode ser revertida."
                    onConfirm={() => deleteMutation.mutate()}
                    isPending={deleteMutation.isPending}
                    srLabel="Apagar tarefa"
                  />
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-[#dfd7c0] bg-white">
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                <DetailRow label="Data" value={formatTaskDate(task.date)} />
                <DetailRow label="Horario" value={formatTaskTimeRange(task)} />
                <DetailRow
                  label="Tipo de tarefa"
                  value={taskTypeLabels[task.task_type]}
                />
                <DetailRow
                  label="Descricao"
                  value={task.description?.trim() || "Sem descricao"}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            Nao foi possivel carregar a tarefa.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm leading-6 text-[#1f2f27]">{value}</p>
    </div>
  )
}
