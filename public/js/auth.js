document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resendVerificationForm = document.getElementById('resendVerificationForm');
    const notification = document.getElementById('notification');

    function showNotification(message, type = 'success') {
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification ${type}`;
    }

    // Signup logic
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                name: signupForm.name.value,
                email: signupForm.email.value,
                password: signupForm.password.value,
                confirmPassword: signupForm.confirmPassword.value,
                role: signupForm.role.value
            };

            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message, 'success');
                } else {
                    showNotification(result.message || (result.errors && result.errors[0].msg), 'error');
                }
            } catch (err) {
                console.error('Error en el registro:', err);
                showNotification('Ocurrió un error al intentar conectarse con el servidor. Por favor, inténtalo de nuevo más tarde.', 'error');
            }
        });
    }

    // Login logic
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                email: loginForm.email.value,
                password: loginForm.password.value
            };

            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    localStorage.setItem('token', result.token);
                    localStorage.setItem('user', JSON.stringify(result.user));
                    window.location.href = result.user.role === 'pro' ? 'pro-dashboard.html' : 'user-dashboard.html';
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (err) {
                console.error('Error en inicio de sesión:', err);
                showNotification('Error al intentar iniciar sesión. Por favor, comprueba tu conexión e inténtalo de nuevo.', 'error');
            }
        });
    }

    // Forgot Password logic
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { email: forgotPasswordForm.email.value };

            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message, 'success');
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (err) {
                console.error('Error en recuperar contraseña:', err);
                showNotification('Error al enviar el enlace de recuperación. Por favor, verifica tu correo e inténtalo de nuevo.', 'error');
            }
        });
    }

    // Resend Verification logic
    if (resendVerificationForm) {
        resendVerificationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = { email: resendVerificationForm.email.value };

            try {
                const response = await fetch('/api/auth/resend-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (response.ok) {
                    showNotification(result.message, 'success');
                } else {
                    showNotification(result.message, 'error');
                }
            } catch (err) {
                console.error('Error en reenviar verificación:', err);
                showNotification('No se pudo completar el reenvío del correo. Por favor, inténtalo de nuevo en unos momentos.', 'error');
            }
        });
    }
});
