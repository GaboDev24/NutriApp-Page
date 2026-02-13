const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Professional = require('../models/Professional');

// Email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Signup Route
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

        let existingUser = await User.findOne({ email });
        let existingPro = await Professional.findOne({ email });
        if (existingUser || existingPro) return res.status(400).json({ message: 'El usuario ya existe' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        console.log(`[DEBUG AUTH] Token de verificación generado: ${verificationToken}`);
        console.log(`[DEBUG AUTH] URL de verificación completa: ${process.env.BASE_URL}/api/auth/verify/${verificationToken}`);

        let newUser;
        const userData = {
            name,
            email,
            password: hashedPassword,
            verificationToken,
            isVerified: false,
            role
        };

        if (role === 'user') {
            newUser = new User(userData);
        } else {
            newUser = new Professional(userData);
        }

        console.log(`[DEBUG AUTH] Preparando guardado de ${role}:`, JSON.stringify(newUser, null, 2));

        try {
            const savedUser = await newUser.save();
            console.log(`[DEBUG AUTH] Guardado exitoso en MongoDB:`, JSON.stringify(savedUser, null, 2));
            console.log(`[DEBUG AUTH] Verificando campos críticos guardados:`);
            console.log(`  - verificationToken: ${savedUser.verificationToken ? 'Presente' : 'AUSENTE'}`);
            console.log(`  - isVerified: ${savedUser.isVerified}`);
            console.log(`  - email: ${savedUser.email}`);
        } catch (saveErr) {
            console.error(`[DEBUG AUTH] Error al guardar en MongoDB:`, saveErr);
            throw saveErr;
        }

        // Send verification email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verifica tu cuenta en NutriApp',
            text: `¡Hola ${name}! Gracias por unirte a NutriApp. Para activar tu cuenta, haz clic en el siguiente enlace: ${process.env.BASE_URL}/api/auth/verify/${verificationToken}`,
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background-color: #ffffff; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #10b981; text-align: center;">¡Bienvenido a NutriApp, ${name}!</h2>
                    <p style="font-size: 1.1rem; line-height: 1.6;">Estamos muy emocionados de tenerte aquí. Para empezar a usar la plataforma y alcanzar tus objetivos de bienestar, por favor activa tu cuenta haciendo clic en el botón de abajo:</p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${process.env.BASE_URL}/api/auth/verify/${verificationToken}" 
                           style="background-color: #10b981; color: white; padding: 15px 30px; border-radius: 50px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">
                           Verificar mi Cuenta
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>
                    <p style="color: #64748b; font-size: 0.8rem; word-break: break-all; background: #f1f5f9; padding: 10px; border-radius: 5px;">${process.env.BASE_URL}/api/auth/verify/${verificationToken}</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                    <p style="font-size: 0.8rem; color: #94a3b8; text-align: center;">Si no creaste esta cuenta, puedes ignorar este mensaje con seguridad.</p>
                </div>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`[DEBUG AUTH] Email de verificación enviado exitosamente a: ${email}`);
        } catch (emailErr) {
            console.error(`[DEBUG AUTH] Error al enviar email de verificación:`, emailErr);
            // Usuario ya fue creado, solo informamos del problema con el email
            return res.status(201).json({
                message: 'Usuario creado, pero hubo un problema al enviar el correo de verificación. Por favor, solicita reenviar el correo.'
            });
        }

        res.status(201).json({ message: 'Usuario creado con éxito. Por favor, revisa tu correo electrónico para activar tu cuenta.' });
    } catch (err) {
        console.error('Error en signup:', err);
        res.status(500).json({ message: 'Error en el servidor al registrar el usuario.' });
    }
});

