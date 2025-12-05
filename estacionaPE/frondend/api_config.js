// CAMBIA ESTA IP POR LA TUYA (La que usaste en Postman)
// IMPORTANTE: No uses "localhost" porque el celular/emulador no lo entiende.
export const API_URL = 'http://192.168.100.14:5000/api'; 

// Función auxiliar para manejar las cabeceras con Token
export const getHeaders = (token) => {
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};