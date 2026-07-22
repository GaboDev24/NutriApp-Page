/**
 * Ejemplo completo de uso del SDK SpiderWeb Client.
 * Demuestra las operaciones de los tres submódulos: SQL Database, Storage y SpiderIA.
 */

require('dotenv').config();
const { createClient } = require('./index');

async function main() {
    try {
        console.log('--- 1. Inicializando SpiderWeb SDK ---');
        const sdk = createClient();

        console.log('\n--- 2. Submódulo SQL Database ---');
        // Listar bases de datos
        const dbList = await sdk.sql.listDatabases();
        console.log('Bases de datos encontradas:', dbList.databases ? dbList.databases.length : 0);

        // Listar tablas de la base de datos configurada
        const tableList = await sdk.sql.listTables();
        console.log('Tablas en', process.env.DB_NAME, ':', tableList.tables);

        // Ejecutar consulta SQL de prueba
        const usersResult = await sdk.sql.query(null, 'SELECT id, name, email, role FROM users LIMIT 5');
        console.log('Consulta SQL (users):', usersResult);

        console.log('\n--- 3. Submódulo Storage ---');
        // Listar proyectos
        const projects = await sdk.storage.listProjects();
        console.log('Proyectos de Storage:', projects.projects ? projects.projects.length : 0);

        // Si existe algún proyecto, listar sus archivos
        if (projects.projects && projects.projects.length > 0) {
            const firstProjId = projects.projects[0].id;
            const files = await sdk.storage.listFiles(firstProjId);
            console.log(`Archivos del proyecto ${firstProjId}:`, files);
        }

        console.log('\n--- 4. Submódulo SpiderIA ---');
        // Listar modelos disponibles
        const iaModels = await sdk.ia.listModels();
        console.log('Modelos de IA disponibles:', iaModels.models ? iaModels.models.map(m => m.name || m.id) : []);

        if (iaModels.models && iaModels.models.length > 0) {
            const selectedModelId = iaModels.models[0].id;
            console.log(`Enviando mensaje de prueba al modelo: ${selectedModelId}`);

            const reply = await sdk.ia.chat(selectedModelId, [
                { role: 'system', content: 'Eres un asistente experto en nutrición y salud.' },
                { role: 'user', content: 'Dame un consejo breve para mejorar la hidratación diaria.' }
            ]);

            console.log('Respuesta del modelo:', reply.message ? reply.message.content : reply);
            console.log('Uso de tokens:', reply.usage);
        }

        // Consultar cuota y uso diario
        const usageInfo = await sdk.ia.getUsage();
        console.log('Uso de SpiderIA:', usageInfo);

        console.log('\n--- Demostración del SDK completada con éxito ---');
    } catch (error) {
        console.error('Error durante la ejecución del ejemplo:', error.message);
    }
}

main();
