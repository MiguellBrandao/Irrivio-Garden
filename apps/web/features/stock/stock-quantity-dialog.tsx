"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  stockQuantitySchema,
  type StockQuantityValues,
} from "@/features/stock/schema"
import type { Product } from "@/features/stock/types"
import { toStockQuantityPayload } from "@/features/stock/utils"
import { updateProduct } from "@/features/stock/api"
import { useAuthStore } from "@/lib/auth/store"

type StockQuantityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
}

export function StockQuantityDialog({
  open,
  onOpenChange,
  product,
}: StockQuantityDialogProps) {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  const form = useForm<StockQuantityValues>({
    resolver: zodResolver(stockQuantitySchema),
    defaultValues: {
      stock_quantity: "",
    },
  })

  useEffect(() => {
    if (open && product) {
      form.reset({ stock_quantity: product.stock_quantity })
    }
  }, [form, open, product])

  const saveMutation = useMutation({
    mutationFn: async (values: StockQuantityValues) => {
      if (!accessToken || !product) {
        throw new Error("Sem sessao ativa.")
      }

      return updateProduct(accessToken, product.id, toStockQuantityPayload(values.stock_quantity))
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products", "detail"] }),
      ])
      toast.success("Stock atualizado com sucesso.")
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel atualizar o stock.")
    },
  })

  function onSubmit(values: StockQuantityValues) {
    saveMutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Alterar valor em stock</DialogTitle>
          <DialogDescription>
            {product ? `Atualiza apenas a quantidade disponivel de ${product.name}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className="gap-5">
            <Controller
              control={form.control}
              name="stock_quantity"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stock-quantity-value">Valor em stock</FieldLabel>
                  <Input
                    {...field}
                    id="stock-quantity-value"
                    type="number"
                    min="0"
                    step="0.01"
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
                {saveMutation.isPending ? "A alterar..." : "Alterar o valor em stock"}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
