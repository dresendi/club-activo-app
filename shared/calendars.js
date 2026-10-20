export function calendarEmbedUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "calendar.google.com" && url.pathname === "/calendar/embed" ? url.href : null;
  } catch { return null; }
}
