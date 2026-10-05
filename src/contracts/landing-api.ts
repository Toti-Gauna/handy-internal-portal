// Contrato del portal con Handy-landing-page-be (endpoints /admin/*).
// PROPUESTA NO APROBADA: sujeta a TECH-03, TECH-06 y TECH-08. Documentada en docs/api/landing-be.md.
//
// Los enums son copia de Handy-landing-page-fe/src/schema/preregistro.ts (y del backend):
// si cambian allá, cambian acá en el mismo cambio.

import { z } from "zod";

export const RUBROS = ["electricidad", "plomeria", "gas", "cerrajeria", "albanileria", "aire_acondicionado"] as const;
export const OPCIONES_CUIT = ["si", "no", "en_tramite"] as const;
export const ETAPAS_PREREGISTRO = ["identificado", "contactado", "comprometido"] as const;
export const CONTACT_STATUSES_API = ["sin_contactar", "con_intentos", "contactado", "comprometido"] as const;
export const TIPOS_EVENTO = ["intento", "conversacion", "compromiso"] as const;

const fecha = z.iso.datetime({ offset: true });
const opcional = <T extends z.ZodType>(schema: T) => schema.nullish().transform((value) => value ?? undefined);

export const eventoSchema = z.object({
  fecha,
  tipo: z.enum(TIPOS_EVENTO),
  actor: z.string().min(1).max(120),
  motivo: opcional(z.string().max(140)),
  proximoSeguimiento: opcional(fecha),
});

export const preregistroEspecialistaSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal("especialista"),
  nombre: z.string(),
  email: z.string(),
  whatsapp: z.string(),
  rubros: z.array(z.enum(RUBROS)).min(1),
  zona: z.string(),
  cuit: z.enum(OPCIONES_CUIT),
  creadoEn: fecha,
  etapa: z.enum(ETAPAS_PREREGISTRO),
  eventos: z.array(eventoSchema),
  proximoSeguimiento: opcional(fecha),
  especialistaId: opcional(z.string()),
});

/** Los usuarios llegan sin email ni WhatsApp: su finalidad declarada es solo el aviso de lanzamiento. */
export const preregistroUsuarioSchema = z.object({
  id: z.string().min(1),
  tipo: z.literal("usuario"),
  nombre: z.string(),
  barrio: z.string(),
  necesidad: opcional(z.string()),
  creadoEn: fecha,
  dejoWhatsapp: z.boolean(),
});

export const preregistroSchema = z.discriminatedUnion("tipo", [preregistroEspecialistaSchema, preregistroUsuarioSchema]);

const entero = z.number().int().nonnegative();

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

export const listaEspecialistasSchema = pagina(preregistroEspecialistaSchema).extend({ porEstado: porEstadoSchema });
export const listaUsuariosSchema = pagina(preregistroUsuarioSchema);

export const resumenSchema = z.object({
  especialistas: entero,
  usuarios: entero,
  porEstado: porEstadoSchema,
  /** Los rubros sin anotados pueden omitirse: el portal completa con 0. */
  porRubro: z.partialRecord(z.enum(RUBROS), entero),
  cola: z.array(preregistroEspecialistaSchema).max(5),
});

export const registrarContactoSchema = z.object({
  tipo: z.enum(TIPOS_EVENTO),
  motivo: z.string().trim().min(1).max(140),
  proximoSeguimiento: fecha.optional(),
});

export type PreregistroEspecialistaApi = z.infer<typeof preregistroEspecialistaSchema>;
export type PreregistroUsuarioApi = z.infer<typeof preregistroUsuarioSchema>;
export type ResumenApi = z.infer<typeof resumenSchema>;
export type RegistrarContacto = z.infer<typeof registrarContactoSchema>;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];
