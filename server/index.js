require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const initDatabase = require('./dbInit');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Dynamic avatar route fallback for serverless (/tmp folder)
app.get('/uploads/avatars/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const localPath = path.join(__dirname, '../public/uploads/avatars', filename);
    const tmpPath = path.join(os.tmpdir(), 'uploads/avatars', filename);

    if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
    } else if (fs.existsSync(tmpPath)) {
        return res.sendFile(tmpPath);
    }
    res.status(404).send('Imagen no encontrada');
});

// Lazy DB Schema Init on First Request (for Vercel serverless functions)
let dbInitialized = false;
app.use(async (req, res, next) => {
    if (!dbInitialized) {
        try {
            await initDatabase();
            dbInitialized = true;
        } catch (err) {
            console.error('[DB INIT ERROR]', err);
        }
    }
    next();
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NutriApp API (SpiderWeb SQL Engine) en funcionamiento en Vercel' });
});

// API Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const proRoutes = require('./routes/professional');
const publicRoutes = require('./routes/public');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pro', proRoutes);
app.use('/api/public', publicRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[EXPRESS UNCAUGHT ERROR]', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ message: err.message || 'Error interno del servidor.' });
});

// Process Protection
process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT EXCEPTION]', err);
});

// Start listener only when running locally (not on Vercel)
if (require.main === module || (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n=========================================`);
        console.log(`  NUTRIAPP SERVER v2.0 - SPIDERWEB SQL   `);
        console.log(`  Puerto: http://localhost:${PORT}      `);
        console.log(`  Hora: ${new Date().toLocaleTimeString()} `);
        console.log(`=========================================\n`);
    });
}

module.exports = app;
