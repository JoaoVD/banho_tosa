import 'server-only';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Lê .xlsx (primeira aba) ou .csv (vírgula ou ponto e vírgula) como texto. */
export async function parseSheet(file: ArrayBuffer, filename: string): Promise<{ headers: string[]; rows: string[][] }> {
  let matriz: string[][];
  if (/\.xlsx$/i.test(filename)) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(file);
    const ws = wb.worksheets[0];
    matriz = [];
    ws?.eachRow({ includeEmpty: false }, (row) => {
      const valores: string[] = [];
      for (let c = 1; c <= ws.columnCount; c++) {
        const cell = row.getCell(c);
        const v = cell.value;
        valores.push(v instanceof Date ? iso(v) : (cell.text ?? '').trim());
      }
      matriz.push(valores);
    });
  } else {
    const texto = new TextDecoder('utf-8').decode(file).replace(/^﻿/, '');
    const res = Papa.parse<string[]>(texto, { skipEmptyLines: true, delimitersToGuess: [';', ',', '\t'] });
    matriz = res.data.map((r) => r.map((c) => String(c ?? '').trim()));
  }
  const [headers = [], ...rows] = matriz;
  return { headers, rows };
}
