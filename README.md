# GlucoMi

Aplicación privada para registrar y revisar glucosa en mmol/L. Interfaz completamente en español. La aplicación usa Next.js, TypeScript, PostgreSQL y Prisma; las fechas se presentan y se introducen en `Europe/London`, y se guardan como instantes UTC.

## Puesta en marcha local

1. Copia `.env.example` a `.env`. Establece una contraseña local para PostgreSQL y un secreto aleatorio de sesión (`openssl rand -hex 32`). La URL del ejemplo usa `127.0.0.1` para ejecutar Next.js en tu equipo.
2. Ejecuta `docker compose -f docker-compose.yml -f docker-compose.local.yml up -d db`, `npm ci` y `npx prisma migrate deploy`. PostgreSQL se publica solo en `127.0.0.1:5432` y persiste en el volumen `postgres_data`.
3. Crea la cuenta inicial sin credenciales predeterminadas: `ADMIN_EMAIL=correo@example.com ADMIN_PASSWORD='una-frase-larga-de-al-menos-14-caracteres' npm run db:seed`. El inicializador lee `DATABASE_URL` de `.env` y se niega a sobrescribir una base de datos con usuarios existentes. No reutilices la contraseña del ejemplo.
4. Ejecuta `npm run dev` y abre `http://localhost:3000`.

## Despliegue en Coolify / Docker Compose

1. Crea una aplicación desde `bukaro8/dilcia` con la estrategia Docker Compose, directorio base `/` y archivo `/docker-compose.yml`. Coolify construirá el servicio `app` con el Dockerfile de la raíz. En Domains, configura HTTPS para `app` con puerto interno `3000`. El dominio debe resolver al servidor y tener un certificado de confianza para los dispositivos de tu red.
2. Define `POSTGRES_PASSWORD` (usa `openssl rand -hex 32` para que sea compatible con la URL), `SESSION_SECRET` (genera con `openssl rand -base64 48`) y `APP_URL` con el dominio HTTPS. Guarda las variables como secretos de Coolify; no las añadas al repositorio.
3. Conserva el volumen `postgres_data` y despliega. La base de datos espera su health check. El contenedor de aplicación también espera `pg_isready`, ejecuta `prisma migrate deploy` y solo entonces inicia Next.js. Un error de migración detiene el contenedor. Nunca se ejecuta `db push` ni se corre un seed en el arranque.
4. Tras el primer despliegue, crea la cuenta inicial desde una sesión administrativa controlada ejecutando el inicializador con variables temporales. Por ejemplo, `docker compose exec -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... app npm run db:seed`. No dejes esas variables guardadas tras el proceso.
5. Configura las copias externas cifradas de PostgreSQL según la política de tu servidor. Un ejemplo de respaldo: `docker compose exec -T db pg_dump -U glucosa glucosa | gzip > backups/glucosa-$(date -u +%F-%H%M).sql.gz`. Guarda `backups/` fuera del repositorio y aplica retención limitada. Restauración en una base vacía: `gunzip -c respaldo.sql.gz | docker compose exec -T db psql -U glucosa glucosa`. Haz primero una copia del estado actual y valida la restauración en una instancia aislada.

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
