/** Escape cells and neutralize spreadsheet formulas in user-entered text. */
export function toCsv(rows: (string | number)[][]) {
  return rows.map(row => row.map(cell => {
    const raw = String(cell);
    const value = typeof cell === 'string' && /^[\s]*[=+@-]/.test(raw) ? `'${raw}` : raw;
    return `"${value.replace(/"/g, '""')}"`;
  }).join(',')).join('\r\n');
}
