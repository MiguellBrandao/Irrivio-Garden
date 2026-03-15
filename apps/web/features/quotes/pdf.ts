import type { Quote } from "@/features/quotes/types"
import {
  buildQuoteDocumentTitle,
  formatQuoteCurrency,
  formatQuoteDate,
  getQuoteValidUntilFallback,
} from "@/features/quotes/utils"
import type { AuthCompany } from "@/lib/auth/types"

type QuotePdfInput = {
  quote: Quote
  company: AuthCompany
}

type PdfDocument = InstanceType<(typeof import("jspdf"))["jsPDF"]>

const PAGE_MARGIN = 18
const PAGE_BOTTOM_MARGIN = 22

export async function downloadQuotePdf({
  quote,
  company,
}: QuotePdfInput) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PAGE_MARGIN * 2
  const validUntil = getQuoteValidUntilFallback(quote)
  const logoDataUrl = company.logo_path
    ? await loadImageDataUrl(company.logo_path).catch(() => null)
    : null

  doc.setProperties({
    title: buildQuoteDocumentTitle(quote),
    subject: `Orcamento ${company.name}`,
    author: company.name,
    creator: "Floripa Intranet",
  })

  let y = PAGE_MARGIN
  let headerBottomY = y + 34

  if (logoDataUrl) {
    const imageProps = doc.getImageProperties(logoDataUrl)
    const maxLogoWidth = 46
    const maxLogoHeight = 28
    const rawLogoHeight = (imageProps.height / imageProps.width) * maxLogoWidth
    const logoScale = rawLogoHeight > maxLogoHeight ? maxLogoHeight / rawLogoHeight : 1
    const logoWidth = maxLogoWidth * logoScale
    const logoHeight = rawLogoHeight * logoScale

    doc.addImage(logoDataUrl, imageProps.fileType ?? "PNG", PAGE_MARGIN, y, logoWidth, logoHeight)
    headerBottomY = Math.max(headerBottomY, y + logoHeight)
  }

  doc.setTextColor(31, 47, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(24)
  doc.text("Orcamento", pageWidth - PAGE_MARGIN, y + 11, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(105, 116, 98)
  doc.text("Documento comercial", pageWidth - PAGE_MARGIN, y + 18, {
    align: "right",
  })

  doc.setFontSize(11)
  doc.text(`Criado em ${formatQuoteDate(quote.created_at)}`, pageWidth - PAGE_MARGIN, y + 28, {
    align: "right",
  })
  doc.text(`Valido ate ${formatQuoteDate(validUntil)}`, pageWidth - PAGE_MARGIN, y + 34, {
    align: "right",
  })
  headerBottomY = Math.max(headerBottomY, y + 34)

  y = headerBottomY + 10

  doc.setDrawColor(232, 223, 204)
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y)
  y += 12

  drawSectionLabel(doc, "Cliente", PAGE_MARGIN, y)
  y += 6

  doc.setTextColor(31, 47, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text(quote.garden_client_name, PAGE_MARGIN, y)
  y += 7

  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  const clientInfoBottomY = drawWrappedText(
    doc,
    quote.garden_address,
    PAGE_MARGIN,
    y,
    contentWidth * 0.58,
    5.5
  )

  const priceBoxX = PAGE_MARGIN + contentWidth * 0.63
  const priceBoxY = y - 21
  const priceBoxWidth = contentWidth * 0.37
  const priceNote = doc.splitTextToSize(
    "Valor base sem IVA incluido. Sujeito a confirmacao final no momento da adjudicacao.",
    priceBoxWidth - 10
  )
  const priceBoxHeight = 23 + priceNote.length * 4.1

  doc.setFillColor(248, 244, 234)
  doc.setDrawColor(232, 223, 204)
  doc.roundedRect(priceBoxX, priceBoxY, priceBoxWidth, priceBoxHeight, 4, 4, "FD")

  doc.setTextColor(125, 135, 105)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text("VALOR PROPOSTO", priceBoxX + 5, priceBoxY + 7)

  doc.setTextColor(33, 84, 66)
  doc.setFontSize(20)
  doc.text(formatQuoteCurrency(Number(quote.price)), priceBoxX + 5, priceBoxY + 16)

  doc.setTextColor(68, 82, 72)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8.8)
  doc.text(priceNote, priceBoxX + 5, priceBoxY + 22)

  y = Math.max(clientInfoBottomY, priceBoxY + priceBoxHeight) + 10
  doc.setDrawColor(239, 232, 218)
  doc.line(PAGE_MARGIN, y, pageWidth - PAGE_MARGIN, y)
  y += 12

  drawSectionLabel(doc, "Servicos incluidos", PAGE_MARGIN, y)
  y += 6

  doc.setTextColor(31, 47, 39)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text("Proposta de intervencao", PAGE_MARGIN, y)
  y += 10

  quote.services.forEach((service, index) => {
    y = ensurePageSpace(doc, y, 18, pageHeight, pageWidth)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(33, 84, 66)
    doc.text(`${index + 1}.`, PAGE_MARGIN, y + 1)

    doc.setTextColor(31, 47, 39)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    y = drawWrappedText(doc, service, PAGE_MARGIN + 9, y + 1, contentWidth - 9, 5.8)
    y += 2
  })

  doc.setDrawColor(232, 223, 204)
  doc.line(PAGE_MARGIN, pageHeight - 46, pageWidth - PAGE_MARGIN, pageHeight - 46)

  drawSectionLabel(doc, "Contacto e faturacao", PAGE_MARGIN, pageHeight - 38)
  doc.setTextColor(31, 47, 39)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10.5)
  const footerLines = [
    company.address,
    `NIF: ${company.nif}`,
    `Telm: ${company.mobile_phone}`,
    company.email,
    `IBAN: ${company.iban}`,
  ]
  doc.text(footerLines, pageWidth / 2, pageHeight - 28, { align: "center" })

  doc.save(buildQuoteFileName(quote))
}

function drawSectionLabel(doc: PdfDocument, label: string, x: number, y: number) {
  doc.setTextColor(125, 135, 105)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.text(label.toUpperCase(), x, y)
}

function drawWrappedText(
  doc: PdfDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + Math.max(lines.length, 1) * lineHeight
}

function ensurePageSpace(
  doc: PdfDocument,
  currentY: number,
  blockHeight: number,
  pageHeight: number,
  pageWidth: number
) {
  if (currentY + blockHeight <= pageHeight - PAGE_BOTTOM_MARGIN) {
    return currentY
  }

  doc.addPage()
  doc.setDrawColor(232, 223, 204)
  doc.line(PAGE_MARGIN, PAGE_MARGIN, pageWidth - PAGE_MARGIN, PAGE_MARGIN)
  return PAGE_MARGIN + 10
}

async function loadImageDataUrl(path: string) {
  const resolvedUrl = new URL(path, window.location.origin).toString()
  const response = await fetch(resolvedUrl)

  if (!response.ok) {
    throw new Error("Nao foi possivel carregar o logo da empresa.")
  }

  const blob = await response.blob()
  return blobToDataUrl(blob)
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function buildQuoteFileName(quote: Quote) {
  const safeClientName = sanitizeFileName(quote.garden_client_name)
  return `orcamento-${safeClientName || "cliente"}-${quote.id.slice(0, 8)}.pdf`
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
