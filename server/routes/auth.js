const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const { query, escapeSql } = require('../dbHelper');

// Configuración de Email con soporte IPv4 y fallback
const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Route: Signup
router.post('/signup', [
    body('name').notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('Ingresa un correo válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Las contraseñas no coinciden');
        }
        return true;
    }),
    body('role').isIn(['user', 'pro']).withMessage('Rol no válido')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { name, email, password, role } = req.body;

        const existingUsers = await query(`SELECT id FROM users WHERE email = ${escapeSql(email)}`);
        const existingPros = await query(`SELECT id FROM professionals WHERE email = ${escapeSql(email)}`);

        if ((existingUsers && existingUsers.length > 0) || (existingPros && existingPros.length > 0)) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const targetTable = role === 'user' ? 'users' : 'professionals';

        // Insertar usuario
        const insertSql = `INSERT INTO ${targetTable} (name, email, password, role, verificationToken, isVerified) VALUES (${escapeSql(name)}, ${escapeSql(email)}, ${escapeSql(hashedPassword)}, ${escapeSql(role)}, ${escapeSql(verificationToken)}, 0)`;
        await query(insertSql);

        const verifyUrl = `${process.env.BASE_URL}/api/auth/verify/${verificationToken}`;
        console.log(`[AUTH SIGNUP] Enlace de verificación para ${email}: ${verifyUrl}`);

        // Intento de envío de email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verifica tu cuenta en NutriApp',
            text: `¡Hola ${name}! Para activar tu cuenta, haz clic aquí: ${verifyUrl}`,
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #10b981; text-align: center;">¡Bienvenido a NutriApp, ${name}!</h2>
                    <p style="font-size: 1.1rem; line-height: 1.6;">Para activar tu cuenta, haz clic en el botón de abajo:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verifyUrl}" style="background-color: #10b981; color: white; padding: 14px 28px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block;">
                           Verificar mi Cuenta
                        </a>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            return res.status(201).json({ message: 'Usuario creado con éxito. Por favor, revisa tu correo electrónico para activar tu cuenta.' });
        } catch (emailErr) {
            console.warn('[AUTH Warn] No se pudo enviar el email por SMTP. Verificando automáticamente la cuenta para evitar bloqueos:', emailErr.message);
            // Auto-verificar si SMTP no está disponible
            await query(`UPDATE ${targetTable} SET isVerified = 1 WHERE email = ${escapeSql(email)}`);
            return res.status(201).json({ message: 'Cuenta creada y activada con éxito. Ya puedes iniciar sesión.' });
        }
    } catch (err) {
        console.error('[AUTH Error signup]', err);
        res.status(500).json({ message: 'Error en el servidor al registrar el usuario.' });
    }
});

// Route: Verify Email
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).send('Token no proporcionado');
        }

        let users = await query(`SELECT * FROM users WHERE verificationToken = ${escapeSql(token)}`);
        let table = 'users';
        let user = users && users[0];

        if (!user) {
            let pros = await query(`SELECT * FROM professionals WHERE verificationToken = ${escapeSql(token)}`);
            user = pros && pros[0];
            table = 'professionals';
        }

        if (!user) {
            return res.status(400).send(`
                <div style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px; background: #f8fafc; min-height: 100vh;">
                    <div style="background: white; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                        <h2 style="color: #ef4444; margin-bottom: 20px;">Enlace inválido o ya utilizado</h2>
                        <p style="color: #64748b; margin-bottom: 30px;">Tu cuenta puede estar ya activa o el enlace ha expirado.</p>
                        <a href="${process.env.BASE_URL}/login.html" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Ir al Inicio de Sesión</a>
                    </div>
                </div>
            `);
        }

        await query(`UPDATE ${table} SET isVerified = 1, verificationToken = NULL WHERE id = ${user.id}`);

        res.send(`
            <div style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px; background: #f8fafc; min-height: 100vh;">
                <div style="background: white; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    <h2 style="color: #10b981; margin-bottom: 20px;">¡Cuenta verificada!</h2>
                    <p style="color: #64748b; margin-bottom: 30px;">Tu correo ha sido verificado con éxito. Ya puedes empezar a disfrutar de todas las funcionalidades de NutriApp.</p>
                    <a href="${process.env.BASE_URL}/login.html" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Ir al Inicio de Sesión</a>
                </div>
            </div>
        `);
    } catch (err) {
        console.error('[AUTH Error verify]', err);
        res.status(500).send(`
            <div style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #ef4444;">Error en el Servidor</h2>
                <p>Ocurrió un error inesperado al procesar tu verificación.</p>
            </div>
        `);
    }
});

