import { test } from "node:test";
import assert from "node:assert/strict";
import { userRolesSchema } from "./roles.js";
import { canDownloadReports, isAdministrator } from "./access.js";

const id = "00000000-0000-4000-8000-000000000001";
const user = { id, app_metadata: { role: "family" } };
const guardian = { auth_user_id: id, role: "family", status: "active", roles: ["comite"] };
test("additional committee role grants reports but never administrator access", () => {
  assert.equal(canDownloadReports(guardian, user), true);
  assert.equal(isAdministrator(guardian, user), false);
  assert.equal(canDownloadReports({ ...guardian, roles: [] }, user), false);
  assert.equal(canDownloadReports({ ...guardian, status: "inactive" }, user), false);
  assert.equal(canDownloadReports(guardian, { ...user, id: "another" }), false);
  assert.equal(canDownloadReports({ ...guardian, roles: [] }, { ...user, user_metadata: { roles: ["comite"] } }), false);
});
test("role changes cannot grant admin, unknown roles or change account fields", () => {
  for (const roles of [[], ["comite"]]) assert.equal(userRolesSchema.safeParse({ id, roles }).success, true);
  for (const roles of [["admin"], ["comite", "comite"], ["unknown"]]) {
    assert.equal(userRolesSchema.safeParse({ id, roles }).success, false);
  }
  assert.equal(userRolesSchema.safeParse({ id, roles: [], role: "admin" }).success, false);
  assert.equal(isAdministrator({ ...guardian, role: "admin" }, { ...user, app_metadata: { role: "admin" } }), true);
});
