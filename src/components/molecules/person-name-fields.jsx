import { TextField } from "@/components/molecules/text-field.jsx";

export function PersonNameFields({ participant = false, participantLabel = participant, errors, values = {} }) {
  const fields = participant
    ? [["firstNameAutism", "Nombre", "first_name"], ["participantPaternalSurname", "Apellido Paterno", "paternal_surname"], ["participantMaternalSurname", "Apellido Materno", "maternal_surname"]]
    : [["firstName", "Nombre", "first_name"], ["paternalSurname", "Apellido Paterno", "paternal_surname"], ["maternalSurname", "Apellido Materno", "maternal_surname"]];
  return <fieldset className="person-name-fields">
    <legend>{participantLabel ? "Participante" : "Contacto"}</legend>
    <p>{participantLabel ? "Autismo / TDAH / Con sospecha de un posible diagnóstico" : "Persona responsable del participante, madre, padre, abuelo, abuela o tutor"}</p>
    {fields.map(([name, label, column], index) => <TextField key={name} name={name} label={label}
      defaultValue={values[column] || ""} required={index !== 2} maxLength={index === 0 ? 200 : 100}
      autoComplete="off" error={errors?.[name]?.[0]} hint={index === 2 ? "Opcional si no tienes apellido materno." : undefined} />)}
  </fieldset>;
}
