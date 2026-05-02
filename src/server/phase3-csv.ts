// Tiny RFC-4180 CSV parser. Server-only (uses node:fs).
// Used to read frozen Phase 3 CSV exports bundled at src/data/phase3/.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export type CsvRow = Record<string, string>;

function parseCSV(text: string): CsvRow[] {
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") {
      row.push(field); field = "";
      // Skip blank trailing line
      if (!(row.length === 1 && row[0] === "")) rows.push(row);
      row = []; i++; continue;
    }
    field += c; i++;
  }
  // Final field/row
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (!(row.length === 1 && row[0] === "")) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const obj: CsvRow = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = r[j] ?? "";
    return obj;
  });
}

export function readPhase3CSV(filename: string): CsvRow[] {
  // process.cwd() at runtime is the project root in dev and the deployed worker
  // bundle root in prod. We bundle src/data/phase3/*.csv via Vite's ?raw import
  // in the consumer file, but for SSR-only Node access we read from disk in dev
  // and fall back to a bundled string in prod (see consumer).
  const path = join(process.cwd(), "src", "data", "phase3", filename);
  return parseCSV(readFileSync(path, "utf8"));
}

export function parsePhase3CSV(text: string): CsvRow[] {
  return parseCSV(text);
}