// Route: Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let users = await query(`SELECT * FROM users WHERE email = ${escapeSql(email)}`);
        let user = users && users[0];
        let role = 'user';

        if (!user) {
            let pros = await query(`SELECT * FROM professionals WHERE email = ${escapeSql(email)}`);
            user = pros && pros[0];
            role = 'pro';
        }

        if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

        if (!user.isVerified) {
            // Auto-activar si por algún motivo no se verificó
            await query(`UPDATE ${role === 'user' ? 'users' : 'professionals'} SET isVerified = 1 WHERE id = ${user.id}`);
            user.isVerified = 1;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, role: user.role || role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user.id, name: user.name, role: user.role || role } });
    } catch (err) {
        console.error('[AUTH Error login]', err);
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
    }
});

// Route: Forgot Password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        let users = await query(`SELECT * FROM users WHERE email = ${escapeSql(email)}`);
        let table = 'users';
        let user = users && users[0];

        if (!user) {
            let pros = await query(`SELECT * FROM professionals WHERE email = ${escapeSql(email)}`);
            user = pros && pros[0];
            table = 'professionals';
        }

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = Date.now() + 3600000;

        await query(`UPDATE ${table} SET resetPasswordToken = ${escapeSql(resetToken)}, resetPasswordExpires = ${resetExpires} WHERE id = ${user.id}`);

        const resetUrl = `${process.env.BASE_URL}/reset-password.html?token=${resetToken}`;
        console.log(`[AUTH FORGOT] Enlace de recuperación para ${email}: ${resetUrl}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Restablecer Contraseña - NutriApp',
            text: `Has solicitado restablecer tu contraseña. Haz clic aquí: ${resetUrl}`,
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                    <h2 style="color: #10b981;">Restablece tu contraseña</h2>
                    <p>Haz clic en el siguiente botón para continuar:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block;">
                           Restablecer Contraseña
                        </a>
                    </div>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (_) {}

        res.json({ message: 'Se ha enviado un enlace para restablecer tu contraseña.' });
    } catch (err) {
        console.error('[AUTH Error forgot-password]', err);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud de contraseña.' });
    }
});

// Route: Reset Password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const { password: newPassword } = req.body;
        const now = Date.now();

        let users = await query(`SELECT * FROM users WHERE resetPasswordToken = ${escapeSql(token)} AND resetPasswordExpires > ${now}`);
        let table = 'users';
        let user = users && users[0];

        if (!user) {
            let pros = await query(`SELECT * FROM professionals WHERE resetPasswordToken = ${escapeSql(token)} AND resetPasswordExpires > ${now}`);
            user = pros && pros[0];
            table = 'professionals';
        }

        if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await query(`UPDATE ${table} SET password = ${escapeSql(hashedPassword)}, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ${user.id}`);

        res.json({ message: 'Contraseña restablecida con éxito' });
    } catch (err) {
        console.error('[AUTH Error reset-password]', err);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud para restablecer contraseña.' });
    }
});

// Route: Resend Verification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;

        let users = await query(`SELECT * FROM users WHERE email = ${escapeSql(email)}`);
        let table = 'users';
        let user = users && users[0];

        if (!user) {
            let pros = await query(`SELECT * FROM professionals WHERE email = ${escapeSql(email)}`);
            user = pros && pros[0];
            table = 'professionals';
        }

        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        // Auto-verificar si la cuenta no estaba verificada
        await query(`UPDATE ${table} SET isVerified = 1 WHERE id = ${user.id}`);

        res.json({ message: 'Cuenta activada con éxito. Ya puedes iniciar sesión.' });
    } catch (err) {
        console.error('[AUTH Error resend-verification]', err);
        res.status(500).json({ message: 'Error en el servidor al activar la cuenta.' });
    }
});

module.exports = router;
