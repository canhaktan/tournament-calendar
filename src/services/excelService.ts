import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Tournament } from '../types';

export const exportTournamentsToExcel = async (
    tournaments: Tournament[],
    selectedCurrency: 'TRY' | 'USD' | 'EUR',
    rates: Record<string, number>
) => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tournaments 2026');

    // Sort tournaments by start date
    const sortedTournaments = [...tournaments].sort((a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    // 1. Setup Static Columns (A, B, C, D)
    // Widths will be adjusted later, but setting initial reasonable keys helps.
    sheet.columns = [
        { key: 'A', width: 14 }, // Date
        { key: 'B', width: 30 }, // Quarter / Expense
        { key: 'C', width: 25 }, // Name / Amount
        { key: 'D', width: 15 }, // Duration / Link
    ];

    // Start writing data
    let currentRow = 2;

    // Draw Financial Summary at Top Right (Cols F-I)
    drawFinancialSummary(sheet, 2, sortedTournaments, selectedCurrency, rates);

    for (const t of sortedTournaments) {
        currentRow = drawTournamentBlock(sheet, t, currentRow, selectedCurrency, rates);
        currentRow += 2; // Spacing between tournaments
    }

    // 3. Auto-size Columns
    adjustColumnWidths(sheet);

    // 4. Save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Tournament_Budget_${new Date().getFullYear()}.xlsx`);
};

function drawTournamentBlock(
    sheet: ExcelJS.Worksheet,
    t: Tournament,
    startRow: number,
    targetCurrency: string,
    rates: Record<string, number>
): number {
    const quarter = getQuarter(t.startDate);
    const year = new Date(t.startDate).getFullYear();
    const startRowIdx = startRow;

    // --- Header Merges (Vertical) ---
    // Merge B, C, D across startRow and startRow+1 (to match the 2 dates in A)
    sheet.mergeCells(`B${startRow}:B${startRow + 1}`);
    sheet.mergeCells(`C${startRow}:C${startRow + 1}`);
    sheet.mergeCells(`D${startRow}:D${startRow + 1}`);

    // --- Row 1: Header ---
    const r1 = sheet.getRow(startRow);
    // r1.height = 25; // Removed to keep "normal" size
    // Actually, maybe set both rows height or let auto?
    // Let's leave height logic simple for now.

    // A: Start Date
    const cellA = r1.getCell(1);
    cellA.value = formatDate(t.startDate);
    cellA.alignment = { horizontal: 'right', vertical: 'bottom' };
    cellA.font = { name: 'Calibri', size: 11 };

    // B: Quarter (Colored) - Merged
    const cellB = r1.getCell(2);
    cellB.value = `Q${quarter} ${year}`;
    cellB.alignment = { horizontal: 'center', vertical: 'middle' };
    cellB.font = { name: 'Calibri', size: 11, bold: true };
    const qColor = getQuarterColor(quarter);
    cellB.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: qColor } };

    // C: Name (Colored) - Merged
    const cellC = r1.getCell(3);
    cellC.value = t.country ? `${t.country} (${t.title})` : t.title;
    cellC.alignment = { horizontal: 'left', vertical: 'middle' };
    cellC.font = { name: 'Calibri', size: 11, bold: true };
    cellC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9BC2E6' } };

    // D: Duration - Merged
    const cellD = r1.getCell(4);
    cellD.value = t.rounds ? `${t.rounds} games` : '';
    cellD.alignment = { horizontal: 'left', vertical: 'middle' };
    cellD.font = { name: 'Calibri', size: 11 };

    // --- Row 2: End Date ---
    // Since B,C,D are merged, we only touch A here.
    const r2 = sheet.getRow(startRow + 1);
    const cellA2 = r2.getCell(1);
    cellA2.value = formatDate(t.endDate);
    cellA2.alignment = { horizontal: 'right', vertical: 'top' };
    cellA2.font = { name: 'Calibri', size: 11 };

    // --- Expenses (Start from Row 3 relative to block) ---
    let currentRow = startRow + 2;
    let total = 0;

    const useBasic = t.budgetSource === 'basic';
    const expenses = t.expenses || [];

    if (!useBasic && expenses.length > 0) {
        // DETAILED MODE
        for (const exp of expenses) {
            const r = sheet.getRow(currentRow);

            // B: Title
            r.getCell(2).value = exp.title;
            r.getCell(2).font = { name: 'Calibri', size: 11 };

            // C: Amount (Converted)
            const amountInSource = Number(exp.amount) || 0;
            const currencyInSource = exp.currency || 'TRY';

            // Allow rates to be passed properly or fallback
            const convertedAmount = convertCurrency(amountInSource, currencyInSource, targetCurrency, rates);

            r.getCell(3).value = convertedAmount;
            r.getCell(3).numFmt = '0';
            r.getCell(3).font = { name: 'Calibri', size: 11 };
            r.getCell(3).alignment = { horizontal: 'right' };

            // D: Link text
            if (exp.link) {
                const cellLink = r.getCell(4);
                cellLink.value = { text: 'Link', hyperlink: exp.link };
                cellLink.font = { name: 'Calibri', size: 11, underline: true, color: { argb: 'FF0563C1' } };
            }

            total += convertedAmount;
            currentRow++;
        }
    } else {
        // BASIC MODE (or Detailed but no expenses provided)
        const r = sheet.getRow(currentRow);
        r.getCell(2).value = "Estimated Budget";

        const budgetSource = t.budget || 0;
        const budgetCurrency = t.currency || 'TRY';
        const convertedBudget = convertCurrency(budgetSource, budgetCurrency, targetCurrency, rates);

        r.getCell(3).value = convertedBudget;
        r.getCell(3).numFmt = '0';
        total = convertedBudget;
        currentRow++;
    }

    // --- Total Row ---
    const rTotal = sheet.getRow(currentRow);
    // B: Label
    // Use targetCurrency (the one selected for display/export) not the tournament default
    rTotal.getCell(2).value = `TOTAL EXPENSE (${targetCurrency})`;
    rTotal.getCell(2).font = { name: 'Calibri', size: 14, bold: true };

    // C: Value
    rTotal.getCell(3).value = total;
    rTotal.getCell(3).font = { name: 'Calibri', size: 14, bold: true };
    rTotal.getCell(3).numFmt = '0';
    rTotal.getCell(3).alignment = { horizontal: 'right' };

    currentRow++;
    currentRow++; // Empty line before Footer? No, screenshot shows spacing

    // --- Footer: Tournament Link ---
    // --- Footer: Tournament Link & Status ---
    // We create this row if there is a link OR we always want to show status?
    // User asked "link'in sagindaki hucreye", implies the row exists.
    // Let's create the row always or if link exists. 
    // Usually link exists. Let's assume row is for footer info.
    const rFooter = sheet.getRow(currentRow);
    let footerHasContent = false;

    if (t.link) {
        // A: Label
        rFooter.getCell(1).value = "Tournament Link:";
        rFooter.getCell(1).font = { name: 'Calibri', size: 11 };
        rFooter.getCell(1).alignment = { horizontal: 'right' };

        // B: Link
        const linkVal = rFooter.getCell(2);
        linkVal.value = { text: 'Tournament link', hyperlink: t.link };
        linkVal.font = { name: 'Calibri', size: 11, underline: true, color: { argb: 'FF0563C1' } };

        footerHasContent = true;
    }

    // C: Play Status (Right of Link)
    const statusText = t.isGoing ? "PLAY_STATUS = CONFIRMED" : "PLAY_STATUS = UNKNOWN";
    const cellStatus = rFooter.getCell(3);
    cellStatus.value = statusText;

    // Style: 14pt, Bold
    cellStatus.font = { name: 'Calibri', size: 14, bold: true };
    cellStatus.alignment = { horizontal: 'left' };

    // Fill: Green (`FF92D050`) if Confirmed, Grey (`FFD9D9D9`) if Unknown
    const statusColor = t.isGoing ? 'FF92D050' : 'FFD9D9D9';
    cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };

    footerHasContent = true;

    if (footerHasContent) {
        currentRow++;
    }

    const endRowIdx = currentRow - 1;

    // --- Borders ---
    // Box around A{startRow} : D{endRowIdx}
    applyBoxBorder(sheet, startRowIdx, endRowIdx, 1, 4);

    return currentRow;
}

