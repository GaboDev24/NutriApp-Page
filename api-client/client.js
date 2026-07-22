/**
 * Cliente HTTP centralizado para consumir la API de SpiderWeb.
 * Maneja autenticación mediante la cabecera X-API-KEY, timeouts, y errores HTTP.
 */

const fs = require('fs');
const path = require('path');

class SpiderWebClient {
    /**
     * @param {Object} config Configuración del cliente
     * @param {string} [config.apiKey] API Key de SpiderWeb
     * @param {string} [config.baseUrl] URL base de la API
     * @param {number} [config.timeout] Tiempo de espera en milisegundos (por defecto 15000)
     */
    constructor(config = {}) {
        this.apiKey = config.apiKey || process.env.SPIDERWEB_API_KEY || process.env.API_KEY;
        this.baseUrl = (config.baseUrl || process.env.SPIDERWEB_API_BASE_URL || 'https://spiderwebargapi.com.ar/api/v1').replace(/\/+$/, '');
        this.timeout = config.timeout || 15000;

        this.validateConfig();
    }

    /**
     * Valida que las variables necesarias estén configuradas.
     */
    validateConfig() {
        if (!this.apiKey) {
            throw new Error('[SpiderWebClient] Error: API_KEY o SPIDERWEB_API_KEY no está configurada en el entorno.');
        }
    }

    /**
     * Realiza peticiones HTTP a la API de SpiderWeb.
     * @param {string} endpoint Endpoint relativo (ej: '/query')
     * @param {Object} options Opciones de fetch (method, headers, body, isBinary, isFormData)
     * @returns {Promise<any>} Respuesta procesada
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
        const method = options.method || 'GET';
        
        const headers = {
            'X-API-KEY': this.apiKey,
            ...(options.headers || {})
        };

        // Si no es FormData ni binario, asumir JSON por defecto si hay body
        if (options.body && !options.isFormData && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method,
                headers,
                body: options.isFormData ? options.body : (options.body && typeof options.body === 'object' ? JSON.stringify(options.body) : options.body),
                signal: controller.signal
            });

            clearTimeout(timer);

            if (!response.ok) {
                let errorDetails = '';
                try {
                    const errJson = await response.json();
                    errorDetails = errJson.message || errJson.error || JSON.stringify(errJson);
                } catch (_) {
                    errorDetails = await response.text();
                }

                const err = new Error(`[SpiderWebAPI Error ${response.status}] ${errorDetails || response.statusText}`);
                err.status = response.status;
                throw err;
            }

            if (options.isBinary) {
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            clearTimeout(timer);
            if (error.name === 'AbortError') {
                throw new Error(`[SpiderWebClient] Tiempo de espera agotado (${this.timeout}ms) al conectar con ${endpoint}`);
            }
            throw error;
        }
    }
}

module.exports = SpiderWebClient;
