export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, n: number) => {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const fmtDate = (d?: string | Date | null) =>
  d
    ? new Date(
        typeof d === "string" ? d.slice(0, 10) + "T00:00:00Z" : d,
      ).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
export const fmtShort = (d?: string | null) =>
  d
    ? new Date(d.slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })
    : "—";
export const ago = (d: string | Date) => {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const dueState = (
  due: string | null,
  done = false,
): "overdue" | "today" | "soon" | "ok" | "none" => {
  if (!due) return "none";
  if (done) return "ok";
  const t = today();
  return due < t
    ? "overdue"
    : due === t
      ? "today"
      : due <= addDays(t, 3)
        ? "soon"
        : "ok";
};
