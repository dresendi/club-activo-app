"use client";

import { useState } from "react";
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString } from "libphonenumber-js/max";
import { TextField } from "@/components/molecules/text-field.jsx";

const names = new Intl.DisplayNames(["es"], { type: "region" });
const countries = getCountries().map((code) => ({
  code, name: names.of(code), callingCode: getCountryCallingCode(code)
})).sort((a, b) => a.name.localeCompare(b.name, "es"));

export function InternationalPhoneField({ name = "phone", error }) {
  const [country, setCountry] = useState("MX");
  const [number, setNumber] = useState("");
  const prefix = `+${getCountryCallingCode(country)}`;
  const international = number.trim().startsWith("+") ? number.trim() : `${prefix} ${number.trim()}`;

  function updateNumber(event) {
    const value = event.target.value;
    setNumber(value);
    if (value.trim().startsWith("+")) {
      const parsed = parsePhoneNumberFromString(value);
      if (parsed?.country) {
        setCountry(parsed.country);
        setNumber(parsed.nationalNumber);
      }
    }
  }

  return (
    <div className="panel-form">
      <label className="text-field">
        <span>País del teléfono</span>
        <select className="text-field__select" value={country} onChange={(event) => setCountry(event.target.value)}>
          {countries.map((item) => <option key={item.code} value={item.code}>{item.name} (+{item.callingCode})</option>)}
        </select>
      </label>
      <TextField label="Teléfono celular" name={`${name}National`} type="tel" autoComplete="tel-national"
        inputMode="tel" value={number} onChange={updateNumber} required error={error}
        hint={country === "MX" ? "Escribe 10 dígitos sin espacios ni símbolos." : "Escribe tu número sin espacios ni símbolos."} />
      <input type="hidden" name={name} value={number.trim() ? international : ""} />
    </div>
  );
}
