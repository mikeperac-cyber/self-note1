import { SheetCell } from '../types';

export function colIndexToLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letter: string): number {
  let col = 0;
  for (let i = 0; i < letter.length; i++) {
    col = col * 26 + (letter.charCodeAt(i) - 64);
  }
  return col - 1;
}

export function parseCoordinate(coord: string): { col: number; row: number } | null {
  const match = coord.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  return {
    col: letterToColIndex(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

export function expandRange(startCoord: string, endCoord: string): string[] {
  const start = parseCoordinate(startCoord);
  const end = parseCoordinate(endCoord);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const coords: string[] = [];
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      coords.push(`${colIndexToLetter(c)}${r + 1}`);
    }
  }
  return coords;
}

export function evaluateCell(
  cellKey: string,
  cells: Record<string, SheetCell>,
  visited: Set<string> = new Set()
): string {
  const cell = cells[cellKey];
  if (!cell || !cell.raw) return '';

  const raw = cell.raw.trim();
  if (!raw.startsWith('=')) {
    return raw;
  }

  // Prevent circular dependency loop
  if (visited.has(cellKey)) {
    return '#CIRCULAR!';
  }
  visited.add(cellKey);

  try {
    const expr = raw.substring(1).trim();

    // 1. Function patterns: SUM(A1:A5), AVERAGE(A1:A5), MIN, MAX, COUNT
    const fnMatch = expr.match(/^(SUM|AVERAGE|AVG|MIN|MAX|COUNT)\(([^)]+)\)$/i);
    if (fnMatch) {
      const fnName = fnMatch[1].toUpperCase();
      const argsStr = fnMatch[2].trim();

      const cellKeysToAggregate: string[] = [];
      const parts = argsStr.split(/[,;]/);

      for (const part of parts) {
        const p = part.trim();
        if (p.includes(':')) {
          const [start, end] = p.split(':');
          cellKeysToAggregate.push(...expandRange(start, end));
        } else {
          cellKeysToAggregate.push(p.toUpperCase());
        }
      }

      const values: number[] = [];
      for (const k of cellKeysToAggregate) {
        const evaluated = evaluateCell(k, cells, new Set(visited));
        const num = parseFloat(evaluated.replace(/[$,%]/g, ''));
        if (!isNaN(num)) {
          values.push(num);
        }
      }

      let result = 0;
      if (fnName === 'SUM') {
        result = values.reduce((a, b) => a + b, 0);
      } else if (fnName === 'AVERAGE' || fnName === 'AVG') {
        result = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      } else if (fnName === 'MIN') {
        result = values.length ? Math.min(...values) : 0;
      } else if (fnName === 'MAX') {
        result = values.length ? Math.max(...values) : 0;
      } else if (fnName === 'COUNT') {
        result = values.length;
      }

      return formatValue(result, cell.format);
    }

    // 2. Arithmetic expressions: e.g. C2*12 or A1+B2/2
    // Replace coordinate tokens with evaluated numeric values
    let sanitizedExpr = expr.replace(/[A-Z]+\d+/gi, match => {
      const coord = match.toUpperCase();
      const val = evaluateCell(coord, cells, new Set(visited));
      const cleanNum = parseFloat(val.replace(/[$,%]/g, ''));
      return isNaN(cleanNum) ? '0' : String(cleanNum);
    });

    // Only allow digits, operators, parentheses, and decimals
    if (/^[0-9+\-*/().\s]+$/.test(sanitizedExpr)) {
      // Safe math eval using Function
      // eslint-disable-next-line no-new-func
      const calc = new Function(`return (${sanitizedExpr});`)();
      if (typeof calc === 'number' && !isNaN(calc) && isFinite(calc)) {
        return formatValue(calc, cell.format);
      }
    }

    return '#VALUE!';
  } catch (err) {
    return '#ERROR!';
  }
}

export function formatValue(val: number, format?: SheetCell['format']): string {
  if (format === 'currency') {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (format === 'percent') {
    return `${(val * 100).toFixed(1)}%`;
  }
  return String(Math.round(val * 100) / 100);
}

export function exportSheetToCSV(
  rows: number,
  cols: number,
  cells: Record<string, SheetCell>
): string {
  const lines: string[] = [];
  for (let r = 0; r < rows; r++) {
    const rowValues: string[] = [];
    for (let c = 0; c < cols; c++) {
      const key = `${colIndexToLetter(c)}${r + 1}`;
      const evaluated = evaluateCell(key, cells);
      const escaped = `"${evaluated.replace(/"/g, '""')}"`;
      rowValues.push(escaped);
    }
    lines.push(rowValues.join(','));
  }
  return lines.join('\n');
}

export function parseCSVToSheet(csvText: string): {
  rows: number;
  cols: number;
  cells: Record<string, SheetCell>;
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  const cells: Record<string, SheetCell> = {};
  let maxCols = 0;

  lines.forEach((line, rowIndex) => {
    // Simple CSV parser handling quotes
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const values: string[] = [];
    let match;
    while ((match = regex.exec(line)) && match[0] !== '') {
      let val = match[1] || '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      values.push(val);
      if (regex.lastIndex >= line.length) break;
    }

    maxCols = Math.max(maxCols, values.length);

    values.forEach((v, colIndex) => {
      const coord = `${colIndexToLetter(colIndex)}${rowIndex + 1}`;
      cells[coord] = { raw: v };
    });
  });

  return {
    rows: Math.max(10, lines.length + 2),
    cols: Math.max(6, maxCols + 1),
    cells,
  };
}
