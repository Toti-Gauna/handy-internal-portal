import { pageHeading } from "../components/frame.ts";
import { renderStatePanel } from "../components/states.ts";

const pendingCard = (title: string, description: string, id: string, icon: string): string => `
  <section class="surface operation-card">
    <div class="operation-card__icon" aria-hidden="true">${icon}</div>
    <div class="operation-card__body">
      <div class="operation-card__title-row"><h2>${title}</h2><span class="status-pill status-pill--pending">Pendiente</span></div>
      <p>${description}</p>
      ${renderStatePanel("blocked", "Sin datos operativos", "No se consulta ningún endpoint mientras el contrato siga pendiente.", id)}
      <button class="button button--disabled" type="button" disabled aria-describedby="${id}-reason">Acción no disponible</button>
      <span class="sr-only" id="${id}-reason">Bloqueado hasta que se definan el contrato y los permisos de servidor.</span>
    </div>
  </section>
`;

export function renderOperationsPage(): string {
  return `
    <div class="page-content">
      ${pageHeading("OPERACIÓN", "Operaciones", "Herramientas manuales para acompañar el ciclo de Handy, cuando sus contratos estén definidos.")}

      <section class="operations-grid" aria-label="Vistas operativas">
        ${pendingCard("Pedidos sin oferta", "La cola requiere definir cuándo un pedido necesita intervención, qué campos se pueden ver y qué acción se registra.", "TECH-15", "⌕")}
        ${pendingCard("Conciliación", "Solo se podrá mostrar el estado de conciliación permitido por el contrato de pagos.", "TECH-28", "▤")}
      </section>

      <section class="surface manual-actions" aria-labelledby="manual-actions-title">
        <div class="section-heading section-heading--compact">
          <div><p class="eyebrow">PROD-01 · CONSOLA MÍNIMA</p><h2 id="manual-actions-title">Acciones previstas</h2></div>
          <span class="status-pill status-pill--pending">Bloqueadas</span>
        </div>
        <p class="manual-actions__intro">PROD-01 enumera estas funciones. La autorización, auditoría y contrato de cada operación todavía deben definirse antes de exponerlas.</p>
        <div class="action-list">
          <div class="action-list__item"><span aria-hidden="true">01</span><strong>Aprobar un alta de especialista</strong><small>TECH-06 · TECH-08 · LEG-08</small><button type="button" disabled aria-label="Aprobar alta de especialista, bloqueado">Bloqueada</button></div>
          <div class="action-list__item"><span aria-hidden="true">02</span><strong>Ofrecer un pedido a especialista registrado</strong><small>TECH-06 · TECH-08 · TECH-15</small><button type="button" disabled aria-label="Ofrecer pedido, bloqueado">Bloqueada</button></div>
          <div class="action-list__item"><span aria-hidden="true">03</span><strong>Consultar deudas y reportes</strong><small>TECH-06 · TECH-08 · TECH-28</small><button type="button" disabled aria-label="Consultar deudas y reportes, bloqueado">Bloqueada</button></div>
        </div>
      </section>

      <div class="privacy-note"><span class="privacy-note__icon" aria-hidden="true">✓</span><p><strong>Acceso mínimo.</strong> Esta vista no carga chats, direcciones, ubicaciones, certificados ni medios de pago.</p></div>
    </div>
  `;
}
