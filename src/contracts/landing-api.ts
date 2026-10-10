// Contrato del portal con Handy-landing-page-be (rutas /auth/* y /admin/preregistros*).
// Fuente: docs/openapi.json, docs/auth.md y docs/crm.md del backend (Fase 2, implementado). Resumen y
// diferencias con la propuesta original en docs/api/landing-be.md.
//
// Los rubros son copia del esquema de la landing y del backend: si cambian allá, cambian acá en el mismo cambio.

import { z } from "zod";

export const RUBROS = ["electricidad", "plomeria", "gas", "cerrajeria", "albanileria", "aire_acondicionado"] as const;
/** Etapas del embudo OPS-01 que se trabajan desde el pre-registro. */
export const ETAPAS_PREREGISTRO = ["identificado", "contactado", "comprometido"] as const;
/** Estado de contacto DERIVADO (no es una etapa): "con intentos" sigue siendo Identificado. */
export const CONTACT_STATUSES_API = ["sin_contactar", "con_intentos", "contactado", "comprometido"] as const;
export const TIPOS_EVENTO = ["intento", "conversacion", "compromiso"] as const;
export const ORDENES_API = ["recientes", "antiguos", "seguimiento"] as const;
/** Lista cerrada del backend (docs/auth.md). Un permiso desconocido se descarta, nunca se concede. */
export const PERMISOS = ["auth:read", "preregistros:read", "preregistros:contact", "preregistros:support"] as const;

export const MOTIVO_MAX = 140;
export const PAGE_SIZE_MAX = 50;
/** La fecha de alta aceptada tiene que caer entre hoy y hoy + 90 días (y antes del vencimiento). */
export const ALTA_MAX_DIAS = 90;

export type Permiso = (typeof PERMISOS)[number];

const fecha = z.iso.datetime({ offset: true });
const entero = z.number().int().nonnegative();
/** Campo opcional que el backend puede mandar `null`, omitir o llenar: en el portal es `undefined` o el valor. */
const opcional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? undefined).optional();
const fechaNullable = opcional(fecha);

// ── Sesión ──────────────────────────────────────────────────────────────

const perfilSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  permissions: z
    .array(z.string())
    .transform((items) => PERMISOS.filter((permiso) => items.includes(permiso))),
  mfa: z.boolean(),
});

export const csrfSchema = z.object({ csrfToken: z.string().min(1) });
export const sesionSchema = z.object({ admin: perfilSchema, csrfToken: z.string().min(1) });
export const perfilRespuestaSchema = z.object({ admin: perfilSchema });
export const mfaPendienteSchema = z.object({ mfaRequired: z.literal(true), expiresAt: fecha });
export const loginRespuestaSchema = z.union([sesionSchema, mfaPendienteSchema]);

export type PerfilAdmin = z.infer<typeof perfilSchema>;
export type SesionApi = z.infer<typeof sesionSchema>;
export type MfaPendiente = z.infer<typeof mfaPendienteSchema>;

/** Cuerpo de error del backend: `{ error }` + `campos` (400) o `motivo` (409). Nunca valores ni detalles internos. */
export const errorSchema = z.object({
  error: z.string(),
  campos: z.array(z.string()).optional(),
  motivo: z.string().optional(),
});

// ── Pre-registros ───────────────────────────────────────────────────────

export const eventoSchema = z.object({
  id: z.string().min(1),
  fecha,
  tipo: z.enum(TIPOS_EVENTO),
  actorId: z.string().optional(),
  /** Email del operador si sigue en ADMIN_ACCOUNTS_JSON; `null` si ya no existe. */
  actor: opcional(z.string()),
  motivo: opcional(z.string()),
  proximoSeguimiento: fechaNullable,
  fechaAltaAceptada: fechaNullable,
});

