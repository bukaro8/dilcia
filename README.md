# Glucosa Dilcia

Aplicación privada para registrar y revisar glucosa en mmol/L. Interfaz completamente en español. La aplicación usa Next.js, TypeScript, PostgreSQL y Prisma; las fechas se presentan y se introducen en `Europe/London`, y se guardan como instantes UTC.

## Puesta en marcha local

1. Copia `.env.example` a `.env` y establece `DATABASE_URL` y un secreto aleatorio de sesión (`openssl rand -base64 48`).
2. Ejecuta `npm ci`, `npx prisma migrate deploy` y `npm run dev`.
3. Crea la primera cuenta sin credenciales predeterminadas: `ADMIN_EMAIL=correo@example.com ADMIN_PASSWORD='una-frase-larga-de-al-menos-14-caracteres' npm run db:seed`. El inicializador se niega a sobrescribir una base de datos con usuarios existentes. No reutilices la contraseña del ejemplo.

## Despliegue en Coolify / Docker Compose

1. Crea un recurso Docker Compose desde `bukaro8/dilcia` (o desde este repositorio) y asigna un dominio con TLS/HTTPS al servicio `app`, puerto 3000.
2. Define `POSTGRES_PASSWORD`, `SESSION_SECRET` (genera con `openssl rand -base64 48`) y `APP_URL` con el dominio HTTPS. Guarda las variables como secretos de Coolify; no las añadas al repositorio.
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

En esta primera entrega, el modo sin conexión permite cargar la interfaz, pero **no encola mediciones para sincronizarlas**. El almacenamiento offline de información de salud requiere una decisión adicional de cifrado, caducidad y borrado del dispositivo; no se debe interpretar el indicador offline como que el dato quedó guardado. El botón PDF abre el diálogo de impresión del navegador para guardar como PDF con el contenido en español; compartir usa Web Share cuando está disponible y ofrece impresión como alternativa. Se incluyen las vistas principales; aún faltan pruebas de integración de base de datos, validación real de Docker/Coolify y sincronización offline.

## Copias y fuentes

- Fuente clínica: [NHS — Low blood sugar (hypoglycaemia)](https://www.nhs.uk/conditions/low-blood-sugar-hypoglycaemia/), revisada para el texto inicial de la alerta.
- Los valores objetivo fueron proporcionados por el propietario del proyecto y se etiquetan como orientativos.
