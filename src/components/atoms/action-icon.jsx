export function ActionIcon({ name, ...props }) {
  const paths = {
    trash: <><path d="M3 6h18M9 6V4h6v2M5 6l1 14h12l1-14M10 10v6M14 10v6" /></>,
    save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2Z" /><path d="M7 3v6h10V3M7 21v-8h10v8" /></>,
    block: <><circle cx="12" cy="12" r="9" /><path d="m6 6 12 12" /></>,
    warning: <><path d="m12 3 10 18H2L12 3Z M12 9v5 M12 17v.1" /></>
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{paths[name]}</svg>;
}
