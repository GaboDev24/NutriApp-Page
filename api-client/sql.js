/**
 * Submódulo SQL para consultar e interactuar con bases de datos relacionales en SpiderWeb API.
 */

class SqlSubmodule {
    /**
     * @param {import('./client')} client Instancia del cliente SpiderWebClient
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Lista todas las bases de datos disponibles.
     * @returns {Promise<Object>} Lista de bases de datos
     */
    async listDatabases() {
        return await this.client.request('/databases', { method: 'GET' });
    }

    /**
     * Lista las tablas de una base de datos específica.
     * @param {string} [dbName] Nombre de la base de datos (opcional si está definido en el entorno)
     * @returns {Promise<Object>} Lista de tablas
     */
    async listTables(dbName) {
        const db = dbName || process.env.DB_NAME;
        if (!db) {
            throw new Error('[SqlSubmodule] Error: Se requiere el nombre de la base de datos.');
        }
        return await this.client.request(`/databases/${encodeURIComponent(db)}/tables`, { method: 'GET' });
    }

    /**
     * Ejecuta una consulta SQL en la base de datos especificada.
     * @param {string|null} dbName Nombre de la base de datos (pasa null para usar la variable de entorno DB_NAME)
     * @param {string} sqlQuery Consulta SQL a ejecutar (SELECT, INSERT, UPDATE, CREATE, etc.)
     * @returns {Promise<Object>} Resultado de la consulta SQL
     */
    async query(dbName, sqlQuery) {
        const db = dbName || process.env.DB_NAME;
        if (!db) {
            throw new Error('[SqlSubmodule] Error: Se requiere especificar la base de datos (dbName o env DB_NAME).');
        }
        if (!sqlQuery || typeof sqlQuery !== 'string') {
            throw new Error('[SqlSubmodule] Error: Se requiere una consulta SQL válida.');
        }

        return await this.client.request('/query', {
            method: 'POST',
            body: {
                database: db,
                query: sqlQuery
            }
        });
    }
}

module.exports = SqlSubmodule;
