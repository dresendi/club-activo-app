export const NextResponse = { json: (body, options) => Response.json(body, options) };
// The mobile client refreshes its data after mutations; no Next.js cache exists here.
export function revalidatePath() {}
