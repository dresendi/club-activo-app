# Club Activo · Android e iOS

Proyecto independiente React + Vite + Capacitor. No importa archivos del repositorio web en tiempo de ejecución, no modifica su despliegue ni ejecuta migraciones.

## Inicio

```sh
npm ci
npm run dev
npm test
npm run build
npm run sync
npm run android
# En macOS con Xcode:
npm run ios
```

El frontend inicia sin credenciales y muestra la comunidad. Para probar login copia `.env.example` a `.env` y `server/.env.example` a `server/.env`, configura ambos para el MISMO proyecto Supabase y ejecuta `npm run api` en otra terminal. Nunca uses una clave privada en variables VITE_. No se copiaron credenciales del sitio web.

La API móvil es independiente: verifica el JWT con Supabase y consulta el estado/roles actuales en cada petición. Incluye lecturas y los flujos de escritura del club; las escrituras están deshabilitadas por defecto. Activa `ENABLE_MUTATIONS=true` en la API cuando el entorno de pruebas esté preparado. Para aislamiento de datos total utiliza un proyecto Supabase de pruebas con el esquema del club; no conectes pruebas de altas/bajas a producción. El login de Supabase sí crea una sesión en el proyecto que configures.

En dispositivo físico configura una URL HTTPS para la API separada: localhost apunta al teléfono. La API de desarrollo escucha únicamente en loopback; adapta el host para tu proveedor al desplegarla. Esta API NO está desplegada todavía.

## Implementado
- Inicio, comunidad, programas, prensa, preguntas y aviso de privacidad en diálogo.
- Registro con nombres separados, teléfono internacional (México por defecto), activación OTP con participante de solo lectura, correo opcional y contraseña; recuperación de contraseña.
- Login, cierre de sesión, calendarios públicos y privados, etiqueta de comité y permisos actuales verificados en la API.
- Administración de solicitudes, búsqueda de participantes/contactos, edición de nombres, roles múltiples, activación/inactivación y borrado con confirmación.
- Anualidades por participante/año, búsqueda por contacto y recibos privados; tarjetas en pantallas pequeñas.
- Formatos IAP para comité/admin, edición por admin y descarga/compartir archivos nativos.
- Sección Pagos para miembros con el mismo mensaje «En construcción / Próximamente» de la web; no hay cobros automáticos.
- Pantallas de guardado, navegación inferior y botón Atrás de Android.
- API independiente que adapta los workflows del sitio sin importar archivos de su repositorio.

## Configuración y pruebas pendientes antes de una beta
- Configurar Supabase de pruebas con el esquema, RPC y buckets actuales del club; no se ejecutaron migraciones ni se copiaron credenciales.
- Desplegar la API separada con HTTPS. Configurar `VITE_API_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; servidor y cliente deben apuntar al mismo proyecto. `ALLOWED_ORIGINS` incluye localhost de Vite y los orígenes de Capacitor. Configurar SMS/WhatsApp en Supabase para OTP.
- Habilitar escrituras con `ENABLE_MUTATIONS=true` y ejecutar los escenarios de `docs/validation.md` contra datos de pruebas.
- Sesiones solo en memoria: se solicita login al cerrar completamente la app. Persistencia en Keychain/Keystore queda para la beta.
- Probar selección, descarga y compartir archivos, teclado, botón Atrás, cámara/galería si se agrega, y calendarios en teléfonos físicos.
- Iconos/splash definitivos, enlaces universales, notificaciones, eliminación de cuenta desde el propio usuario y firma/distribución quedan pendientes.
- No hay APK/IPA compilados. iOS requiere macOS/Xcode; Android requiere SDK/Android Studio.

Identificador inicial: `org.clubactivo.app`. Confirmar propiedad/nombre definitivo antes de las tiendas.

## Separación y procedencia
Ver `docs/reuse.md`. Mantener cambios móviles en este repositorio; cualquier sincronización futura de componentes debe ser explícita y revisada. No hay enlaces simbólicos ni carpetas compartidas.
