import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentSchema, paymentSearchSchema, mexicoDate } from "./payments.js";
const payload={participantId:"94fd76fc-6b6d-4421-8be8-c91cfa2c3cbe",payerGuardianId:"82830f76-80bb-4b0d-bcf1-af93145e6898",year:2026,amount:"1500.50",paidOn:"2026-01-01",method:"cash"};
test("annual payments validate money, payer, year and real dates",()=>{
  assert.equal(paymentSchema.safeParse(payload).success,true);
  for(const change of [{amount:"0"},{amount:"-1"},{amount:"1.001"},{amount:"1e3"},{paidOn:"2026-02-30"},{paidOn:"2099-01-01"},{year:2026.5},{payerGuardianId:""},{method:"unknown"}]) assert.equal(paymentSchema.safeParse({...payload,...change}).success,false,JSON.stringify(change));
  assert.match(mexicoDate(),/^\d{4}-\d{2}-\d{2}$/);
});
test("payment grid bounds pagination and three-year windows",()=>{
  assert.equal(paymentSearchSchema.parse({year:2025}).type,"participant");
  for(const change of [{year:2099},{page:-1},{page:1.5},{type:"__proto__"},{q:"a".repeat(101)}]) assert.equal(paymentSearchSchema.safeParse({year:2025,...change}).success,false);
});
