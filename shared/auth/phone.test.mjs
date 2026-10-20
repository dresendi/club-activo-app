import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeInternationalPhone } from "./phone.js";

test("normalizes valid international numbers without truncation", () => {
  for (const [input, expected] of [
    ["+52 55 1234 5678", "+525512345678"],
    ["+1 (202) 555-0123", "+12025550123"],
    ["+34 612 345 678", "+34612345678"],
    ["+44 20 7946 0018", "+442079460018"]
  ]) assert.equal(normalizeInternationalPhone(input), expected);
});

test("formatting variants resolve to the same account identifier", () => {
  assert.equal(normalizeInternationalPhone(" +1 (202) 555-0123 "), normalizeInternationalPhone("+12025550123"));
});

test("rejects missing country codes, extensions, prose and invalid numbers", () => {
  for (const value of [null, undefined, 5512345678, "", "5512345678", "0012025550123", "+999123456789", "+123", "+12025550123 ext 4", "llama al +12025550123", "+120255501234567890"]) {
    assert.equal(normalizeInternationalPhone(value), null, String(value));
  }
});
