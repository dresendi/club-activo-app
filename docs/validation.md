# Verificación inicial · 2026-10-20

- 18 pruebas aprobadas: validación, teléfono, roles, acceso, calendarios y frontera de autorización HTTP de la API (doble de Supabase, sin usuarios reales).
- `npm run build`: compilación Vite correcta. Advertencia de bundle principal de aproximadamente 502 kB; dividir por pantallas antes de beta.
- `cap add android` y `cap add ios`: correctos. Assets locales copiados a ambas plataformas.
- Inicio revisado en navegador a ancho móvil. Esto no reemplaza pruebas físicas.
- `npm audit --omit=dev`: cero vulnerabilidades. Auditoría completa: tres advertencias moderadas en la cadena de desarrollo Capacitor CLI → xcode → uuid; revisar actualización upstream antes de release. No se aplicaron overrides incompatibles.
- Sin APK/IPA compilados ni firmados. Xcode/macOS requerido para compilar iOS; configurar SDK Android para Android.
- No se probó login real: faltan configuración pública y API móvil desplegada. No se modificó la base de datos.
- El repositorio web conserva su commit 1064900 y su estado previo.
