import assert from "node:assert/strict";
import test from "node:test";
import { canOpenInternalRoute, canRunAdministrativeAction, shouldShowSyntheticPreview } from "./access.ts";

test("las rutas internas deniegan sesiones anónimas y no listas", () => {
  assert.equal(canOpenInternalRoute("loading"), false);
  assert.equal(canOpenInternalRoute("anonymous"), false);
  assert.equal(canOpenInternalRoute("denied"), false);
  assert.equal(canOpenInternalRoute("authenticated"), true);
});

test("la muestra solo se habilita con su modo explícito", () => {
  assert.equal(shouldShowSyntheticPreview(false), false);
  assert.equal(shouldShowSyntheticPreview(true), true);
});

test("ninguna acción administrativa corre en demo, con sesión anónima o sin permiso server-side", () => {
  assert.equal(canRunAdministrativeAction("authenticated", "allowed", true), false);
  assert.equal(canRunAdministrativeAction("anonymous", "allowed", false), false);
  assert.equal(canRunAdministrativeAction("authenticated", "unknown", false), false);
  assert.equal(canRunAdministrativeAction("authenticated", "denied", false), false);
  assert.equal(canRunAdministrativeAction("authenticated", "allowed", false), true);
});
