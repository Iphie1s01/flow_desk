/** RFC 4180 CSV. Cells that start with = + - @ are prefixed so spreadsheets never execute them as formulas. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const cell = (v: unknown) => {
    let s =
      v == null
        ? ""
        : v instanceof Date
          ? v.toISOString().slice(0, 10)
          : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return (
    "\uFEFF" +
    [
      columns.join(","),
      ...rows.map((r) => columns.map((c) => cell(r[c])).join(",")),
    ].join("\r\n")
  );
}
