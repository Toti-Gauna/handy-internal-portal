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
