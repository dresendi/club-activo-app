import assert from "node:assert/strict";
import { test } from "node:test";
import { canDeleteRecord, deletionSchema } from "./deletion.js";

test("deletion requires explicit confirmation and a typed UUID target", () => {
  const payload = { id: "e6b37845-f97d-4a16-bcaf-9ab336efc339", type: "contact", confirmation: "ELIMINAR" };
  assert.equal(deletionSchema.safeParse(payload).success, true);
  for (const change of [{ confirmation: "" }, { confirmation: true }, { id: "*" }, { type: "guardians" }, { type: "__proto__" }]) {
    assert.equal(deletionSchema.safeParse({ ...payload, ...change }).success, false);
  }
});
test("only administrators can delete; administrator and self deletion are forbidden", () => {
  const admin = { isAdmin: true, guardianId: "self" };
  const contact = { id: "other", role: "family" };
  assert.equal(canDeleteRecord(admin, contact, "contact"), true);
  assert.equal(canDeleteRecord(admin, { id: "participant" }, "participant"), true);
  for (const viewer of [null, {}, { isAdmin: false, role: "comite" }]) assert.equal(canDeleteRecord(viewer, contact, "contact"), false);
  assert.equal(canDeleteRecord(admin, { ...contact, role: "admin" }, "contact"), false);
  assert.equal(canDeleteRecord(admin, { ...contact, id: "self" }, "contact"), false);
  assert.equal(canDeleteRecord(admin, null, "contact"), false);
  assert.equal(canDeleteRecord(admin, contact, "unknown"), false);
});
