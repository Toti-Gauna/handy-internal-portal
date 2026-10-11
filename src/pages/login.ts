import { escapeHtml } from "../components/escape.ts";
import { renderLogo } from "../components/frame.ts";
import { icon } from "../components/icons.ts";
import { renderStatePanel } from "../components/states.ts";
import type { LoginUi } from "../app/state.ts";

function shell(content: string): string {
  return `
    <main class="acceso">
      <div class="acceso__tarjeta">
        ${renderLogo("logo--acceso")}
        ${content}
      </div>
    </main>
  `;
}

function banner(ui: LoginUi): string {
  const notice = ui.notice ? `<p class="aviso aviso--info" role="status">${escapeHtml(ui.notice)}</p>` : "";
  const error = ui.error ? `<p class="aviso aviso--error" role="alert">${escapeHtml(ui.error)}</p>` : "";
  return notice + error;
}

function credentialsForm(ui: LoginUi): string {
  return `
    <p class="eyebrow">Portal interno · Eclipse</p>
    <h1 class="titulo titulo--acceso">Ingresá al portal</h1>
    <p>Acceso solo para el equipo de Handy. Las cuentas las administra quien opera el entorno: acá no hay registro ni recuperación de contraseña.</p>
    ${banner(ui)}
    <form class="login" id="login-form" autocomplete="on" ${ui.busy ? 'aria-busy="true"' : ""}>
      <fieldset ${ui.busy ? "disabled" : ""}>
        <label class="campo campo--texto">
          <span class="campo__label">Email</span>
          <input type="email" name="email" autocomplete="username" inputmode="email" required maxlength="254" value="${escapeHtml(ui.email)}" />
        </label>
        <label class="campo campo--texto">
          <span class="campo__label">Contraseña</span>
          <input type="password" name="password" autocomplete="current-password" required minlength="12" maxlength="128" />
        </label>
        <button class="boton boton--azul boton--ancho" type="submit">Ingresar ${icon("flecha")}</button>
      </fieldset>
    </form>
    <p class="nota">La sesión vive en una cookie protegida del navegador y vence sola. No se guarda nada de tu cuenta en este dispositivo.</p>
  `;
}

function mfaForm(ui: LoginUi): string {
  return `
    <p class="eyebrow">Verificación en dos pasos</p>
    <h1 class="titulo titulo--acceso">Ingresá el código</h1>
    <p>Abrí tu app de autenticación y escribí el código de 6 dígitos. Vence en pocos minutos y sirve una sola vez.</p>
    ${banner(ui)}
    <form class="login" id="mfa-form" ${ui.busy ? 'aria-busy="true"' : ""}>
      <fieldset ${ui.busy ? "disabled" : ""}>
        <label class="campo campo--texto">
          <span class="campo__label">Código de 6 dígitos</span>
          <input type="text" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" required autofocus />
        </label>
        <button class="boton boton--azul boton--ancho" type="submit">Verificar ${icon("flecha")}</button>
        <button class="boton boton--contorno boton--ancho" type="button" data-action="login-cancel">Volver</button>
      </fieldset>
    </form>
  `;
}

export function renderLoginView(ui: LoginUi): string {
  return shell(ui.step === "mfa" ? mfaForm(ui) : credentialsForm(ui));
}

/** Sin `VITE_API_BASE_URL`: el build no está conectado a ningún backend. */
export function renderNotConnectedView(demoHref: string): string {
  return shell(`
    <p class="eyebrow">Portal interno · Eclipse</p>
    <h1 class="titulo titulo--acceso">Sin conexión configurada</h1>
    <p>Este build no tiene backend: falta <code>VITE_API_BASE_URL</code>. No hay datos reales ni login en esta versión.</p>
    ${renderStatePanel("permission", "No hay un backend configurado", "Construí el portal con la URL del backend para operar con datos reales.")}
    <a class="boton boton--azul boton--ancho" href="${escapeHtml(demoHref)}">Abrir vista de muestra ${icon("flecha")}</a>
    <p class="nota">La vista de muestra contiene solo datos inventados y no habilita operaciones.</p>
  `);
}

/** Sesión válida, pero la cuenta no tiene `preregistros:read`. */
export function renderDeniedView(email: string | undefined): string {
  return shell(`
    <p class="eyebrow">Portal interno · Eclipse</p>
    <h1 class="titulo titulo--acceso">Tu cuenta no tiene acceso</h1>
    ${renderStatePanel(
      "permission",
      "Falta el permiso para ver pre-registros",
      `${email ? `${email} ingresó bien, pero ` : "La cuenta ingresó bien, pero "}no tiene el permiso preregistros:read. Pedile a quien administra el entorno que lo agregue.`,
    )}
    <button class="boton boton--contorno boton--ancho" type="button" data-action="logout">${icon("salir")}Cerrar sesión</button>
  `);
}

/** Cargando la sesión al abrir o recargar. */
export function renderBootView(): string {
  return shell(renderStatePanel("loading", "Comprobando la sesión", "Un momento."));
}

/** El arranque falló por red, 429, 503 o un 403 de CSRF/origen: la sesión no se da por perdida. */
export function renderBootErrorView(panel: string): string {
  return shell(`
    <p class="eyebrow">Portal interno · Eclipse</p>
    <h1 class="titulo titulo--acceso">No pudimos abrir la sesión</h1>
    ${panel}
  `);
}
