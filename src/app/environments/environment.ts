export const environment = {
    production: false,
    tauri: false,
    // envName identifica el ambiente para UI (pill de "no producción" en el menú, etc).
    // No usar 'production' (el flag de arriba) para esto: environment.test.ts también lo
    // tiene en true (para builds optimizados), así que no alcanza para distinguir prod real.
    envName: 'local' as 'local' | 'test' | 'production',
    apiUrl: 'http://127.0.0.1:9000/easystore/'
};