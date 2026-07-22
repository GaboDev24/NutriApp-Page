/**
 * Submódulo Storage para gestión de proyectos y archivos en la API de SpiderWeb.
 */

class StorageSubmodule {
    /**
     * @param {import('./client')} client Instancia del cliente SpiderWebClient
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Lista los proyectos de almacenamiento.
     * @returns {Promise<Object>} Lista de proyectos
     */
    async listProjects() {
        return await this.client.request('/storage/projects', { method: 'GET' });
    }

    /**
     * Crea un proyecto de almacenamiento.
     * @param {string} name Nombre del proyecto
     * @returns {Promise<Object>} Proyecto creado
     */
    async createProject(name) {
        if (!name) throw new Error('[StorageSubmodule] Error: Se requiere un nombre para el proyecto.');
        return await this.client.request('/storage/projects', {
            method: 'POST',
            body: { name }
        });
    }

    /**
     * Actualiza el nombre de un proyecto de almacenamiento.
     * @param {number|string} id ID del proyecto
     * @param {string} name Nuevo nombre
     * @returns {Promise<Object>} Resultado
     */
    async updateProject(id, name) {
        if (!id || !name) throw new Error('[StorageSubmodule] Error: Se requiere ID y nombre de proyecto.');
        return await this.client.request(`/storage/projects/${id}`, {
            method: 'PUT',
            body: { name }
        });
    }

    /**
     * Elimina un proyecto de almacenamiento.
     * @param {number|string} id ID del proyecto
     * @returns {Promise<Object>} Resultado
     */
    async deleteProject(id) {
        if (!id) throw new Error('[StorageSubmodule] Error: Se requiere el ID del proyecto.');
        return await this.client.request(`/storage/projects/${id}`, { method: 'DELETE' });
    }

    /**
     * Lista los archivos guardados en un proyecto especifico.
     * @param {number|string} projectId ID del proyecto
     * @returns {Promise<Object>} Lista de archivos
     */
    async listFiles(projectId) {
        if (!projectId) throw new Error('[StorageSubmodule] Error: Se requiere projectId.');
        return await this.client.request(`/storage/projects/${projectId}/files`, { method: 'GET' });
    }

    /**
     * Sube uno o varios archivos a un proyecto.
     * @param {number|string} projectId ID del proyecto
     * @param {Buffer|Blob|FormData} fileData Archivo en Buffer/Blob o un objeto FormData completo
     * @param {string} [filename='file.bin'] Nombre del archivo (si fileData es Buffer)
     * @param {string} [mimeType='application/octet-stream'] Tipo MIME (si fileData es Buffer)
     * @returns {Promise<Object>} Resultado de la subida
     */
    async uploadFile(projectId, fileData, filename = 'file.bin', mimeType = 'application/octet-stream') {
        if (!projectId) throw new Error('[StorageSubmodule] Error: Se requiere projectId.');
        if (!fileData) throw new Error('[StorageSubmodule] Error: Se requieren los datos del archivo.');

        let body;
        if (typeof FormData !== 'undefined' && fileData instanceof FormData) {
            body = fileData;
        } else {
            const formData = new FormData();
            const blob = new Blob([fileData], { type: mimeType });
            formData.append('files', blob, filename);
            body = formData;
        }

        return await this.client.request(`/storage/projects/${projectId}/files`, {
            method: 'POST',
            body,
            isFormData: true
        });
    }

    /**
     * Descarga el contenido binario de un archivo.
     * @param {number|string} fileId ID del archivo
     * @returns {Promise<Buffer>} Buffer del archivo descargado
     */
    async downloadFile(fileId) {
        if (!fileId) throw new Error('[StorageSubmodule] Error: Se requiere fileId.');
        return await this.client.request(`/storage/files/${fileId}`, {
            method: 'GET',
            isBinary: true
        });
    }

    /**
     * Obtiene los metadatos e información de un archivo.
     * @param {number|string} fileId ID del archivo
     * @returns {Promise<Object>} Información del archivo
     */
    async getFileInfo(fileId) {
        if (!fileId) throw new Error('[StorageSubmodule] Error: Se requiere fileId.');
        return await this.client.request(`/storage/files/${fileId}/info`, { method: 'GET' });
    }

    /**
     * Reemplaza el contenido de un archivo existente.
     * @param {number|string} fileId ID del archivo
     * @param {Buffer|Blob|FormData} fileData Nuevo contenido
     * @param {string} [filename='file.bin'] Nombre del archivo
     * @param {string} [mimeType='application/octet-stream'] Tipo MIME
     * @returns {Promise<Object>} Resultado
     */
    async replaceFile(fileId, fileData, filename = 'file.bin', mimeType = 'application/octet-stream') {
        if (!fileId) throw new Error('[StorageSubmodule] Error: Se requiere fileId.');
        if (!fileData) throw new Error('[StorageSubmodule] Error: Se requieren datos del archivo.');

        let body;
        if (typeof FormData !== 'undefined' && fileData instanceof FormData) {
            body = fileData;
        } else {
            const formData = new FormData();
            const blob = new Blob([fileData], { type: mimeType });
            formData.append('files', blob, filename);
            body = formData;
        }

        return await this.client.request(`/storage/files/${fileId}`, {
            method: 'PUT',
            body,
            isFormData: true
        });
    }

    /**
     * Elimina un archivo.
     * @param {number|string} fileId ID del archivo
     * @returns {Promise<Object>} Resultado
     */
    async deleteFile(fileId) {
        if (!fileId) throw new Error('[StorageSubmodule] Error: Se requiere fileId.');
        return await this.client.request(`/storage/files/${fileId}`, { method: 'DELETE' });
    }
}

module.exports = StorageSubmodule;
