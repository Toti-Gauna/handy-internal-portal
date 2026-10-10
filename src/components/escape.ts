export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

const timeZone = "America/Argentina/Buenos_Aires";
const dateFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone });
const dateTimeFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone,
});

function format(value: string, formatter: Intl.DateTimeFormat): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatter.format(date).replace(/\./g, "");
}

/** "5 oct". */
export function formatDate(value: string): string {
  return format(value, dateFormat);
}

/** "lun, 6 oct, 16:00". */
export function formatDateTime(value: string): string {
  return format(value, dateTimeFormat);
}

/** Alias histórico de la vista de especialistas. */
export const formatDemoDate = formatDateTime;

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es") ?? "")
    .join("");
}

/** Valor para `<input type="datetime-local">` en la hora local del navegador ("2026-10-12T15:30"). */
export function toLocalInput(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Inverso: un `datetime-local` (sin zona) se interpreta en la hora local del navegador y viaja en ISO 8601. */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}
