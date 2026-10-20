import { requestContext } from './context.js';
import { isActiveGuardian, isAdministrator, canDownloadReports } from '../shared/auth/access.js';
import { hasCommitteeRole } from '../shared/auth/roles.js';
export async function getSessionViewer() {
  const context = requestContext();
  if (!context.token) return {isLoggedIn:false,isAdmin:false};
  const {data:{user},error} = await context.db.auth.getUser(context.token);
  if (error || !user) return {isLoggedIn:false,isAdmin:false};
  const result = await context.db.schema('club_activo_v2').from('guardians')
    .select('id,full_name,auth_user_id,status,role,roles').eq('auth_user_id',user.id).maybeSingle();
  if (result.error) throw result.error;
  const guardian = result.data;
  if (!isActiveGuardian(guardian,user)) return {isLoggedIn:false,isAdmin:false,authenticated:true};
  return {isLoggedIn:true,isAdmin:isAdministrator(guardian,user),isCommittee:hasCommitteeRole(guardian),
    canDownloadReports:canDownloadReports(guardian,user),firstName:guardian.full_name,name:guardian.full_name,guardianId:guardian.id};
}