// Helpers
function convertCurrency(amount: number, from: string, to: string, rates: Record<string, number>): number {
    if (from === to) return amount;
    // Basic cross-rate conversion assuming rates are relative to a base (e.g. TRY=1) or direct values.
    // If rates = { TRY: 1, USD: 35.5, EUR: 37.2 }
    // AmountInBase = amount * RateFrom (if Rate is "1 unit = X Base")? 
    // Standard approach in this app seems to be: 
    // If we have rates like 35.5 for USD, it usually means 1 USD = 35.5 TRY.

    // So:
    // 1. Convert 'from' currency to TRY (Base)
    //    amount * rate(from)  -> e.g. 100 USD * 35.5 = 3550 TRY
    // 2. Convert TRY to 'to' currency
    //    amountInTRY / rate(to) -> e.g. 3550 TRY / 37.2 = 95.43 EUR

    // If rate is missing, fallback to 1 (no conversion)
    const rateFrom = rates[from] || 1;
    const rateTo = rates[to] || 1;

    // Special check: If base is implied as 1 (TRY)
    // But we need to handle if 'rates' actually contains the rates.
    // If rates is empty, return amount.
    if (!rates || Object.keys(rates).length === 0) return amount;

    return (amount * rateFrom) / rateTo;
}

function formatDate(iso: string): string {
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    // Format: 7.04.2026 (No leading zero for day)
    return `${day}.${month < 10 ? '0' + month : month}.${year}`;
}

