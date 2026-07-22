require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const initDatabase = require('./dbInit');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar esquemas de base de datos SQL SpiderWeb
initDatabase().catch(err => console.error('[DB INIT FATAL]', err));

// Rutas API
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'NutriApp API (SpiderWeb SQL Engine) en funcionamiento' });
});

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const proRoutes = require('./routes/professional');
const publicRoutes = require('./routes/public');

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/pro', proRoutes);
app.use('/api/public', publicRoutes);

// Producción (Vercel)
if (process.env.NODE_ENV === 'production') {
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(__dirname, '../public/index.html'));
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n=========================================`);
    console.log(`  NUTRIAPP SERVER v2.0 - SPIDERWEB SQL   `);
    console.log(`  Puerto: http://localhost:${PORT}      `);
    console.log(`  Hora: ${new Date().toLocaleTimeString()} `);
    console.log(`=========================================\n`);
});

module.exports = app;
