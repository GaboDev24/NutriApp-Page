document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resendVerificationForm = document.getElementById('resendVerificationForm');
    const notification = document.getElementById('notification');

    // Setup password visibility toggles
    document.querySelectorAll('.password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            if (!input) return;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.setAttribute('aria-label', isPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
            btn.classList.toggle('is-visible', isPassword);
            input.focus();
        });
    });

    function showNotification(message, type = 'success') {
        if (!notification) return;
        const iconSvg = type === 'success'
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
        notification.innerHTML = `${iconSvg}<span>${message}</span>`;
        notification.className = `notification ${type}`;
        notification.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setButtonLoading(button, isLoading, loadingText = 'Procesando...') {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.innerHTML;
            button.disabled = true;
            button.setAttribute('aria-busy', 'true');
            button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${loadingText}`;
        } else {
            button.disabled = false;
            button.removeAttribute('aria-busy');
            button.innerHTML = button.dataset.originalText || button.innerHTML;
        }
    }

    // Signup logic
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = signupForm.querySelector('button[type="submit"]');

            const name = signupForm.name.value.trim();
            const email = signupForm.email.value.trim();
            const password = signupForm.password.value;
            const confirmPassword = signupForm.confirmPassword.value;
            const role = signupForm.role.value;

            if (!name || !email || !password || !confirmPassword || !role) {
                showNotification('Por favor completa todos los campos requeridos.', 'error');
                return;
            }

            if (password.length < 6) {
                showNotification('La contraseña debe tener un mínimo de 6 caracteres.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showNotification('Las contraseñas no coinciden. Por favor verifícalas.', 'error');
                return;
            }

            setButtonLoading(submitBtn, true, 'Creando cuenta...');

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, confirmPassword, role })
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message || 'Cuenta creada con éxito. Por favor revisa tu correo para activarla.', 'success');
                    signupForm.reset();
                } else {
                    const errorMsg = result.message || (result.errors && result.errors[0] && result.errors[0].msg) || 'No se pudo crear la cuenta.';
                    showNotification(errorMsg, 'error');
                }
            } catch (err) {
                console.error('Error en el registro:', err);
                showNotification('Ocurrió un error al conectar con el servidor. Inténtalo de nuevo más tarde.', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // Login logic
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            const email = loginForm.email.value.trim();
            const password = loginForm.password.value;

            if (!email || !password) {
                showNotification('Por favor ingresa tu correo y contraseña.', 'error');
                return;
            }

            setButtonLoading(submitBtn, true, 'Iniciando sesión...');

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification('Inicio de sesión correcto. Redirigiendo...', 'success');
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    setTimeout(() => {
                        window.location.href = result.user.role === 'pro' ? 'pro-dashboard.html' : 'user-dashboard.html';
                    }, 800);
                } else {
                    showNotification(result.message || 'Credenciales inválidas.', 'error');
                    setButtonLoading(submitBtn, false);
                }
            } catch (err) {
                console.error('Error en inicio de sesión:', err);
                showNotification('Error al intentar iniciar sesión. Comprueba tu conexión e inténtalo de nuevo.', 'error');
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // Forgot Password logic
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = forgotPasswordForm.querySelector('button[type="submit"]');
            const email = forgotPasswordForm.email.value.trim();

            if (!email) {
                showNotification('Por favor ingresa tu correo electrónico.', 'error');
                return;
            }

            setButtonLoading(submitBtn, true, 'Enviando enlace...');

            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message || 'Enlace de recuperación enviado. Revisa tu bandeja de entrada.', 'success');
                    forgotPasswordForm.reset();
                } else {
                    showNotification(result.message || 'No se pudo enviar el enlace.', 'error');
                }
            } catch (err) {
                console.error('Error en recuperar contraseña:', err);
                showNotification('Error al enviar el enlace. Por favor verifica tu correo e inténtalo de nuevo.', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // Resend Verification logic
    if (resendVerificationForm) {
        resendVerificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = resendVerificationForm.querySelector('button[type="submit"]');
            const email = resendVerificationForm.email.value.trim();

            if (!email) {
                showNotification('Por favor ingresa tu correo electrónico.', 'error');
                return;
            }

            setButtonLoading(submitBtn, true, 'Reenviando correo...');

            try {
                const response = await fetch('/api/auth/resend-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message || 'Correo de activación reenviado correctamente. Revisa tu bandeja.', 'success');
                    resendVerificationForm.reset();
                } else {
                    showNotification(result.message || 'No se pudo reenviar el correo de activación.', 'error');
                }
            } catch (err) {
                console.error('Error en reenviar verificación:', err);
                showNotification('No se pudo completar el reenvío del correo. Por favor inténtalo de nuevo en unos momentos.', 'error');
            } finally {
                setButtonLoading(submitBtn, false);
            }
        });
    }
});
