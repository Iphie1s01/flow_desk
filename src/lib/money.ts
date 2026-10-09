/** All money is integer minor units (kobo). Never floats. */
export function parseMoney(input: string | number): number {
  const s = String(input).replace(/[,₦$\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  const [whole, frac = ""] = s.split(".");
  const v = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  return v <= 1_000_000_000_000 ? v : NaN;
}
export const formatMoney = (minor: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(minor / 100);
export const toInput = (minor: number) =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
/** Same formula as the database: (subtotal - discount) + round((subtotal - discount) * bp / 10000). */
export function invoiceTotals(
  items: { quantity: number; unit: number }[],
  discount: number,
  taxBp: number,
) {
  const subtotal = items.reduce((a, i) => a + i.quantity * i.unit, 0);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = Math.round((taxable * taxBp) / 10000);
  return { subtotal, tax, total: taxable + tax };
}
