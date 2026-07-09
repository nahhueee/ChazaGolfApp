export const environment = {
    // production queda en true a propósito (build optimizado), NO usar este flag para
    // distinguir de producción real: ver envName.
    production: true,
    tauri: false,
    envName: 'test' as 'local' | 'test' | 'production',
    apiUrl: 'https://creationserver.com/chazagolftest/'
};