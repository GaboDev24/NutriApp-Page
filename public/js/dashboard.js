document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'user') {
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

    // Set user name
    const nameEl = document.getElementById('userName');
    const sidebarNameEl = document.getElementById('sidebarName');
    if (nameEl) nameEl.textContent = user.name;
    if (sidebarNameEl) sidebarNameEl.textContent = user.name;

    // ---------------------------------------------------------------
    // GOAL LABEL HELPER
    // ---------------------------------------------------------------
    const goalLabels = {
        lose_weight: 'Bajar peso',
        maintain: 'Mantener peso',
        gain_weight: 'Subir peso',
        muscle_gain: 'Ganar músculo',
        improve_health: 'Mejorar salud',
        sports_performance: 'Rendimiento deportivo'
    };

    const lifestyleLabels = {
        sedentary: 'Sedentario',
        lightly_active: 'Actividad ligera',
        moderately_active: 'Moderado',
        very_active: 'Intenso',
        extra_active: 'Muy intenso'
    };

    // Update Avatar image or initials in sidebar
    const updateUserAvatar = (profilePic, name) => {
        const container = document.getElementById('userAvatarContainer');
        const previewEl = document.getElementById('avatarPreviewContainer');
        const initialsPreviewEl = document.getElementById('avatarPreviewInitials');
        if (!container) return;

        const initials = (name || user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

        if (profilePic && profilePic.trim()) {
            container.innerHTML = `<img src="${profilePic.trim()}" alt="Foto de Perfil" style="width:100%; height:100%; object-fit:cover;">`;
            if (previewEl) previewEl.innerHTML = `<img src="${profilePic.trim()}" alt="Foto de Perfil" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            container.innerHTML = `<span>${initials}</span>`;
            if (previewEl) { previewEl.innerHTML = `<span id="avatarPreviewInitials">${initials}</span>`; }
        }
    };

    // Avatar file input — uploads immediately on selection
    const avatarInput = document.getElementById('avatarFileInput');
    const avatarStatus = document.getElementById('avatarUploadStatus');

    if (avatarInput) {
        avatarInput.addEventListener('change', async () => {
            const file = avatarInput.files[0];
            if (!file) return;

            // Show local preview instantly
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewEl = document.getElementById('avatarPreviewContainer');
                const container = document.getElementById('userAvatarContainer');
                if (previewEl) previewEl.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                if (container) container.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            reader.readAsDataURL(file);

            // Upload to server
            if (avatarStatus) { avatarStatus.style.display = 'block'; avatarStatus.textContent = 'Subiendo...'; avatarStatus.style.color = 'var(--text-muted)'; }

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const res = await fetch('/api/user/upload-avatar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await res.json();

                if (res.ok) {
                    if (avatarStatus) { avatarStatus.textContent = 'Foto actualizada correctamente.'; avatarStatus.style.color = 'var(--secondary-dark)'; }
                    // Update sidebar with server URL
                    const container = document.getElementById('userAvatarContainer');
                    if (container) container.innerHTML = `<img src="${data.url}" style="width:100%; height:100%; object-fit:cover;">`;
                    const previewEl = document.getElementById('avatarPreviewContainer');
                    if (previewEl) previewEl.innerHTML = `<img src="${data.url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                } else {
                    if (avatarStatus) { avatarStatus.textContent = data.message || 'Error al subir la foto.'; avatarStatus.style.color = '#dc2626'; }
                }
            } catch (err) {
                if (avatarStatus) { avatarStatus.textContent = 'Error de conexion.'; avatarStatus.style.color = '#dc2626'; }
            }
        });
    }

    // Calculate IMC (Body Mass Index)
    const calculateIMC = (weight, height) => {
        const imcEl = document.getElementById('userIMC');
        const badgeEl = document.getElementById('userIMCBadge');
        if (!imcEl || !badgeEl) return;

        if (!weight || !height || height <= 0) {
            imcEl.textContent = '--';
            badgeEl.innerHTML = '<span class="status-badge no-routine">Sin datos</span>';
            return;
        }

        const heightM = height / 100;
        const imc = (weight / (heightM * heightM)).toFixed(1);
        imcEl.textContent = imc;

        let badgeHtml = '';
        if (imc < 18.5) {
            badgeHtml = '<span class="status-badge pending">Bajo peso</span>';
        } else if (imc >= 18.5 && imc <= 24.9) {
            badgeHtml = '<span class="status-badge active">Peso saludable</span>';
        } else if (imc >= 25.0 && imc <= 29.9) {
            badgeHtml = '<span class="status-badge pending">Sobrepeso</span>';
        } else {
            badgeHtml = '<span class="status-badge" style="background:#fef2f2; color:#dc2626; border:1px solid #fecaca;">Obesidad</span>';
        }
        badgeEl.innerHTML = badgeHtml;
    };

    // ---------------------------------------------------------------
    // FETCH USER PROFILE
    // ---------------------------------------------------------------
    const fetchUser = async () => {
        try {
            const response = await fetch('/api/user/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userData = await response.json();

            // Avatar
            updateUserAvatar(userData.profile_picture, userData.name);

            // Metrics
            const weightEl = document.getElementById('userWeight');
            const heightEl = document.getElementById('userHeight');
            const goalEl   = document.getElementById('userGoal');
            if (weightEl) weightEl.textContent = userData.weight || '--';
            if (heightEl) heightEl.textContent = userData.height || '--';
            if (goalEl)   goalEl.textContent = goalLabels[userData.goal] || '--';

            // Calculate IMC
            calculateIMC(userData.weight, userData.height);

            // Routine status badge
            const statusEl = document.getElementById('routineStatus');
            if (statusEl) {
                if (userData.routine) {
                    statusEl.innerHTML = '<span class="status-badge active">Rutina activa</span>';
                } else if (userData.assignedProfessional) {
                    statusEl.innerHTML = '<span class="status-badge pending">En preparación</span>';
                } else {
                    statusEl.innerHTML = '<span class="status-badge no-routine">Sin nutricionista</span>';
                }
            }

            // Render routine in summary + detail card
            renderRoutine(userData.routine);

            // Populate profile form
            populateProfileForm(userData);

        } catch (err) {
            console.error('[Dashboard] Error loading profile:', err);
        }
    };

    // ---------------------------------------------------------------
    // RENDER ROUTINE
    // ---------------------------------------------------------------
    const renderRoutine = (routine) => {
        const summaryEl = document.getElementById('routineSummary');
        const detailEl  = document.getElementById('routineDetailCard');
        const badgeEl   = document.getElementById('routineBadge');

        if (!routine || !routine.meals || routine.meals.length === 0) {
            const waitingHtml = `
                <div class="routine-waiting">
                    <div class="waiting-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h3>En espera de tu nutricionista</h3>
                    <p>Completa tu perfil y solicita un profesional. El creará tu rutina personalizada.</p>
                    <button class="btn btn-primary" style="margin-top:0.5rem;" onclick="showSection('perfil')">Completar mi perfil</button>
                </div>`;
            if (summaryEl) summaryEl.innerHTML = waitingHtml;
            if (detailEl)  detailEl.innerHTML = `
                <div class="routine-waiting">
                    <div class="waiting-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h3>Tu rutina aun no ha sido creada</h3>
                    <p>Tu nutricionista revisará tu perfil y te asignará un plan alimenticio personalizado.</p>
                    <button class="btn btn-outline" style="margin-top:0.5rem;" onclick="showSection('profesionales')">Ver Profesionales</button>
                </div>`;
            return;
        }

        if (badgeEl) badgeEl.innerHTML = '<span class="status-badge active">Activa</span>';

        const totalCals = routine.meals.reduce((sum, m) => sum + (m.calories || 0), 0);

        const mealsHtml = `
            <div class="meal-list">
                ${routine.meals.map(meal => `
                    <div class="meal-item">
                        <div class="meal-item-left">
                            <span class="meal-time-badge">${meal.time}</span>
                            <span class="meal-description">${meal.description}</span>
                        </div>
                        <span class="meal-calories">${meal.calories} kcal</span>
                    </div>
                `).join('')}
            </div>
            ${routine.recommendations ? `
                <div style="margin-top:1rem; padding:1rem; background:var(--accent-soft); border:1px solid rgba(249,115,22,0.2); border-radius:var(--radius-md);">
                    <strong style="display:block; font-family:'Outfit',sans-serif; margin-bottom:0.35rem; color:var(--accent-hover);">Recomendaciones del nutricionista</strong>
                    <p style="font-size:0.9rem; color:var(--text-main);">${routine.recommendations}</p>
                </div>
            ` : ''}
            <div style="margin-top:1rem; padding:0.75rem 1rem; background:var(--secondary-soft); border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.875rem; color:var(--text-muted);">Total diario</span>
                <strong style="font-family:'Outfit',sans-serif; color:var(--secondary-dark);">${totalCals} kcal</strong>
            </div>`;

        if (summaryEl) summaryEl.innerHTML = mealsHtml;
        if (detailEl)  detailEl.innerHTML = `<div class="card-title">Plan Alimenticio<span class="status-badge active">Activo</span></div>` + mealsHtml;
    };

    // ---------------------------------------------------------------
    // POPULATE PROFILE FORM
    // ---------------------------------------------------------------
    const populateProfileForm = (data) => {
        const fields = ['height', 'weight', 'age', 'gender', 'goal', 'lifestyle', 'allergies', 'medical_conditions', 'phone', 'profile_picture'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el && data[f] !== null && data[f] !== undefined) {
                el.value = data[f];
            }
        });
    };

    // ---------------------------------------------------------------
    // PROFILE FORM SUBMIT
    // ---------------------------------------------------------------
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                height:             document.getElementById('height')?.value || null,
                weight:             document.getElementById('weight')?.value || null,
                age:                document.getElementById('age')?.value || null,
                gender:             document.getElementById('gender')?.value || null,
                goal:               document.getElementById('goal')?.value || null,
                lifestyle:          document.getElementById('lifestyle')?.value || null,
                allergies:          document.getElementById('allergies')?.value || null,
                medical_conditions: document.getElementById('medical_conditions')?.value || null,
                phone:              document.getElementById('phone')?.value || null,
                profile_picture:    document.getElementById('profile_picture')?.value || null,
            };

            try {
                const response = await fetch('/api/user/setup-profile', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    showNotification('Perfil guardado. Tu nutricionista revisara tu informacion.');
                    fetchUser();
                } else {
                    showNotification('Error al guardar el perfil.', 'error');
                }
            } catch (err) {
                showNotification('Error de conexion.', 'error');
            }
        });
    }

    // ---------------------------------------------------------------
    // FETCH PROFESSIONALS
    // ---------------------------------------------------------------
    const fetchPros = async () => {
        try {
            const response = await fetch('/api/user/professionals', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const pros = await response.json();
            const list = document.getElementById('prosList');
            if (!list) return;

            if (!pros || pros.length === 0) {
                list.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No hay profesionales disponibles por el momento.</p>';
                return;
            }

            list.innerHTML = pros.map(pro => {
                const initials = pro.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                return `
                    <div class="pro-listing-card">
                        <div class="pro-listing-info">
                            <div class="pro-listing-avatar">${initials}</div>
                            <div>
                                <div class="pro-listing-name">${pro.name}</div>
                                <div class="pro-listing-spec">${pro.specialization || 'Nutricionista'}</div>
                                ${pro.experience ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">${pro.experience} de experiencia</div>` : ''}
                            </div>
                        </div>
                        <button onclick="requestPro('${pro.id}')" class="btn btn-primary" style="padding:0.55rem 1.1rem; font-size:0.875rem;">Solicitar</button>
                    </div>`;
            }).join('');
        } catch (err) {
            console.error('[Dashboard] Error loading professionals:', err);
        }
    };

    window.requestPro = async (proId) => {
        try {
            const response = await fetch('/api/user/request-professional', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ proId })
            });
            if (response.ok) {
                showNotification('Solicitud enviada correctamente. El profesional la revisara pronto.');
            } else {
                const res = await response.json();
                showNotification(res.message || 'Error al enviar solicitud.', 'error');
            }
        } catch (err) {
            showNotification('Error de conexion.', 'error');
        }
    };

    // ---------------------------------------------------------------
    // PROGRESS FORM (DETAIL VIEW)
    // ---------------------------------------------------------------
    const progressForm = document.getElementById('progressForm');
    if (progressForm) {
        progressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const weight = document.getElementById('currentWeight').value;
            const notes  = document.getElementById('dayNotes').value;

            const response = await fetch('/api/user/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ weight, notes })
            });

            if (response.ok) {
                showNotification('Progreso guardado correctamente.');
                progressForm.reset();
                fetchProgress();
                fetchUser();
            } else {
                showNotification('Error al guardar progreso.', 'error');
            }
        });
    }

    // PROGRESS FORM (QUICK / RESUMEN)
    const progressFormQuick = document.getElementById('progressFormQuick');
    if (progressFormQuick) {
        progressFormQuick.addEventListener('submit', async (e) => {
            e.preventDefault();
            const weight = document.getElementById('qWeight').value;
            const notes  = document.getElementById('qNotes').value;

            const response = await fetch('/api/user/progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ weight, notes })
            });

            if (response.ok) {
                showNotification('Progreso guardado correctamente.');
                progressFormQuick.reset();
                fetchUser();
            } else {
                showNotification('Error al guardar progreso.', 'error');
            }
        });
    }

    // ---------------------------------------------------------------
    // FETCH PROGRESS HISTORY
    // ---------------------------------------------------------------
    const fetchProgress = async () => {
        try {
            const response = await fetch('/api/user/progress', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const history = await response.json();
            const el = document.getElementById('progressHistory');

            // Update metrics cards
            const totalLogsEl  = document.getElementById('totalLogs');
            const weightDiffEl = document.getElementById('weightDiff');

            if (history && history.length > 0) {
                if (totalLogsEl) totalLogsEl.textContent = history.length;

                if (weightDiffEl && history.length >= 2) {
                    const firstWeight  = parseFloat(history[history.length - 1].weight) || 0;
                    const latestWeight = parseFloat(history[0].weight) || 0;
                    const diff = (latestWeight - firstWeight).toFixed(1);
                    const sign = diff > 0 ? '+' : '';
                    weightDiffEl.textContent = `${sign}${diff}`;
                    weightDiffEl.style.color = diff < 0
                        ? 'var(--secondary-dark)'
                        : diff > 0 ? '#dc2626' : 'var(--text-muted)';
                } else if (weightDiffEl) {
                    weightDiffEl.textContent = '0.0';
                }
            } else {
                if (totalLogsEl)  totalLogsEl.textContent  = '0';
                if (weightDiffEl) weightDiffEl.textContent = '--';
            }

            if (!el) return;

            if (!history || history.length === 0) {
                el.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; text-align:center; padding:1.5rem;">No hay registros aun.</p>';
                return;
            }

            el.innerHTML = history.map(entry => {
                const date = new Date(entry.date || entry.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
                return `
                    <div class="progress-entry">
                        <div>
                            <span class="entry-weight">${entry.weight} kg</span>
                            ${entry.notes ? `<span style="color:var(--text-muted); font-size:0.825rem; margin-left:0.75rem;">${entry.notes}</span>` : ''}
                        </div>
                        <span class="entry-date">${date}</span>
                    </div>`;
            }).join('');
        } catch (err) {
            console.error('[Dashboard] Error loading progress:', err);
        }
    };

    // ---------------------------------------------------------------
    // MESSAGING
    // ---------------------------------------------------------------
    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/user/messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const messages = await response.json();
            const chatBox = document.getElementById('chatBox');
            if (!chatBox) return;

            if (!messages || messages.length === 0) {
                chatBox.innerHTML = '<p class="chat-empty">No hay mensajes aun. Cuando tengas un profesional asignado podras comunicarte aqui.</p>';
                return;
            }

            chatBox.innerHTML = messages.map(msg => {
                const isSent = String(msg.sender) === String(user.id);
                const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}">
                        ${msg.content}
                        <span class="bubble-time">${time}</span>
                    </div>`;
            }).join('');
            chatBox.scrollTop = chatBox.scrollHeight;
        } catch (err) {
            console.error('[Dashboard] Error fetching messages:', err);
        }
    };

    const chatForm = document.getElementById('chatForm');
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
                    fetchMessages();
                } else {
                    const res = await response.json();
                    showNotification(res.message || 'No se pudo enviar el mensaje.', 'error');
                }
            } catch (err) {
                console.error('[Dashboard] Error sending message:', err);
            }
        });
    }

    // ---------------------------------------------------------------
    // LOGOUT
    // ---------------------------------------------------------------
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    // ---------------------------------------------------------------
    // INIT
    // ---------------------------------------------------------------
    fetchUser();
    fetchPros();
    fetchProgress();
    fetchMessages();
});
