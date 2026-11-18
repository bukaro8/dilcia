# GlucoMi

Aplicación privada para registrar y revisar glucosa en mmol/L. Interfaz completamente en español. La aplicación usa Next.js, TypeScript, PostgreSQL y Prisma; las fechas se presentan y se introducen en `Europe/London`, y se guardan como instantes UTC.

## Puesta en marcha local

1. Copia `.env.example` a `.env`. Usa la misma contraseña local en `POSTGRES_PASSWORD` y en `DATABASE_URL`. Genera un secreto aleatorio de sesión (`openssl rand -hex 32`). La URL del ejemplo usa `127.0.0.1` para ejecutar Next.js en tu equipo.
2. Ejecuta `docker compose -f docker-compose.local.yml up -d db`, `npm ci` y `npx prisma migrate deploy`. PostgreSQL se publica solo en `127.0.0.1:5432` y persiste en el volumen `postgres_data`.
3. Crea la cuenta inicial sin credenciales predeterminadas: `ADMIN_EMAIL=correo@example.com ADMIN_PASSWORD='una-frase-larga-de-al-menos-14-caracteres' npm run db:seed`. El inicializador lee `DATABASE_URL` de `.env` y se niega a sobrescribir una base de datos con usuarios existentes. No reutilices la contraseña del ejemplo.
4. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Coolify con PostgreSQL como recurso independiente

Usa `/docker-compose.yml` como archivo Compose, con directorio base `/`. Este archivo construye únicamente GlucoMi. Configura el dominio HTTPS en el servicio `app`, puerto interno `3000`.

1. En tu PostgreSQL existente, usa una base dedicada a GlucoMi con un usuario que pueda ejecutar sus migraciones.
2. En Coolify, define `DATABASE_URL` con la URL completa de esa base, `SESSION_SECRET` con un valor aleatorio de al menos 32 caracteres y `APP_URL` con la URL pública HTTPS. No hacen falta `POSTGRES_DB` ni `POSTGRES_PASSWORD` en el recurso de la app.
3. Si la URL usa el nombre interno del contenedor de PostgreSQL, verifica que ambos recursos estén en una red compartida de Coolify. Para el Compose, revisa **Advanced → Docker Compose → Connect to Predefined Network**. Usa la URL interna con el nombre de host indicado por el recurso de PostgreSQL, ajustada al nombre de la base dedicada.
4. Despliega y comprueba `/api/health`. El contenedor espera la conexión y ejecuta `prisma migrate deploy` antes de iniciar la app. Crea la cuenta de prueba desde **Crear una cuenta**.

## Copias de seguridad

Configura las copias periódicas y la retención en el recurso de PostgreSQL. Para probar una restauración, usa una base aislada y verifica su contenido antes de sustituir la base activa. Guarda las copias cifradas fuera del repositorio.

## Migraciones y recuperación

Las migraciones versionadas están en `prisma/migrations`. Añade una migración nueva en desarrollo y revísala antes de desplegar. El arranque serializa el cambio al existir una sola instancia de aplicación en cada despliegue; evita escalar simultáneamente versiones distintas durante migraciones incompatibles. Si una migración falla, la aplicación nueva no inicia. Revisa los logs, conserva una copia de seguridad, corrige la causa y publica una migración correctiva. No borres filas de `_prisma_migrations` manualmente. Para cambios complejos, restaura una copia en un entorno aislado y sigue el procedimiento de recuperación de Prisma antes de reanudar el servicio.

## Objetivos y salud

Valores iniciales orientativos para adultos con diabetes tipo 2: ayunas 4,0–7,0 mmol/L; dos horas después del almuerzo <8,5 mmol/L; antes de cenar 4,0–7,0 mmol/L. Cualquier lectura <4,0 activa alerta de hipoglucemia. Los límites se almacenan en `GlucoseTarget` para poder personalizarlos en una evolución posterior; el médico puede indicar objetivos distintos.

La alerta baja se basa en la información actual del [NHS sobre hipoglucemia](https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/): azúcar de acción rápida si la persona está consciente y puede tragar, volver a medir a los 10–15 minutos y repetir si continúa por debajo de 4; para una persona que no responde normalmente o está inconsciente, llamar al 999, no dar comida/bebida y ponerla en posición de recuperación. La app no diagnostica ni recomienda cambios de medicación. En caso de duda, seguir el plan individual acordado con el equipo sanitario.

## Privacidad y limitaciones actuales

Las contraseñas se guardan con bcrypt y las sesiones son cookies HTTP-only, SameSite Lax, Secure en producción. Las rutas de lecturas exigen sesión y filtran por usuario; respuestas privadas no se cachean. HTTPS debe terminar en Coolify. `GET /api/health` comprueba PostgreSQL. No se guarda información médica en el caché del service worker; el caché solo contiene la interfaz pública.

En esta primera entrega, el modo sin conexión permite cargar la interfaz, pero **no encola mediciones para sincronizarlas**. El almacenamiento offline de información de salud requiere una decisión adicional de cifrado, caducidad y borrado del dispositivo; no se debe interpretar el indicador offline como que el dato quedó guardado. El botón PDF abre el diálogo de impresión del navegador para guardar como PDF con el contenido en inglés; compartir usa Web Share cuando está disponible y ofrece impresión como alternativa. Se incluyen las vistas principales; aún faltan pruebas de integración de base de datos, validación real de Docker/Coolify y sincronización offline.

## Copias y fuentes

- Fuente clínica: [NHS — Low blood sugar (hypoglycaemia)](https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/), revisada para el texto inicial de la alerta.
- Los valores objetivo fueron proporcionados por el propietario del proyecto y se etiquetan como orientativos.

## Registro y recuperación de cuenta

En la pantalla de inicio, **Crear una cuenta** registra un perfil independiente. La contraseña debe tener al menos 8 caracteres. Las cuentas existentes conservan sus mediciones.

Para activar **¿Olvidaste tu contraseña?** en Coolify, configura `RESEND_API_KEY` y `RECOVERY_FROM` con un remitente verificado en Resend (por ejemplo, `GlucoMi <cuentas@tu-dominio.example>`). Usa en `APP_URL` la URL HTTPS que abrirán los usuarios. El correo solo incluye el enlace de recuperación, que dura 30 minutos y se usa una vez. Al cambiar la contraseña se cierran las sesiones anteriores.

En desarrollo puedes probar el recorrido sin enviar correo con `RECOVERY_LOCAL_PREVIEW=true` y `APP_URL=http://localhost:3000` en `.env`. Solicita el enlace desde la pantalla de recuperación y ábrelo desde la salida de la terminal de desarrollo. La vista previa solo funciona con `npm run dev`.