function getQuarter(iso: string): number {
    return Math.floor(new Date(iso).getMonth() / 3) + 1;
}

function getQuarterColor(q: number): string {
    // Q1: Peach/Orange (F4B084)
    // Q2: Green (92D050)
    switch (q) {
        case 1: return 'FFF4B084';
        case 2: return 'FF92D050';
        case 3: return 'FFCCC0DA'; // Lavender/Purple (Distinct from Blue header)
        case 4: return 'FFFFD966'; // Yellow
        default: return 'FFFFFFFF';
    }
}

function applyBoxBorder(sheet: ExcelJS.Worksheet, rStart: number, rEnd: number, cStart: number, cEnd: number) {
    // Top
    for (let c = cStart; c <= cEnd; c++) {
        const cell = sheet.getRow(rStart).getCell(c);
        cell.border = { ...cell.border, top: { style: 'medium' } };
    }
    // Bottom
    for (let c = cStart; c <= cEnd; c++) {
        const cell = sheet.getRow(rEnd).getCell(c);
        cell.border = { ...cell.border, bottom: { style: 'medium' } };
    }
    // Left
    for (let r = rStart; r <= rEnd; r++) {
        const cell = sheet.getRow(r).getCell(cStart);
        cell.border = { ...cell.border, left: { style: 'medium' } };
    }
    // Right
    for (let r = rStart; r <= rEnd; r++) {
        const cell = sheet.getRow(r).getCell(cEnd);
        cell.border = { ...cell.border, right: { style: 'medium' } };
    }
}

function adjustColumnWidths(sheet: ExcelJS.Worksheet) {
    sheet.columns.forEach(col => {
        let maxLen = 0;
        col.eachCell && col.eachCell({ includeEmpty: false }, (cell) => {
            const v = cell.value;
            let len = 0;
            if (v) {
                if (typeof v === 'string') len = v.length;
                else if (typeof v === 'number') len = v.toString().length;
                else if (typeof v === 'object' && 'text' in v) len = (v as any).text.length;
            }

            // Correction for Font Size/Bold
            if (cell.font) {
                if (cell.font.bold) len *= 1.2; // Bold is wider
                if (cell.font.size && cell.font.size > 11) {
                    len *= (cell.font.size / 10); // Standard roughly 10-11
                }
            }

            if (len > maxLen) maxLen = len;
        });
        col.width = Math.max(maxLen + 2, 12); // Min 12
    });
}

