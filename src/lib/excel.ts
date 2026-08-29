import "server-only";
import ExcelJS from "exceljs";

export type Column = { header: string; key: string; width?: number; money?: boolean };

/**
 * One place that builds every export, so all downloads look the same when the
 * accounts office opens them.
 */
export async function buildWorkbook({
  sheetName,
  title,
  subtitle,
  columns,
  rows,
  totalOf,
}: {
  sheetName: string;
  title: string;
  subtitle?: string;
  columns: Column[];
  rows: Record<string, string | number | null>[];
  totalOf?: string;
}) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Al Sadiq Trust Collection System";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: subtitle ? 4 : 3 }],
  });

  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { size: 14, bold: true, color: { argb: "FF0C4A3E" } };

  if (subtitle) {
    ws.mergeCells(2, 1, 2, columns.length);
    const sub = ws.getCell(2, 1);
    sub.value = subtitle;
    sub.font = { size: 10, color: { argb: "FF5C6A6B" } };
  }

  const headerRowIndex = subtitle ? 4 : 3;
  const header = ws.getRow(headerRowIndex);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF12181C" } };
    cell.alignment = { vertical: "middle" };
    ws.getColumn(i + 1).width = c.width ?? 18;
  });
  header.height = 20;

  rows.forEach((r, ri) => {
    const row = ws.getRow(headerRowIndex + 1 + ri);
    columns.forEach((c, ci) => {
      const cell = row.getCell(ci + 1);
      cell.value = r[c.key] ?? "";
      if (c.money) {
        cell.numFmt = "#,##0";
        cell.alignment = { horizontal: "right" };
      }
    });
  });

  if (totalOf) {
    const totalRow = ws.getRow(headerRowIndex + rows.length + 1);
    const idx = columns.findIndex((c) => c.key === totalOf);
    totalRow.getCell(1).value = "Total";
    totalRow.getCell(1).font = { bold: true };
    const sum = rows.reduce((s, r) => s + Number(r[totalOf] ?? 0), 0);
    const cell = totalRow.getCell(idx + 1);
    cell.value = sum;
    cell.numFmt = "#,##0";
    cell.font = { bold: true };
    cell.border = { top: { style: "thin" } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function xlsxResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
