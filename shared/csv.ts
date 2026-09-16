// Parser de CSV mínimo, sem dependência externa — cobre o que o import de times/fixtures precisa:
// vírgula como separador, campo entre aspas (pode ter vírgula/quebra de linha dentro), aspas
// duplicadas escapando aspas ("" dentro de um campo entre aspas = um " literal), CRLF ou LF.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Normaliza BOM (Excel/Windows adoram salvar CSV com BOM UTF-8 na frente).
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

// Header + linhas -> objetos { coluna: valor }, casados por posição com a primeira linha (header).
// Ignora linhas totalmente vazias (comum no fim de um CSV exportado de planilha).
export function csvToObjects(text: string): Record<string, string>[] {
  const rows = parseCsv(text);
  const [header, ...rest] = rows;
  if (!header) return [];
  const columns = header.map((column) => column.trim().toLowerCase());

  return rest
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, (row[index] ?? "").trim()])));
}
