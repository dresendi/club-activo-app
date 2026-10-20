import { NextResponse } from "../compat.js";
import { submitRegistrationRequest } from "./workflows.js";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const result = await submitRegistrationRequest({
      email: formData.get("email"),
      firstName: formData.get("firstName"),
      paternalSurname: formData.get("paternalSurname"),
      maternalSurname: formData.get("maternalSurname"),
      firstNameAutism: formData.get("firstNameAutism"),
      participantPaternalSurname: formData.get("participantPaternalSurname"),
      participantMaternalSurname: formData.get("participantMaternalSurname"),
      relationship: formData.get("relationship"),
      phone: formData.get("phone"),
      role: "family"
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 400
    });
  } catch (error) {
    return NextResponse.json(
      {
        formError: "No se pudo procesar la solicitud de registro.",
        success: false
      },
      { status: 500 }
    );
  }
}
