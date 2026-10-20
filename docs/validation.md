# Validación de la adaptación móvil · 2026-10-20

- 27 pruebas pasan: reglas compartidas y pruebas HTTP con dobles locales de Supabase. Se verifica denegación a miembros/comité en endpoints admin, bloqueo de escritura por defecto, CORS, allowlist de acciones, roles, firma/vencimiento del comprobante OTP y revocación por cuenta inactiva.
- Build Vite correcto. Queda advertencia de chunk principal ~564 kB; las pantallas administrativas se cargan por demanda.
- `npm run sync` correcto para Android e iOS con App, Filesystem, Share y Browser. Manifiesto de privacidad Filesystem incluido en recursos Xcode.
- Registro, login y diálogo de privacidad revisados en navegador con ancho móvil: nombres separados, leyendas y México +52 predeterminado.
- No se ejecutó login/OTP real ni operaciones sobre una base real: faltan credenciales y API de pruebas. Las pruebas HTTP no sustituyen una integración completa.
- No se compilaron ni firmaron APK/IPA; compartir archivos, teclado y botón Atrás requieren pruebas físicas.

## Escenarios de integración en un entorno de pruebas
1. Registrar un participante y un contacto; comprobar validación y bloqueo durante guardado.
2. Aprobar como administrador, verificar OTP y completar contraseña/correo sin modificar nombres.
3. Login válido/incorrecto, logout, recuperación y bloqueo después de inactivar la cuenta.
4. Asignar y retirar comité: formatos disponibles, administración siempre denegada.
5. Buscar y editar nombres; probar borrado confirmado de un registro desechable y protección de admin/autoborrado.
6. Registrar anualidad para cada año y contacto vinculado, adjuntar recibo PDF/imagen, reemplazarlo y descargarlo; probar denegación como miembro.
7. Publicar/reemplazar formato IAP y comprobar descarga como comité.
8. Probar errores de red, archivo excesivo, cuenta desactivada durante la sesión y botón Atrás con un diálogo abierto.

La API usa las tablas/RPC/buckets del modelo web actual. No crea ni migra recursos automáticamente.
