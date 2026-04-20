import { format, startOfMonth } from "date-fns"
import { pt } from "date-fns/locale"
import type { AuthCompany } from "@/lib/auth/types"
import type { CalendarEntry } from "@/features/calendar/types"
import { getCalendarEntriesByDate, getMonthDays, toIsoDate, formatTaskTimeRange } from "@/features/calendar/utils"
import { formatCurrency } from "@/features/payments/utils"

export async function generateCalendarPdf(
  month: Date,
  company: AuthCompany,
  entries: CalendarEntry[],
  teamNameById: Record<string, string>,
  gardenNameById: Record<string, string>
) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
  })

  const monthStart = startOfMonth(month)
  const monthDays = getMonthDays(monthStart)
  const entriesByDate = getCalendarEntriesByDate(entries)

  // Setup
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 10
  const marginY = 15
  const contentWidth = pageWidth - marginX * 2
  const contentHeight = pageHeight - marginY * 2

  // Colors - convert hex to RGB
  const colors = {
    text: [31, 47, 39], // #1f2f27
    muted: [107, 114, 128], // #6b7280
    accent: [33, 84, 66], // #215442
    accentSoft: [231, 239, 233], // #e7efe9
    border: [217, 211, 195], // #d9d3c3
    surface: [247, 243, 232], // #f7f3e8
    lightBg: [254, 249, 240], // #fef9f0
    weekend: [255, 245, 230], // #fff5e6
  }

  // Header
  let cursorY = marginY

  // Title
  doc.setFontSize(24)
  doc.setFont(undefined, "bold")
  doc.setTextColor(...colors.text)
  doc.text(`Calendário - ${format(monthStart, "MMMM yyyy", { locale: pt }).toUpperCase()}`, marginX, cursorY)
  cursorY += 12

  // Calendar grid
  const dayLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]
  const cellWidth = contentWidth / 7
  const rowHeight = (contentHeight - 8) / 6

  // Draw day headers
  doc.setFontSize(9)
  doc.setFont(undefined, "bold")
  doc.setTextColor(...colors.accent)

  dayLabels.forEach((label, index) => {
    const x = marginX + index * cellWidth
    doc.text(label, x + 2, cursorY + 4, { align: "left" })
  })

  cursorY += 6

  // Draw calendar cells
  doc.setFontSize(7)
  let gridRow = 0

  monthDays.forEach(({ date: day, isCurrentMonth }, index) => {
    const dayColumn = index % 7
    const isWeekend = dayColumn > 4

    if (dayColumn === 0 && index > 0) {
      gridRow++
    }

    const cellX = marginX + dayColumn * cellWidth
    const cellY = cursorY + gridRow * rowHeight

    // Background
    if (!isCurrentMonth) {
      doc.setFillColor(...colors.surface)
    } else if (isWeekend) {
      doc.setFillColor(...colors.weekend)
    } else {
      doc.setFillColor(...colors.lightBg)
    }

    doc.rect(cellX, cellY, cellWidth, rowHeight, "F")

    // Border
    doc.setDrawColor(...colors.border)
    doc.rect(cellX, cellY, cellWidth, rowHeight)

    // Day number
    doc.setFont(undefined, "bold")
    if (isCurrentMonth) {
      doc.setTextColor(...colors.text)
    } else {
      doc.setTextColor(...colors.muted)
    }
    doc.setFontSize(10)
    doc.text(format(day, "d"), cellX + 1.5, cellY + 3.5)

    // Entries
    const dayKey = toIsoDate(day)
    const dayEntries = entriesByDate[dayKey] ?? []

    doc.setFontSize(5.5)
    doc.setFont(undefined, "normal")

    let entryY = cellY + 6
    const maxEntriesPerCell = 4

    dayEntries.slice(0, maxEntriesPerCell).forEach((entry) => {
      const entryHeight = 3.2
      if (entryY + entryHeight < cellY + rowHeight - 0.5) {
        const title = entry.kind === "automatic-garden" ? entry.garden_name : gardenNameById[entry.garden_id] ?? "N/A"
        const timeRange = formatTaskTimeRange(entry)

        doc.setTextColor(...colors.accent)
        const entryText = timeRange ? `- ${title} (${timeRange})` : `- ${title}`
        const truncatedText = entryText.substring(0, 40)
        doc.text(truncatedText, cellX + 1.5, entryY, { maxWidth: cellWidth - 2, lineHeightFactor: 1 })
        entryY += entryHeight
      }
    })

    if (dayEntries.length > maxEntriesPerCell) {
      doc.setTextColor(...colors.muted)
      doc.text(`+${dayEntries.length - maxEntriesPerCell} mais`, cellX + 1.5, entryY)
    }
  })

  // Footer
  const footerY = pageHeight - marginY + 3
  doc.setFontSize(8)
  doc.setTextColor(...colors.muted)
  doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, marginX, footerY, {
    align: "left",
  })
  doc.text(`Página 1 de 1`, pageWidth - marginX, footerY, { align: "right" })

  return doc
}

export function downloadCalendarPdf(doc: any, month: Date) {
  const fileName = `calendario-${format(month, "yyyy-MM")}.pdf`
  doc.save(fileName)
}
