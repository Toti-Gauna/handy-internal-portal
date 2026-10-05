import engranajeUrl from "../img/handy-engranaje.webp";
import lamparitaUrl from "../img/handy-lamparita.webp";
import llaveRotaUrl from "../img/handy-llave-rota.webp";
import { escapeHtml } from "./escape.ts";
import { icon } from "./icons.ts";

export type StateKind = "loading" | "empty" | "error" | "permission" | "blocked";

const characters: Partial<Record<StateKind, string>> = {
  loading: engranajeUrl,
  empty: lamparitaUrl,
  error: llaveRotaUrl,
};

export function renderStatePanel(kind: StateKind, title: string, detail: string, dependency?: string): string {
  const role = kind === "loading" ? "status" : "region";
  const character = characters[kind];
  const visual = character
    ? `<img class="estado__handy" src="${character}" alt="" width="96" height="96" />`
    : `<span class="estado__icono">${icon("candado")}</span>`;
  const dependencyText = dependency ? `<span class="estado__dependencia">Pendiente: ${escapeHtml(dependency)}</span>` : "";

  return `
    <section class="estado estado--${kind}" role="${role}" aria-label="${escapeHtml(title)}" aria-live="polite">
      ${visual}
      <div class="estado__texto">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(detail)}</p>
        ${dependencyText}
      </div>
    </section>
  `;
}
