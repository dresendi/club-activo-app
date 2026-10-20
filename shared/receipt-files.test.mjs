import assert from "node:assert/strict";
import { test } from "node:test";
import { receiptType, MAX_RECEIPT_BYTES } from "./receipt-files.js";
test("receipt type is determined from content, never filename or supplied MIME",()=>{
  assert.equal(receiptType(Buffer.from('%PDF-1.4')).mime,'application/pdf');
  assert.equal(receiptType(Buffer.from([137,80,78,71,13,10,26,10])).mime,'image/png');
  assert.equal(receiptType(Buffer.from([255,216,255,224])).mime,'image/jpeg');
  for(const value of ['', '<svg onload=alert(1)>','fake.pdf','%PD']) assert.equal(receiptType(Buffer.from(value)),null);
  assert.equal(MAX_RECEIPT_BYTES,4194304);
});
