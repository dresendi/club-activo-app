export const RECEIPT_BUCKET = "annual-payment-receipts";
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
export function receiptType(bytes) {
  if (bytes.length >= 5 && Buffer.from(bytes.subarray(0,5)).toString("ascii") === "%PDF-") return {mime:"application/pdf",extension:"pdf"};
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return {mime:"image/png",extension:"png"};
  if (bytes.length >= 3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {mime:"image/jpeg",extension:"jpg"};
  return null;
}
