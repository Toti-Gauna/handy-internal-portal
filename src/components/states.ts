import { escapeHtml } from "./escape.ts";

export type StateKind = "loading" | "empty" | "error" | "permission" | "blocked";

const stateIcons: Record<StateKind, string> = {
  loading: "…",
  empty: "—",
  error: "!",
  permission: "⌑",
  blocked: "◇",
};

export function renderStatePanel(kind: StateKind, title: string, detail: string, dependency?: string): string {
  const role = kind === "loading" ? "status" : "region";
  const dependencyText = dependency
    ? `<span class="state-panel__dependency">Pendiente: ${escapeHtml(dependency)}</span>`
    : "";

  return `
    <section class="state-panel state-panel--${kind}" role="${role}" aria-label="${escapeHtml(title)}" aria-live="polite">
      <span class="state-panel__icon" aria-hidden="true">${stateIcons[kind]}</span>
      <div class="state-panel__copy">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(detail)}</p>
        ${dependencyText}
      </div>
    </section>
  `;
}
