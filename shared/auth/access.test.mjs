import assert from "node:assert/strict";
import { test } from "node:test";
import { isActiveGuardian, isAdministrator, canActivateGuardian, canDownloadReports } from "./access.js";
const user = { id: "auth-1", app_metadata: { role: "admin" }, phone_confirmed_at: "2026-01-01T00:00:00Z" };
const guardian = { auth_user_id: "auth-1", status: "active", role: "admin" };
test("committee can download reports but cannot approve accounts", () => {
  const committee = {...guardian,role:"comite"};
  assert.equal(canDownloadReports(committee,user),true);
  assert.equal(isAdministrator(committee,user),false);
  for (const role of ["family","member"]) assert.equal(canDownloadReports({...guardian,role},user),false);
  for (const status of ["pending_review","approved_pending_activation","inactive"]) assert.equal(canDownloadReports({...committee,status},user),false);
  assert.equal(canDownloadReports(committee,{...user,id:"other"}),false);
  assert.equal(canDownloadReports({...guardian,role:"family"},{...user,user_metadata:{role:"comite"}}),false);
});
test("admin requires active bound account and both server-managed roles", () => {
  assert.equal(isAdministrator(guardian, user), true);
  for (const changed of [{ status: "inactive" }, { status: "approved_pending_activation" }, { auth_user_id: "someone-else" }, { role: "family" }]) {
    assert.equal(isAdministrator({ ...guardian, ...changed }, user), false);
  }
  assert.equal(isAdministrator(guardian, { ...user, app_metadata: {}, user_metadata: { role: "admin" } }), false);
});
test("pending activation has no private access and requires proof of phone possession", () => {
  const pending = { ...guardian, status: "approved_pending_activation" };
  assert.equal(isActiveGuardian(pending, user), false);
  assert.equal(canActivateGuardian(pending, user), true);
  assert.equal(canActivateGuardian(pending, { ...user, phone_confirmed_at: null }), false);
  assert.equal(canActivateGuardian(pending, { ...user, id: "someone-else" }), false);
  assert.equal(canActivateGuardian(guardian, user), false);
});
