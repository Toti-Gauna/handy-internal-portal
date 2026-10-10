import assert from "node:assert/strict";
import test from "node:test";
import {
  canContactPreregistros,
  canOpenInternalRoute,
  canReadPreregistros,
  canRegisterContact,
  canSearchUsersByEmail,
  shouldShowSyntheticPreview,
} from "./access.ts";

test("las rutas internas deniegan sesiones anónimas, en carga y sin permiso mínimo", () => {
  assert.equal(canOpenInternalRoute("loading"), false);
  assert.equal(canOpenInternalRoute("anonymous"), false);
  assert.equal(canOpenInternalRoute("denied"), false);
  assert.equal(canOpenInternalRoute("authenticated"), true);
});

test("la muestra solo se habilita con su modo explícito", () => {
  assert.equal(shouldShowSyntheticPreview(false), false);
  assert.equal(shouldShowSyntheticPreview(true), true);
});

test("contactar exige preregistros:contact Y preregistros:read; buscar por email exige soporte Y lectura", () => {
  assert.equal(canReadPreregistros([]), false);
  assert.equal(canReadPreregistros(["preregistros:read"]), true);
  assert.equal(canContactPreregistros(["preregistros:contact"]), false);
  assert.equal(canContactPreregistros(["preregistros:read", "preregistros:contact"]), true);
  assert.equal(canSearchUsersByEmail(["preregistros:read"]), false);
  assert.equal(canSearchUsersByEmail(["preregistros:read", "preregistros:support"]), true);
});

test("ninguna acción administrativa corre en la muestra, sin sesión viva o sin permiso de contacto", () => {
  const completos = ["preregistros:read", "preregistros:contact"] as const;
  assert.equal(canRegisterContact("authenticated", completos, true), false);
  assert.equal(canRegisterContact("anonymous", completos, false), false);
  assert.equal(canRegisterContact("denied", completos, false), false);
  assert.equal(canRegisterContact("authenticated", ["preregistros:read"], false), false);
  assert.equal(canRegisterContact("authenticated", completos, false), true);
});