export const filaEspecialistaSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal("especialista"),
  nombre: z.string(),
  whatsapp: z.string(),
  /** false = el backend no pudo normalizar el número con certeza: revisarlo antes de usarlo. */
  whatsappNormalizado: z.boolean(),
  email: opcional(z.string()),
  rubros: z.array(z.enum(RUBROS)).min(1),
  zona: z.string(),
  creadoEn: fecha,
  venceEn: fecha,
  etapa: z.enum(ETAPAS_PREREGISTRO),
  contacto: z.enum(CONTACT_STATUSES_API),
  intentos: entero,
  proximoSeguimiento: fechaNullable,
  fechaAltaAceptada: fechaNullable,
  version: z.number().int().positive(),
});

export const fichaEspecialistaSchema = filaEspecialistaSchema.extend({ eventos: z.array(eventoSchema) });

/** Los usuarios solo exponen id y fechas: ni nombre, barrio, necesidad ni contacto. */
export const filaUsuarioSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal("usuario"),
  creadoEn: fecha,
  venceEn: fecha,
});

export const fichaSchema = z.discriminatedUnion("tipo", [fichaEspecialistaSchema, filaUsuarioSchema]);

export const porEstadoSchema = z.object({
  todos: entero,
  sin_contactar: entero,
  con_intentos: entero,
  contactado: entero,
  comprometido: entero,
});

function pagina<T extends z.ZodType>(row: T) {
  return z.object({
    rows: z.array(row),
    total: entero,
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().positive(),
  });
}

export const listaEspecialistasSchema = pagina(filaEspecialistaSchema).extend({ porEstado: porEstadoSchema });
export const listaUsuariosSchema = pagina(filaUsuarioSchema);

export const resumenSchema = z.object({
  especialistas: entero,
  usuarios: entero,
  porEstado: porEstadoSchema,
  /** Los rubros sin anotados pueden omitirse: el portal completa con 0. */
  porRubro: z.partialRecord(z.enum(RUBROS), entero),
  cola: z.array(filaEspecialistaSchema).max(5),
});

export type EventoApi = z.infer<typeof eventoSchema>;
export type FilaEspecialistaApi = z.infer<typeof filaEspecialistaSchema>;
export type FichaEspecialistaApi = z.infer<typeof fichaEspecialistaSchema>;
export type FilaUsuarioApi = z.infer<typeof filaUsuarioSchema>;
export type PorEstadoApi = z.infer<typeof porEstadoSchema>;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
export type OrdenApi = (typeof ORDENES_API)[number];
export type ErrorApi = z.infer<typeof errorSchema>;

/** Forma del cuerpo de POST /admin/preregistros/:id/eventos; las reglas que dependen del reloj están en domain/evento.ts. */
export const eventoEntradaSchema = z
  .strictObject({
    tipo: z.enum(TIPOS_EVENTO),
    motivo: z.string().trim().min(1).max(MOTIVO_MAX),
    version: z.number().int().min(1).max(2147483647),
    proximoSeguimiento: fecha.optional(),
    fechaAltaAceptada: fecha.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.tipo === "compromiso" && !value.fechaAltaAceptada) {
      ctx.addIssue({ code: "custom", path: ["fechaAltaAceptada"], message: "Falta la fecha de alta acordada." });
    }
    if (value.tipo !== "compromiso" && value.fechaAltaAceptada) {
      ctx.addIssue({ code: "custom", path: ["fechaAltaAceptada"], message: "Solo el compromiso lleva fecha de alta acordada." });
    }
    if (value.fechaAltaAceptada && value.proximoSeguimiento && Date.parse(value.fechaAltaAceptada) === Date.parse(value.proximoSeguimiento)) {
      ctx.addIssue({ code: "custom", path: ["proximoSeguimiento"], message: "El seguimiento no reemplaza la fecha de alta acordada." });
    }
  });

/** Clave de idempotencia: UUIDv4 (el backend la exige). */
export const idempotencyKeySchema = z.uuid({ version: "v4" });

/**
 * Cuerpo de POST /admin/preregistros/:id/eventos. `fechaAltaAceptada` es obligatoria en `compromiso`,
 * prohibida en los otros tipos y NUNCA se reemplaza con `proximoSeguimiento`.
 */
export interface EventoEntrada {
  tipo: TipoEvento;
  motivo: string;
  version: number;
  proximoSeguimiento?: string;
  fechaAltaAceptada?: string;
}
