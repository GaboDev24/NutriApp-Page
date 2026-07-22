/**
 * Utilidades para formateo y ejecución de consultas SQL a través del SDK de SpiderWeb API.
 */

const { createClient } = require('../api-client');
const sdk = createClient();

/**
 * Escapa valores para sentencias SQL de forma segura.
 * @param {any} value 
 * @returns {string}
 */
function escapeSql(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (typeof value === 'object') {
        const str = JSON.stringify(value);
        return `'${str.replace(/'/g, "''")}'`;
    }
    return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Ejecuta una consulta SQL y retorna las filas resultantes si aplica.
 * @param {string} sqlQuery 
 * @returns {Promise<any[]>}
 */
async function query(sqlQuery) {
    try {
        const res = await sdk.sql.query(null, sqlQuery);
        if (res && Array.isArray(res.result)) {
            return res.result;
        }
        if (res && Array.isArray(res.results)) {
            return res.results;
        }
        if (Array.isArray(res)) {
            return res;
        }
        if (res && Array.isArray(res.data)) {
            return res.data;
        }
        return res;
    } catch (err) {
        console.error('[DB HELPER Error] Query falló:', sqlQuery, err.message);
        throw err;
    }
}

module.exports = {
    escapeSql,
    query,
    sdk
};
