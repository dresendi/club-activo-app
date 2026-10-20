export function OtpChannelField({ defaultValue = "sms" }) {
  return (
    <label className="text-field">
      <span>¿Dónde quieres recibir el código?</span>
      <select name="channel" className="text-field__select" defaultValue={defaultValue}>
        <option value="sms">Mensaje de texto (SMS)</option>
        <option value="whatsapp">WhatsApp</option>
      </select>
    </label>
  );
}
