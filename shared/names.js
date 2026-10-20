export function nameColumns(value, participant = false) {
  const first_name = participant ? value.firstNameAutism : value.firstName;
  const paternal_surname = participant ? value.participantPaternalSurname : value.paternalSurname;
  const maternal_surname = (participant ? value.participantMaternalSurname : value.maternalSurname) || null;
  return { first_name, paternal_surname, maternal_surname,
    full_name: [first_name, paternal_surname, maternal_surname].filter(Boolean).join(" ") };
}
