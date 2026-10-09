import { HttpContextToken } from '@angular/common/http';

/**
 * Marca una solicitud HTTP como "silenciosa" (oct-2026): consultas de fondo, como el contador
 * de Notas de Empaque pendientes del menú, que se repiten solas cada tanto sin que el usuario
 * haya hecho nada. Para estas solicitudes:
 *  - InterceptorService NO muestra el spinner de pantalla completa (taparía la pantalla cada
 *    vez que se refresca el contador).
 *  - HttpErrorHandlerService NO muestra toasts de error (si el servidor se cae, el usuario ya
 *    se entera por lo que sí está haciendo; no hace falta un cartel por minuto). El 401 se
 *    sigue manejando igual: sesión vencida => volver a ingresar.
 */
export const SOLICITUD_SILENCIOSA = new HttpContextToken<boolean>(() => false);
