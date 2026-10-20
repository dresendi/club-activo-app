import { hasCommitteeRole } from "./roles.js";

export function isActiveGuardian(guardian, user) {
  return Boolean(user && guardian && guardian.auth_user_id === user.id && guardian.status === "active");
}

export function isAdministrator(guardian, user) {
  return isActiveGuardian(guardian, user) && guardian.role === "admin" && user.app_metadata?.role === "admin";
}

export function canDownloadReports(guardian, user) {
  return isAdministrator(guardian, user) || (isActiveGuardian(guardian, user) && hasCommitteeRole(guardian));
}

export function canActivateGuardian(guardian, user) {
  return Boolean(user && guardian && guardian.auth_user_id === user.id &&
    guardian.status === "approved_pending_activation" && user.phone_confirmed_at);
}
