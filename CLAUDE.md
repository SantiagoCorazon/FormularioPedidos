\# FormularioPedidos



\## Qué es

Aplicación de Santiago Corazón con dos funciones principales, controladas desde un mismo Dashboard:

\- Formulario de pedidos de productos (usado por clientes/público general)

\- Gestión de Salas Lúdicas (reservas/administración)



\## Tecnologías

\- Frontend: HTML / CSS / JS puro (sin framework)

\- Base de datos: SQL, manejada en Supabase



\## Cuentas de este proyecto

\- Carpeta local: `C:\\Mis\_Apps\\FormularioPedidos`

\- GitHub: usar la cuenta \*\*eventos@santiagocorazon.org\*\* (ya configurada como `git config user.email` en esta carpeta — si Claude ve otra cuenta activa debe avisar antes de hacer push)

\- Supabase: proyecto ya vinculado con `supabase link`, Reference ID \*\*sbhbcgxmxnxyfuzggegj\*\*

\- Vercel: todavía no configurado en este proyecto (pendiente `vercel link`)



\## Rutina de trabajo esperada

1\. El usuario abre PowerShell y se mueve a esta carpeta.

2\. Si la tarea toca la base de datos, el usuario activa el token de Supabase de este proyecto en la sesión (`$env:SUPABASE\_ACCESS\_TOKEN`) antes de abrir Claude Code.

3\. Antes de programar cualquier cambio, mostrar primero un plan simple de qué se va a hacer y esperar aprobación.

4\. Después de hacer el cambio, indicar cómo probarlo antes de seguir.

5\. Antes de `git commit` / `git push`, mostrar un resumen de qué archivos cambiaron y por qué.

6\. Si el cambio toca la base de datos en Supabase, avisar explícitamente y explicar si se debe correr `supabase db push` u otro comando, sin ejecutarlo por cuenta propia sin confirmación.

7\. El usuario es nueva usando terminal y Claude Code: explicar cada paso y cada comando en español simple, sin dar por hecho que conoce la terminal.



\## Reglas para trabajar en este proyecto

\- Explicar siempre los cambios en español, en lenguaje simple y sin tecnicismos innecesarios

\- No borrar ni modificar código sin explicar primero qué se va a cambiar y por qué

\- Antes de hacer commit/push, mostrar un resumen de qué archivos cambiaron

\- Como el formulario de pedidos lo llena público general, cuidar que sea simple y sin errores para el usuario final

\- El Dashboard controla ambos módulos (pedidos y salas lúdicas) — al modificar uno, verificar que no se afecte el otro

\- Si algo toca la base de datos en Supabase, avisar explícitamente antes de ejecutar

\- Si un cambio rompe algo, revertir con git y avisar al usuario — no intentar arreglarlo sobre la marcha sin decirle primero



\## Estructura del proyecto

\- \[Pendiente: pídele a Claude Code que lo complete leyendo el proyecto — ver instrucciones abajo]



\## Entorno de pruebas vs. producción

\- \[Pendiente: indicar si existe un proyecto de Supabase de pruebas separado, o si todo se trabaja directo sobre el real]



\## Roles de usuario

\- \[Pendiente: pídele a Claude Code que liste los roles/accesos que encuentre, considerando que hay público general (pedidos) y administración (salas lúdicas)]

