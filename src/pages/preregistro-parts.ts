import { escapeHtml, initials } from "../components/escape.ts";
import { icon, isIconName } from "../components/icons.ts";
import {
  contactAttempts,
  contactStatus,
  contactStatusLabels,
  cuitLabels,
  rubroLabels,
  type OpcionCuit,
  type PreregistroEspecialista,
  type Rubro,
} from "../domain/preregistros.ts";

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

export function contactPill(record: PreregistroEspecialista): string {
  const status = contactStatus(record);
  const attempts = contactAttempts(record);
  const extra = status === "con_intentos" ? ` · ${attempts}` : "";
  return `<span class="pastilla pastilla--${status}">${escapeHtml(contactStatusLabels[status])}${extra}</span>`;
}

export function cuitPill(cuit: OpcionCuit): string {
  return `<span class="pastilla pastilla--cuit-${cuit}">${escapeHtml(cuitLabels[cuit])}</span>`;
}
