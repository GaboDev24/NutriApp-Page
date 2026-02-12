document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    const resendVerificationForm = document.getElementById('resendVerificationForm');

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
                alert(result.message || (result.errors && result.errors[0].msg));
            } catch (err) {
                alert('Error al registrar usuario');
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
                    alert(result.message);
                }
            } catch (err) {
                alert('Error al iniciar sesión');
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
                alert(result.message);
            } catch (err) {
                alert('Error al enviar enlace');
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
                alert(result.message);
            } catch (err) {
                alert('Error al reenviar correo');
            }
        });
    }
});
