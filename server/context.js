import { AsyncLocalStorage } from 'node:async_hooks';
import { activationProofCookie } from './ported/activation-proof.js';
export const contexts = new AsyncLocalStorage();
export function requestContext() {
  const context = contexts.getStore();
  if (!context) throw new Error('REQUEST_CONTEXT_REQUIRED');
  return context;
}
export function createServiceSupabaseClient() { return requestContext().db; }
export function createStatelessSupabaseClient() {
  const factory = requestContext().createPublicClient;
  if (!factory) throw new Error('PUBLIC_CLIENT_NOT_CONFIGURED');
  return factory();
}
export async function createServerSupabaseClient() {
  const context = requestContext();
  if (context.userClient) return context.userClient;
  const client = createStatelessSupabaseClient();
  const verifyOtp = client.auth.verifyOtp.bind(client.auth);
  client.auth.verifyOtp = async payload => {
    const result = await verifyOtp(payload);
    if (result.data?.session) context.session = result.data.session;
    return result;
  };
  client.auth.getUser = async () => {
    const token = context.session?.access_token || context.token;
    return token ? context.db.auth.getUser(token) : {data:{user:null},error:null};
  };
  // Only used after completeActivationProfile verifies the account and fresh OTP proof.
  client.auth.updateUser = async values => {
    const {data:{user},error} = await client.auth.getUser();
    if (error || !user) return {data:{user:null},error:error || new Error('UNAUTHENTICATED')};
    const {data:metadata,...rest} = values;
    return context.db.auth.admin.updateUserById(user.id, {...rest,...(metadata?{user_metadata:metadata}:{})});
  };
  context.userClient = client;
  return client;
}
export async function cookies() {
  const context = requestContext();
  return {
    get: name => name === activationProofCookie && context.proof ? {value:context.proof} : undefined,
    set: (name,value) => { if (name === activationProofCookie) context.outProof = value; },
    delete: name => { if (name === activationProofCookie) context.outProof = null; }
  };
}
