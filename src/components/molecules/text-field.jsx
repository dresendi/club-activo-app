export function TextField({
  autoComplete,
  error,
  hint,
  label,
  name,
  required = false,
  type = "text",
  ...inputProps
}) {
  return (
    <label className="text-field">
      <span>{label}</span>
      <input
        autoComplete={autoComplete}
        name={name}
        required={required}
        type={type}
        {...inputProps}
      />
      {hint ? <small>{hint}</small> : null}
      {error ? <small className="text-field__error">{error}</small> : null}
    </label>
  );
}
