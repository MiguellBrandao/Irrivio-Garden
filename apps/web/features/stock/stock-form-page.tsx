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
import { createProduct, getProductById, updateProduct } from "@/features/stock/api"
import {
  productFormDefaults,
  productFormSchema,
  type ProductFormValues,
} from "@/features/stock/schema"
import { toProductFormValues, toProductPayload, unitLabels } from "@/features/stock/utils"
import { useAuthStore } from "@/lib/auth/store"

type StockFormPageProps = {
  mode: "create" | "edit"
  productId?: string
}

export function StockFormPage({ mode, productId }: StockFormPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const activeCompanyId = useAuthStore((state) => state.activeCompanyId)
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const isAdmin = activeCompany?.role === "admin"

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productFormDefaults,
  })
  const selectedUnit = useWatch({
    control: form.control,
    name: "unit",
  })

  const productQuery = useQuery({
    queryKey: ["products", "detail", productId, activeCompanyId, accessToken],
    queryFn: () => getProductById(accessToken ?? "", productId ?? ""),
    enabled: Boolean(accessToken && activeCompanyId && productId && mode === "edit" && isAdmin),
  })

  useEffect(() => {
    if (mode === "edit" && productQuery.data) {
      form.reset(toProductFormValues(productQuery.data))
    }
  }, [form, mode, productQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      if (!accessToken) {
        throw new Error("Sem sessao ativa.")
      }
      if (!activeCompanyId) {
        throw new Error("Seleciona uma empresa.")
      }

      const payload = toProductPayload(values)

      if (mode === "edit" && productId) {
        return updateProduct(accessToken, productId, payload)
      }

      return createProduct(accessToken, payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(
        mode === "edit"
          ? "Produto atualizado com sucesso."
          : "Produto criado com sucesso."
      )
      router.push("/stock")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Nao foi possivel guardar o produto.")
    },
  })

  function onSubmit(values: ProductFormValues) {
    saveMutation.mutate(values)
  }

  if (!accessToken) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sessao em falta</CardTitle>
          <CardDescription>
            Faz login novamente antes de gerir stock.
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
            Seleciona uma empresa antes de gerir stock.
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
            Apenas administradores podem criar ou editar produtos.
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
              {mode === "edit" ? "Editar produto" : "Criar produto"}
            </CardTitle>
          </div>
          <Button asChild variant="outline">
            <Link href="/stock">Voltar a listagem</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {mode === "edit" && productQuery.isLoading ? (
          <div className="rounded-2xl border border-dashed border-[#dfd7c0] bg-[#fbf8ef] p-5 text-sm text-muted-foreground">
            A carregar produto...
          </div>
        ) : (
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="product-name">Nome</FieldLabel>
                      <Input {...field} id="product-name" aria-invalid={fieldState.invalid} />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="unit"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>Unidade</FieldLabel>
                      <Select
                        key={selectedUnit ?? "empty-unit"}
                        value={selectedUnit ?? ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Selecionar unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(unitLabels).map(([value, label]) => (
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
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Controller
                  control={form.control}
                  name="stock_quantity"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="product-stock-quantity">Valor em stock</FieldLabel>
                      <Input
                        {...field}
                        id="product-stock-quantity"
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
                  name="unit_price"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="product-unit-price">Valor por unidade</FieldLabel>
                      <Input
                        {...field}
                        id="product-unit-price"
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
                      : "Criar produto"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    form.reset(
                      mode === "edit" && productQuery.data
                        ? toProductFormValues(productQuery.data)
                        : productFormDefaults
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
