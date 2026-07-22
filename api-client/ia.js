/**
 * Submódulo SpiderIA para interactuar con modelos de inteligencia artificial en SpiderWeb API.
 */

class SpiderIaSubmodule {
    /**
     * @param {import('./client')} client Instancia del cliente SpiderWebClient
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Lista los modelos de IA disponibles.
     * @returns {Promise<Object>} Lista de modelos
     */
    async listModels() {
        return await this.client.request('/ia/models', { method: 'GET' });
    }

    /**
     * Envía una conversación a un modelo de IA y retorna la respuesta.
     * @param {string} modelId ID del modelo a utilizar
     * @param {Array<{role: string, content: string}>} messages Array de mensajes de la conversación
     * @returns {Promise<Object>} Respuesta del modelo (message, usage)
     */
    async chat(modelId, messages) {
        if (!modelId) throw new Error('[SpiderIaSubmodule] Error: Se requiere modelId.');
        if (!Array.isArray(messages) || messages.length === 0) {
            throw new Error('[SpiderIaSubmodule] Error: Se requiere un array de mensajes no vacío.');
        }

        return await this.client.request('/ia/chat', {
            method: 'POST',
            body: {
                model_id: modelId,
                messages
            }
        });
    }

    /**
     * Consulta el uso y la cuota diaria de SpiderIA.
     * @returns {Promise<Object>} Datos de uso y límites
     */
    async getUsage() {
        return await this.client.request('/ia/usage', { method: 'GET' });
    }
}

module.exports = SpiderIaSubmodule;
