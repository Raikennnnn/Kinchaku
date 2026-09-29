/** Minimal RFC 4180 CSV: quoted fields, doubled quotes, CRLF or LF line ends. */

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (starting with
 * = + - @ or a tab) gets a leading apostrophe, so a note can't execute.
 */
function cell(value: string | number, isText: boolean): string {
  let s = String(value);
  if (isText && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: (string | number)[][], numericColumns: number[] = []): string {
  const lines = [header, ...rows].map((r, ri) =>
    r.map((v, ci) => cell(v, ri === 0 || !numericColumns.includes(ci))).join(","),
  );
  // BOM so Excel opens accented names and currency symbols correctly.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
