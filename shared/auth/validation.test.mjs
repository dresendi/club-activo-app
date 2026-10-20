import assert from "node:assert/strict";
import { test } from "node:test";
import { registrationSchema, loginSchema, completeProfileSchema, recoveryOtpSchema, activationPhoneSchema, recoveryRequestSchema } from "./validation.js";
const request = { paternalSurname: "Paterno", maternalSurname: "Materno", participantPaternalSurname: "Paterno", participantMaternalSurname: "Materno", firstName: "Contacto de prueba", firstNameAutism: "Participante de prueba", relationship: "Tutor", phone: "+1 (202) 555-0123", role: "family" };
test("activation and recovery accept only supported delivery channels", () => {
  for (const schema of [activationPhoneSchema, recoveryRequestSchema]) {
    assert.equal(schema.parse({phone: request.phone}).channel, "sms");
    for (const channel of ["sms", "whatsapp"]) assert.equal(schema.parse({phone: request.phone, channel}).channel, channel);
    assert.equal(schema.safeParse({phone: request.phone, channel:"email"}).success, false);
  }
});
test("registration accepts no email and preserves participant and relationship", () => {
  for (const email of [null, undefined, "", "  "]) {
    const result = registrationSchema.parse({ ...request, email });
    assert.equal(result.phone, "+12025550123");
    assert.equal(result.email, null);
    assert.equal(result.firstNameAutism, request.firstNameAutism);
    assert.equal(result.relationship, "Tutor");
  }
});
test("normalizes an optional contact email", () => {
  assert.equal(registrationSchema.parse({ ...request, email: " TEST@EXAMPLE.COM " }).email, "test@example.com");
});
test("rejects missing participants, invalid phones and administrator self-registration", () => {
  for (const invalid of [{ firstNameAutism: " " }, { firstName: " " }, { phone: "5512345678" }, { email: "invalid" }, { role: "admin" }]) {
    assert.equal(registrationSchema.safeParse({ ...request, ...invalid }).success, false);
  }
});
test("login uses international phones, not contact emails", () => {
  assert.equal(loginSchema.safeParse({ identifier: "test@example.com", password: "Test123" }).success, false);
  assert.equal(loginSchema.parse({ identifier: request.phone, password: "Test123" }).identifier, "+12025550123");
});
test("activation and recovery work without email and require matching passwords", () => {
  const profile = { password: "Test123", confirmPassword: "Test123" };
  assert.equal(completeProfileSchema.safeParse(profile).success, true);
  assert.equal(completeProfileSchema.safeParse({ ...profile, confirmPassword: "Other123" }).success, false);
  assert.equal(recoveryOtpSchema.safeParse({ phone: request.phone, otp: "123456", password: "Test123", confirmPassword: "Test123" }).success, true);
});

test("activation does not accept name changes", () => {
  const parsed = completeProfileSchema.parse({password:"Test123",confirmPassword:"Test123",firstName:"Changed",paternalSurname:"Changed"});
  assert.equal("firstName" in parsed,false);
  assert.equal("paternalSurname" in parsed,false);
});

test("requires paternal surnames and preserves optional maternal surnames", () => {
  for (const field of ["paternalSurname", "participantPaternalSurname"]) {
    assert.equal(registrationSchema.safeParse({...request, [field]: " "}).success, false);
  }
  const result = registrationSchema.parse({...request, paternalSurname: "  De la Cruz  ", maternalSurname: "", participantMaternalSurname: null});
  assert.equal(result.paternalSurname, "De la Cruz");
  assert.equal(result.maternalSurname, null);
  assert.equal(result.participantMaternalSurname, null);
});
