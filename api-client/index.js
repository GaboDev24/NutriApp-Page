/**
 * SDK Cliente de SpiderWeb API.
 * Exporta la clase principal SpiderWebClient y los submódulos SQL, Storage y SpiderIA.
 */

const SpiderWebClient = require('./client');
const SqlSubmodule = require('./sql');
const StorageSubmodule = require('./storage');
const SpiderIaSubmodule = require('./ia');

class SpiderWebSDK {
    /**
     * @param {Object} [config] Configuración para SpiderWebClient
     */
    constructor(config = {}) {
        this.client = new SpiderWebClient(config);
        this.sql = new SqlSubmodule(this.client);
        this.storage = new StorageSubmodule(this.client);
        this.ia = new SpiderIaSubmodule(this.client);
    }
}

module.exports = {
    SpiderWebSDK,
    SpiderWebClient,
    SqlSubmodule,
    StorageSubmodule,
    SpiderIaSubmodule,
    // Instancia por defecto lista para usar si existen las variables de entorno
    createClient: (config = {}) => new SpiderWebSDK(config)
};
