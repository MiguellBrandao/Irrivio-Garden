"use client"

import { useState } from "react"
import { FileDownloadIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { downloadQuotePdf, downloadQuotePng } from "@/features/quotes/pdf"
import type { Quote } from "@/features/quotes/types"
import { useAuthStore } from "@/lib/auth/store"

type GenerateQuotePdfButtonProps = {
  quote: Quote
} & React.ComponentProps<typeof Button>

export function GenerateQuotePdfButton({
  quote,
  variant = "outline",
  size = "sm",
  disabled,
  ...props
}: GenerateQuotePdfButtonProps) {
  const activeCompany = useAuthStore((state) =>
    state.companies.find((company) => company.id === state.activeCompanyId) ?? null
  )
  const [isGenerating, setIsGenerating] = useState<"pdf" | "png" | null>(null)

  async function handleGenerate(format: "pdf" | "png") {
    if (!activeCompany) {
      toast.error("Seleciona uma empresa antes de gerar o orcamento.")
      return
    }

    try {
      setIsGenerating(format)

      if (format === "pdf") {
        await downloadQuotePdf({ quote, company: activeCompany })
      } else {
        await downloadQuotePng({ quote, company: activeCompany })
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Nao foi possivel gerar o ${format.toUpperCase()} do orcamento.`
      toast.error(message)
    } finally {
      setIsGenerating(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={Boolean(isGenerating) || disabled}
          {...props}
        >
          <HugeiconsIcon icon={FileDownloadIcon} strokeWidth={2} />
          <span>
            {isGenerating ? `A gerar ${isGenerating.toUpperCase()}` : "Baixar Orcamento"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem onSelect={() => handleGenerate("pdf")} disabled={Boolean(isGenerating)}>
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleGenerate("png")} disabled={Boolean(isGenerating)}>
          PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