// Verify Email Route
router.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`[VERIFICACIÓN] Intento de verificación con token: ${token}`);

        if (!token) {
            console.error('[VERIFICACIÓN] Token no proporcionado en la URL');
            return res.status(400).send('Token no proporcionado');
        }

        // Buscar en ambas colecciones
        let user = await User.findOne({ verificationToken: token });
        let modelType = 'User';

        if (!user) {
            user = await Professional.findOne({ verificationToken: token });
            modelType = 'Professional';
        }

        if (!user) {
            console.warn(`[VERIFICACIÓN] Token no encontrado en ninguna colección: ${token}`);
            return res.status(400).send(`
                <div style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px; background: #f8fafc; min-height: 100vh;">
                    <div style="background: white; padding: 40px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                        <h2 style="color: #ef4444; margin-bottom: 20px;">Enlace inválido o expirado</h2>
                        <p style="color: #64748b; margin-bottom: 30px;">Lo sentimos, no pudimos verificar tu cuenta. Es posible que el enlace ya haya sido usado o que haya expirado.</p>
                        <a href="${process.env.BASE_URL}/resend-verification.html" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Reenviar correo de verificación</a>
                    </div>
                </div>
            `);
        }

        console.log(`[VERIFICACIÓN] Usuario encontrado (${modelType}): ${user.email}. Procediendo a verificar.`);

        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();

        console.log(`[VERIFICACIÓN] Cuenta verificada con éxito para: ${user.email}`);

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
        console.error('[VERIFICACIÓN] Error interno:', err);
        res.status(500).send(`
            <div style="font-family: 'Outfit', sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #ef4444;">Error en el Servidor</h2>
                <p>Ocurrió un error inesperado al procesar tu verificación. Por favor, inténtalo de nuevo más tarde.</p>
            </div>
        `);
    }
});

// Login Route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email }) || await Professional.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Credenciales inválidas' });

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Tu cuenta aún no ha sido verificada. Por favor, revisa tu correo.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
    } catch (err) {
        res.status(500).json({ message: 'Error en el servidor al iniciar sesión' });
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email }) || await Professional.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Restablecer Contraseña - NutriApp',
            text: `Has solicitado restablecer tu contraseña. Haz clic aquí: ${process.env.BASE_URL}/reset-password.html?token=${resetToken}`,
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                    <h2 style="color: #10b981;">Restablece tu contraseña</h2>
                    <p>Has solicitado restablecer la contraseña de tu cuenta en NutriApp. Haz clic en el siguiente botón para continuar:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.BASE_URL}/reset-password.html?token=${resetToken}" 
                           style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block;">
                           Restablecer Contraseña
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem;">Este enlace expirará en 1 hora por razones de seguridad.</p>
                    <p style="color: #64748b; font-size: 0.8rem;">Si no solicitaste este cambio, puedes ignorar este correo y tu contraseña permanecerá igual.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'Se ha enviado un enlace a tu correo electrónico para restablecer tu contraseña. Por favor, revisa tu bandeja de entrada.' });
    } catch (err) {
        console.error('Error en forgot-password:', err);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud de contraseña.' });
    }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.params; // Fix: password is in body, not params
        const user = await User.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        }) || await Professional.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) return res.status(400).json({ message: 'Token inválido o expirado' });

        const { password: newPassword } = req.body;
        user.password = await bcrypt.hash(newPassword, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Contraseña restablecida con éxito' });
    } catch (err) {
        console.error('Error en reset-password:', err);
        res.status(500).json({ message: 'Error en el servidor al procesar la solicitud para restablecer contraseña.' });
    }
});

// Resend Verification Email
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email }) || await Professional.findOne({ email });
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
        if (user.isVerified) return res.status(400).json({ message: 'La cuenta ya está verificada' });

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verifica tu cuenta en NutriApp',
            text: `¡Hola de nuevo! Para activar tu cuenta, haz clic en: ${process.env.BASE_URL}/api/auth/verify/${verificationToken}`,
            html: `
                <div style="font-family: 'Outfit', sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                    <h2 style="color: #10b981;">Activa tu cuenta de NutriApp</h2>
                    <p>Has solicitado el reenvío del correo de verificación. Para activar tu cuenta y empezar a usar la plataforma, por favor haz clic en el botón de abajo:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.BASE_URL}/api/auth/verify/${verificationToken}" 
                           style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: bold; display: inline-block;">
                           Verificar mi Cuenta
                        </a>
                    </div>
                    <p style="color: #64748b; font-size: 0.9rem;">Si no reconoces esta acción, puedes ignorar este correo.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;">
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: 'El correo de verificación ha sido reenviado con éxito. Por favor, revisa tu correo electrónico.' });
    } catch (err) {
        console.error('Error en resend-verification:', err);
        res.status(500).json({ message: 'Error en el servidor al reenviar el correo de verificación.' });
    }
});

module.exports = router;
