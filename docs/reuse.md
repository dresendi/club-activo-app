# Procedencia

Fuente: https://github.com/dresendi/club-activo-app-web
Commit: 1064900ca6e12dd265b75c9a96162d13e641346a

Copias independientes: shared/auth (validación, teléfono, roles y permisos con pruebas), shared/names.js, shared/calendars.js y pruebas; campos, selector de país y BusyOverlay de components/molecules; logo de public. La importación del TextField fue adaptada a JSX. server/service-key.js conserva la validación de claves solo en backend.

No se copiaron .env, migraciones, node_modules, .git ni datos de usuarios. La API inicial era de solo lectura; la adaptación funcional descrita abajo incorpora escrituras habilitables por configuración.


## Adaptación funcional · 2026-10-20
Se copiaron los workflows y handlers desde el mismo commit web de referencia a `server/ported/`. Los adaptadores de contexto y Response sustituyen las APIs Next; no se ejecutan Server Actions desde el cliente móvil. Los formularios viven en `src/components/` y usan la API móvil con bearer token. Los nombres de imports next/link/navigation se resuelven a React Router local, sin dependencia de Next en el bundle.

Cambios intencionales: comprobante OTP firmado en memoria/header en lugar de cookie; contexto aislado por petición; autorización actual antes de cada endpoint privado; escrituras deshabilitadas por defecto; compartir archivos vía Capacitor; anualidades como tarjetas; navegación hash y aviso de privacidad ajustado a sesiones en memoria. No se modificó el repositorio web.
