/**
 * Inicializador de esquema de Base de Datos SQL en SpiderWeb API.
 * Crea las tablas necesarias para NutriApp si no existen.
 */

const { createClient } = require('../api-client');

async function initDatabase() {
    const sdk = createClient();
    console.log('[DB INIT] Verificando e inicializando tablas en SpiderWeb SQL DB...');

    const tablesQueries = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'user',
            height FLOAT NULL,
            weight FLOAT NULL,
            age INT NULL,
            gender VARCHAR(50) NULL,
            goal VARCHAR(100) NULL,
            lifestyle VARCHAR(255) NULL,
            allergies TEXT NULL,
            medical_conditions TEXT NULL,
            phone VARCHAR(50) NULL,
            profile_picture TEXT NULL,
            assignedProfessional INT NULL,
            routine_id INT NULL,
            verificationToken VARCHAR(255) NULL,
            isVerified TINYINT(1) DEFAULT 0,
            resetPasswordToken VARCHAR(255) NULL,
            resetPasswordExpires BIGINT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS professionals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'pro',
            specialization VARCHAR(255) NULL,
            description TEXT NULL,
            bio TEXT NULL,
            experience VARCHAR(255) NULL,
            education VARCHAR(255) NULL,
            patients TEXT NULL,
            pendingRequests TEXT NULL,
            verificationToken VARCHAR(255) NULL,
            isVerified TINYINT(1) DEFAULT 0,
            resetPasswordToken VARCHAR(255) NULL,
            resetPasswordExpires BIGINT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS routines (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            meals TEXT NULL,
            recommendations TEXT NULL,
            lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS progress (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL,
            weight FLOAT NOT NULL,
            notes TEXT NULL,
            mealsConsumed TEXT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP
        );`,
        `CREATE TABLE IF NOT EXISTS messages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender INT NOT NULL,
            senderModel VARCHAR(50) NOT NULL,
            recipient INT NOT NULL,
            recipientModel VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );`
    ];

    for (const query of tablesQueries) {
        try {
            await sdk.sql.query(null, query);
        } catch (err) {
            console.error('[DB INIT Error]', err.message);
        }
    }

    // Safe column additions for pre-existing databases
    const alterQueries = [
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS age INT NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50) NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS goal VARCHAR(100) NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS allergies TEXT NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS medical_conditions TEXT NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) NULL`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT NULL`,
        `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS profile_picture TEXT NULL`,
    ];

    for (const altQuery of alterQueries) {
        try {
            await sdk.sql.query(null, altQuery);
        } catch (err) {
            // Column may already exist, ignore error
        }
    }

    console.log('[DB INIT] Tablas verificadas y listas.');
}

module.exports = initDatabase;
