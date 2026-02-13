document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || user.role !== 'user') {
        window.location.href = 'login.html';
        return;
    }

    const notification = document.getElementById('notification');

    function showNotification(message, type = 'success') {
        if (!notification) return;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        setTimeout(() => { notification.className = 'notification'; }, 5000);
    }

    document.getElementById('userName').textContent = user.name;

    // Fetch user details
    const fetchUser = async () => {
        const response = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await response.json();

        if (!userData.height || !userData.weight) {
            document.getElementById('onboarding').style.display = 'block';
            document.getElementById('overview').style.display = 'none';
        } else {
            document.getElementById('userWeight').textContent = userData.weight;
            // Basic calorie calculation logic could be here or on server
            renderRoutine(userData.routine);
        }
    };

    const renderRoutine = (routine) => {
        if (!routine) return;
        const list = document.getElementById('routineList');

        let html = '';
        if (routine.meals && routine.meals.length > 0) {
            html += routine.meals.map(meal => `
                <div style="display: flex; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #f1f5f9;">
                    <div><strong>${meal.time}</strong> - ${meal.description}</div>
                    <div>${meal.calories} kcal</div>
                </div>
            `).join('');
        } else {
            html += '<p>No hay comidas asignadas.</p>';
        }

        if (routine.recommendations) {
            html += `
                <div style="margin-top: 1.5rem; padding: 1rem; background: #fff7ed; border: 1px solid #ffedd5; border-radius: 0.5rem;">
                    <strong>Recomendaciones:</strong>
                    <p>${routine.recommendations}</p>
                </div>
            `;
        }

        list.innerHTML = html;
    };

    // Onboarding flow
    const onboardingForm = document.getElementById('onboardingForm');
    if (onboardingForm) {
        onboardingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                height: onboardingForm.height.value,
                weight: onboardingForm.weight.value,
                lifestyle: onboardingForm.lifestyle.value
            };

            const response = await fetch('/api/user/setup-routine', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                location.reload();
            }
        });
    }

    const fetchPros = async () => {
        const response = await fetch('/api/user/professionals', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pros = await response.json();
        const list = document.getElementById('prosList');
        if (list) {
            list.innerHTML = pros.map(pro => `
                <div class="patient-item">
                    <div><strong>${pro.name}</strong><br><small>${pro.specialization || 'Especialista'}</small></div>
                    <button onclick="requestPro('${pro._id}')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Solicitar</button>
                </div>
            `).join('');
        }
    };

    window.requestPro = async (proId) => {
        const response = await fetch('/api/user/request-professional', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ proId })
        });
        if (response.ok) {
            showNotification('Solicitud enviada con éxito');
        } else {
            const res = await response.json();
            showNotification(res.message, 'error');
        }
    };

    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
        progressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                weight: progressForm.currentWeight.value,
                notes: progressForm.dayNotes.value
            };

            const response = await fetch('/api/user/log-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showNotification('¡Progreso guardado con éxito!');
                setTimeout(() => location.reload(), 1500);
            } else {
                showNotification('Error al guardar progreso', 'error');
            }
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // Messaging Logic
    const chatBox = document.getElementById('chatBox');
    const chatForm = document.getElementById('chatForm');

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/user/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await response.json();

            if (messages.length > 0) {
                chatBox.innerHTML = messages.map(msg => `
                    <div style="align-self: ${msg.sender === user.id ? 'flex-end' : 'flex-start'}; 
                                background: ${msg.sender === user.id ? 'var(--primary)' : '#e2e8f0'}; 
                                color: ${msg.sender === user.id ? 'white' : 'var(--dark)'}; 
                                padding: 0.5rem 1rem; 
                                border-radius: 1rem; 
                                max-width: 70%; 
                                margin-bottom: 0.5rem;">
                        <small style="display:block; opacity: 0.8; font-size: 0.7em;">${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                        ${msg.content}
                    </div>
                `).join('');
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('messageInput');
            const content = input.value.trim();
            if (!content) return;

            try {
                const response = await fetch('/api/user/message', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });

                if (response.ok) {
                    input.value = '';
                    fetchMessages(); // Refresh messages
                }
            } catch (error) {
                console.error('Error sending message:', error);
            }
        });
    }

    fetchUser();
    fetchPros();
    fetchMessages();
});
