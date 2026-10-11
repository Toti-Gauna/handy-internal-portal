import { escapeHtml, initials } from "../components/escape.ts";
import { icon, isIconName } from "../components/icons.ts";
import { contactStatusLabels, rubroLabels, type PreregistroEspecialistaFila, type Rubro } from "../domain/preregistros.ts";

export function rubroIcon(rubro: Rubro): string {
  const name = rubroLabels[rubro].icono;
  return isIconName(name) ? icon(name) : "";
}

export function rubroChips(rubros: Rubro[]): string {
  return `<span class="rubros">${rubros
    .map((rubro) => `<span class="rubro-chip">${rubroIcon(rubro)}${escapeHtml(rubroLabels[rubro].nombre)}</span>`)
    .join("")}</span>`;
}

export function avatar(name: string, variant = ""): string {
  return `<span class="avatar ${variant}" aria-hidden="true">${escapeHtml(initials(name))}</span>`;
}

/** El estado de contacto lo deriva el servidor (`contacto`, `intentos`): la UI no lo recalcula. */
export function contactPill(record: Pick<PreregistroEspecialistaFila, "contacto" | "intentos">): string {
  const extra = record.contacto === "con_intentos" ? ` · ${record.intentos}` : "";
  return `<span class="pastilla pastilla--${record.contacto}">${escapeHtml(contactStatusLabels[record.contacto])}${extra}</span>`;
}
