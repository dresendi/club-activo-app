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

La API móvil es independiente: verifica el JWT con Supabase y consulta el estado/roles actuales en cada petición. Solo ofrece lecturas. Para aislamiento de datos total utiliza un proyecto Supabase de pruebas con el esquema del club; no conectes pruebas de altas/bajas a producción. El login de Supabase sí crea una sesión en el proyecto que configures.

En dispositivo físico configura una URL HTTPS para la API separada: localhost apunta al teléfono. La API de desarrollo escucha únicamente en loopback; adapta el host para tu proveedor al desplegarla. Esta API NO está desplegada todavía.

## Implementado
- Android/iOS Capacitor con assets empaquetados, sin server.url remoto.
- Inicio, navegación inferior, login por teléfono + contraseña, cierre de sesión y consulta de eventos mediante API propia.
- Componentes de teléfono internacional, campos y bloqueo de guardado reutilizados.
- Reglas y pruebas de validación, roles y acceso copiadas del proyecto web.
- Claves privadas exclusivamente en server/; sesiones del prototipo solo en memoria.

## Pendiente antes de una beta
- Configurar un entorno Supabase/API separado y probar login real de extremo a extremo.
- Persistencia de sesión en Keychain/Keystore (no Preferences ni localStorage).
- Adaptar activación OTP, registro, recuperación, descarga de Formatos IAP y recibos. El portal admin sigue en la web.
- Notificaciones, manejo del botón Atrás de Android, enlaces profundos y archivos nativos.
- Iconos/splash nativos definitivos (los proyectos generados tienen los predeterminados), privacidad, eliminación de cuenta y firma de distribución.
- Pruebas en teléfonos reales, beta y publicación. Generar los proyectos no equivale a compilar APK/IPA.

Identificador inicial: `org.clubactivo.app`. Confirmar propiedad/nombre definitivo antes de las tiendas.

## Separación y procedencia
Ver `docs/reuse.md`. Mantener cambios móviles en este repositorio; cualquier sincronización futura de componentes debe ser explícita y revisada. No hay enlaces simbólicos ni carpetas compartidas.