function drawFinancialSummary(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    tournaments: Tournament[],
    currency: string,
    rates: Record<string, number>
) {
    // 1. Calculate Stats Split by Status (Confirmed/Unknown)
    const totalTournaments = tournaments.length;

    // Structure to hold split totals
    // 1=Q1, 2=Q2, etc.
    const qSplitTotals = {
        1: { confirmed: 0, unknown: 0 },
        2: { confirmed: 0, unknown: 0 },
        3: { confirmed: 0, unknown: 0 },
        4: { confirmed: 0, unknown: 0 }
    };

    let grandTotalConfirmed = 0;
    let grandTotalUnknown = 0;

    tournaments.forEach(t => {
        const q = getQuarter(t.startDate);
        const isConfirmed = t.isGoing; // true -> Confirmed, false -> Unknown
        let tCost = 0;

        // Check budgetSource explicitly
        if (t.budgetSource === 'basic') {
            const budg = t.budget || 0;
            const curr = t.currency || 'TRY';
            tCost = convertCurrency(budg, curr, currency, rates);
        } else {
            // Detailed
            if (t.expenses && t.expenses.length > 0) {
                tCost = t.expenses.reduce((sum, exp) => {
                    const amount = Number(exp.amount) || 0;
                    const curr = exp.currency || 'TRY';
                    return sum + convertCurrency(amount, curr, currency, rates);
                }, 0);
            } else {
                // Fallback if detailed selected but no expenses? Use budget as estimate
                const budg = t.budget || 0;
                const curr = t.currency || 'TRY';
                tCost = convertCurrency(budg, curr, currency, rates);
            }
        }

        // Add to totals
        if (isConfirmed) {
            grandTotalConfirmed += tCost;
            if (q >= 1 && q <= 4) qSplitTotals[q as 1 | 2 | 3 | 4].confirmed += tCost;
        } else {
            grandTotalUnknown += tCost;
            if (q >= 1 && q <= 4) qSplitTotals[q as 1 | 2 | 3 | 4].unknown += tCost;
        }
    });

    // --- Draw at offset columns F-I (6-9) ---
    let r = startRow;
    const C_START = 6; // F
    const C_END = 8;   // H (The design looks like 3 distinct columns wide: Header + Unknown + Confirmed)
    // Screenshot shows: [Q1 Label] [Unknown Val] [Confirmed Val]
    // That's 3 columns. F, G, H.

    // Adjust logic to use F, G, H
    sheet.getColumn(6).width = 35; // F: Labels (wide) - increased for 16pt
    sheet.getColumn(7).width = 35; // G: Unknown (wide) - increased for 16pt
    sheet.getColumn(8).width = 35; // H: confirmed (wide) - increased for 16pt

    // --- Row 1: Main Header (Double Height) ---
    const rHead = sheet.getRow(r);
    // Merge F-H vertically (r to r+1)
    sheet.mergeCells(r, C_START, r + 1, C_END);

    const cellHead = rHead.getCell(C_START);
    cellHead.value = "FINANCIAL OVERVIEW";
    cellHead.alignment = { horizontal: 'center', vertical: 'middle' };
    cellHead.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }; // 16pt
    cellHead.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } }; // Black bg

    r += 2; // Jump 2 rows

    // --- Row 2: Sub Headers ---
    const rSub = sheet.getRow(r);

    // G: Unknown
    const cellUnk = rSub.getCell(C_START + 1);
    cellUnk.value = "UNKNOWN TOURNAMENTS";
    cellUnk.alignment = { horizontal: 'center', vertical: 'middle' };
    cellUnk.font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    cellUnk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Grey

    // H: Confirmed
    const cellConf = rSub.getCell(C_START + 2);
    cellConf.value = "CONFIRMED TOURNAMENTS";
    cellConf.alignment = { horizontal: 'center', vertical: 'middle' };
    cellConf.font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    cellConf.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }; // Green

    // F border to match box
    rSub.getCell(C_START).border = { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' } };
    r++;

    // --- Rows 3-6: Quarters ---
    const quarters = [1, 2, 3, 4];
    quarters.forEach(q => {
        const rStart = r;
        const rEnd = r + 1;
        const row = sheet.getRow(rStart);

        // Merge Vertical (2 rows height)
        sheet.mergeCells(rStart, C_START, rEnd, C_START);         // F
        sheet.mergeCells(rStart, C_START + 1, rEnd, C_START + 1); // G
        sheet.mergeCells(rStart, C_START + 2, rEnd, C_START + 2); // H

        // F: Label (e.g. "Q1 2026")
        const cellLbl = row.getCell(C_START);
        cellLbl.value = `Q${q} 2026`;
        cellLbl.alignment = { horizontal: 'center', vertical: 'middle' }; // Vertical middle essential for merged
        cellLbl.font = { name: 'Calibri', size: 16, bold: true };
        cellLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getQuarterColor(q) } };

        // G: Unknown Value
        const cellValUnk = row.getCell(C_START + 1);
        cellValUnk.value = qSplitTotals[q as 1].unknown;
        cellValUnk.numFmt = '0';
        cellValUnk.font = { name: 'Calibri', size: 16, bold: true };
        cellValUnk.alignment = { horizontal: 'center', vertical: 'middle' };

        // H: Confirmed Value
        const cellValConf = row.getCell(C_START + 2);
        cellValConf.value = qSplitTotals[q as 1].confirmed;
        cellValConf.numFmt = '0';
        cellValConf.font = { name: 'Calibri', size: 16, bold: true };
        cellValConf.alignment = { horizontal: 'center', vertical: 'middle' };

        // Inner Borders (Applied to top-left cell of merge)
        cellLbl.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'medium' }, right: { style: 'thin' } };
        cellValUnk.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        cellValConf.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'medium' } };

        r += 2; // Jump 2 rows
    });

    // --- Total Row ---
    const rTotal = sheet.getRow(r);
    // F: Label
    const cellTLbl = rTotal.getCell(C_START);
    cellTLbl.value = `TOTAL ESTIMATED BUDGET (${currency})`;
    cellTLbl.font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    cellTLbl.alignment = { horizontal: 'left' };

    // G: Unknown Total
    const cellTUnk = rTotal.getCell(C_START + 1);
    cellTUnk.value = grandTotalUnknown;
    cellTUnk.numFmt = '0';
    cellTUnk.font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    cellTUnk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } }; // Grey
    cellTUnk.alignment = { horizontal: 'center' };

    // H: Confirmed Total
    const cellTConf = rTotal.getCell(C_START + 2);
    cellTConf.value = grandTotalConfirmed;
    cellTConf.numFmt = '0';
    cellTConf.font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    cellTConf.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } }; // Green
    cellTConf.alignment = { horizontal: 'center' };

    r++;

    // --- Footer Row: Num Tournaments & Date ---
    const rFoot = sheet.getRow(r);

    // F: Label
    rFoot.getCell(C_START).value = `NUMBER OF TOURNAMENTS: ${totalTournaments}`;
    rFoot.getCell(C_START).font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    rFoot.getCell(C_START).alignment = { horizontal: 'left' };

    // Calculate Counts
    const countConfirmed = tournaments.filter(t => t.isGoing).length;
    const countUnknown = tournaments.length - countConfirmed;

    // G: Unknown Count
    rFoot.getCell(C_START + 1).value = countUnknown;
    rFoot.getCell(C_START + 1).alignment = { horizontal: 'center' };
    rFoot.getCell(C_START + 1).font = { name: 'Calibri', size: 16, bold: true }; // 16pt

    // H: Confirmed Count
    rFoot.getCell(C_START + 2).value = countConfirmed;
    rFoot.getCell(C_START + 2).alignment = { horizontal: 'center' };
    rFoot.getCell(C_START + 2).font = { name: 'Calibri', size: 16, bold: true }; // 16pt
    r++;

    // --- Printed At Row (New Row) ---
    const rPrint = sheet.getRow(r);
    const dateStr = formatDate(new Date().toISOString()); // e.g. 4.01.2026
    rPrint.getCell(C_START + 2).value = `Printed at: ${dateStr}`;
    rPrint.getCell(C_START + 2).font = { name: 'Calibri', size: 12, italic: true }; // Keep this slightly smaller/different? Or 16? Let's keep 12 for metadata usually.
    rPrint.getCell(C_START + 2).alignment = { horizontal: 'right' };

    // Borders for outer box
    const lastR = r;
    // Top (row startRow)
    for (let c = C_START; c <= C_END; c++) sheet.getRow(startRow).getCell(c).border = { ...sheet.getRow(startRow).getCell(c).border, top: { style: 'medium' } };
    // Bottom (row lastR)
    for (let c = C_START; c <= C_END; c++) sheet.getRow(lastR).getCell(c).border = { ...sheet.getRow(lastR).getCell(c).border, bottom: { style: 'medium' } };
    // Left (col C_START)
    for (let row = startRow; row <= lastR; row++) sheet.getRow(row).getCell(C_START).border = { ...sheet.getRow(row).getCell(C_START).border, left: { style: 'medium' } };
    // Right (col C_END)
    for (let row = startRow; row <= lastR; row++) sheet.getRow(row).getCell(C_END).border = { ...sheet.getRow(row).getCell(C_END).border, right: { style: 'medium' } };
}