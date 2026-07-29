document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'pro') {
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

    const nameEl = document.getElementById('userName');
    const sidebarNameEl = document.getElementById('sidebarName');
    if (nameEl) nameEl.textContent = user.name;
    if (sidebarNameEl) sidebarNameEl.textContent = user.name;

    // ---------------------------------------------------------------
    // LABEL HELPERS
    // ---------------------------------------------------------------
    const goalLabels = {
        lose_weight: 'Bajar de peso',
        maintain: 'Mantener peso',
        gain_weight: 'Subir de peso',
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

    const genderLabels = {
        male: 'Masculino',
        female: 'Femenino',
        other: 'Otro'
    };

    // ---------------------------------------------------------------
    // FETCH PATIENTS & REQUESTS
    // ---------------------------------------------------------------
    const fetchPatients = async () => {
        try {
            const response = await fetch('/api/pro/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            renderPatientList('patientsList', data.patients || [], false);
            renderPatientList('requestsList', data.pendingRequests || [], true);

            // Update sidebar counters
            const patientCount  = (data.patients || []).length;
            const requestCount  = (data.pendingRequests || []).length;
            const patCountEl    = document.getElementById('sidebarPatientCount');
            const reqCountEl    = document.getElementById('sidebarRequestCount');
            if (patCountEl) patCountEl.textContent = patientCount > 0 ? patientCount : '';
            if (reqCountEl) reqCountEl.textContent  = requestCount > 0 ? requestCount : '';

        } catch (err) {
            console.error('[Pro Dashboard] Error loading patients:', err);
        }
    };

    const formatAvatarUrl = (url) => {
        if (!url || !String(url).trim()) return '';
        const trimmed = String(url).trim();
        if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && trimmed.includes('spiderwebargapi.com.ar') && !trimmed.includes('/api/public/avatar-proxy')) {
            return `/api/public/avatar-proxy?url=${encodeURIComponent(trimmed)}`;
        }
        return trimmed;
    };

    // ---------------------------------------------------------------
    // PRO AVATAR HELPER
    // ---------------------------------------------------------------
    const updateProAvatar = (profilePic, name) => {
        const container = document.getElementById('proAvatarContainer');
        const previewEl = document.getElementById('proAvatarPreviewContainer');
        if (!container) return;

        const initials = (name || user.name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const picUrl = formatAvatarUrl(profilePic);

        if (picUrl) {
            container.innerHTML = `<img src="${picUrl}" alt="Foto" style="width:100%; height:100%; object-fit:cover;">`;
            if (previewEl) previewEl.innerHTML = `<img src="${picUrl}" alt="Foto" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else {
            container.innerHTML = `<span>${initials}</span>`;
            if (previewEl) previewEl.innerHTML = `<span id="proAvatarPreviewInitials">${initials}</span>`;
        }
    };

    // Helper to compress image before uploading
    const compressProAvatarImage = async (file, maxWidth = 1000, maxHeight = 1000, quality = 0.8) => {
        return new Promise((resolve) => {
            if (!file || file.size <= 500 * 1024) return resolve(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (!blob) return resolve(file);
                        const compressed = new File([blob], (file.name || 'avatar').replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressed);
                    }, 'image/jpeg', quality);
                };
                img.onerror = () => resolve(file);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(file);
            reader.readAsDataURL(file);
        });
    };

    // PRO AVATAR FILE UPLOAD
    const proAvatarInput = document.getElementById('proAvatarFileInput');
    const proAvatarStatus = document.getElementById('proAvatarUploadStatus');

    if (proAvatarInput) {
        proAvatarInput.addEventListener('change', async () => {
            let file = proAvatarInput.files[0];
            if (!file) return;

            // Preview instantly
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewEl = document.getElementById('proAvatarPreviewContainer');
                const container = document.getElementById('proAvatarContainer');
                if (previewEl) previewEl.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                if (container) container.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:cover;">`;
            };
            reader.readAsDataURL(file);

            if (proAvatarStatus) { proAvatarStatus.style.display = 'block'; proAvatarStatus.textContent = 'Procesando y subiendo...'; proAvatarStatus.style.color = 'var(--text-muted)'; }

            try {
                file = await compressProAvatarImage(file);
                const formData = new FormData();
                formData.append('avatar', file);

                const res = await fetch('/api/pro/upload-avatar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                const data = await res.json();

                if (res.ok) {
                    if (proAvatarStatus) { proAvatarStatus.textContent = 'Foto actualizada en Cloud Storage.'; proAvatarStatus.style.color = 'var(--secondary-dark)'; }
                    const container = document.getElementById('proAvatarContainer');
                    if (container) container.innerHTML = `<img src="${data.url}" style="width:100%; height:100%; object-fit:cover;">`;
                    const previewEl = document.getElementById('proAvatarPreviewContainer');
                    if (previewEl) previewEl.innerHTML = `<img src="${data.url}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                } else {
                    if (proAvatarStatus) { proAvatarStatus.textContent = data.message || 'Error al subir la foto.'; proAvatarStatus.style.color = '#dc2626'; }
                }
            } catch (err) {
                console.error('[PRO Avatar Upload Error]', err);
                if (proAvatarStatus) { proAvatarStatus.textContent = 'Error de conexión al subir la imagen.'; proAvatarStatus.style.color = '#dc2626'; }
            }
        });
    }

    // ---------------------------------------------------------------
    // RENDER PATIENT LIST
    // ---------------------------------------------------------------
    const renderPatientList = (elementId, list, isPending) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (!list || list.length === 0) {
            element.innerHTML = `<li style="color:var(--text-muted); font-size:0.9rem; padding:1rem 0;">${isPending ? 'No hay solicitudes pendientes.' : 'No tienes pacientes activos aún.'}</li>`;
            return;
        }

        element.innerHTML = list.map(item => {
            const initials = item.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const avatarHtml = item.profile_picture
                ? `<div class="patient-avatar" style="overflow:hidden; padding:0;"><img src="${item.profile_picture}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;"></div>`
                : `<div class="patient-avatar">${initials}</div>`;

            if (isPending) {
                return `
                    <li class="patient-item">
                        <div class="patient-item-info">
                            ${avatarHtml}
                            <div>
                                <div class="patient-name">${item.name}</div>
                                <div class="patient-email">${item.email}</div>
                                ${item.goal ? `<span class="status-badge pending" style="margin-top:0.35rem;">${goalLabels[item.goal] || item.goal}</span>` : ''}
                            </div>
                        </div>
                        <div class="patient-item-actions">
                            <button onclick="handleRequest('${item.id}', 'accept')" class="btn btn-primary" style="padding:0.55rem 1rem; font-size:0.875rem;">Aceptar</button>
                            <button onclick="handleRequest('${item.id}', 'deny')" class="btn btn-outline" style="padding:0.55rem 1rem; font-size:0.875rem; border-color:#ef4444; color:#ef4444;">Denegar</button>
                        </div>
                    </li>`;
            } else {
                const hasRoutine = item.routine_id ? true : false;
                return `
                    <li class="patient-item">
                        <div class="patient-item-info">
                            ${avatarHtml}
                            <div>
                                <div class="patient-name">${item.name}</div>
                                <div class="patient-email">${item.email}</div>
                                <div style="margin-top:0.35rem; display:flex; gap:0.4rem; flex-wrap:wrap;">
                                    ${item.goal ? `<span class="status-badge active">${goalLabels[item.goal] || item.goal}</span>` : ''}
                                    ${hasRoutine ? '<span class="status-badge active">Rutina asignada</span>' : '<span class="status-badge no-routine">Sin rutina</span>'}
                                </div>
                            </div>
                        </div>
                        <div class="patient-item-actions">
                            <button onclick="openPatientDrawer('${item.id}')" class="btn btn-outline" style="padding:0.55rem 1rem; font-size:0.875rem;">Ver Detalle</button>
                        </div>
                    </li>`;
            }
        }).join('');
    };

    // ---------------------------------------------------------------
    // HANDLE REQUEST (ACCEPT / DENY)
    // ---------------------------------------------------------------
    window.handleRequest = async (userId, action) => {
        try {
            const response = await fetch('/api/pro/handle-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ userId, action })
            });
            if (response.ok) {
                const res = await response.json();
                showNotification(res.message || 'Solicitud procesada.');
                fetchPatients();
            } else {
                showNotification('Error al procesar la solicitud.', 'error');
            }
        } catch (err) {
            showNotification('Error de conexión.', 'error');
        }
    };

    // ---------------------------------------------------------------
    // PATIENT DRAWER
    // ---------------------------------------------------------------
    let activePatientId = null;

    const drawerOverlay = document.getElementById('drawerOverlay');
    const patientDrawer = document.getElementById('patientDrawer');
    const drawerClose   = document.getElementById('drawerClose');

    const openDrawer = () => {
        drawerOverlay.classList.add('active');
        patientDrawer.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
        drawerOverlay.classList.remove('active');
        patientDrawer.classList.remove('active');
        document.body.style.overflow = '';
        activePatientId = null;
    };

    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    // Drawer tabs
    document.querySelectorAll('.drawer-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.drawer-tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`tab-${tabId}`)?.classList.add('active');

            if (tabId === 'chat' && activePatientId) {
                fetchDrawerMessages(activePatientId);
            }
        });
    });

    window.openPatientDrawer = async (patientId) => {
        activePatientId = patientId;

        // Reset to info tab
        document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.drawer-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelector('.drawer-tab[data-tab="info"]')?.classList.add('active');
        document.getElementById('tab-info')?.classList.add('active');

        openDrawer();

        try {
            const response = await fetch(`/api/pro/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            const { patient, routine, messages } = data;

            // Header
            document.getElementById('drawerPatientName').textContent = patient.name;
            document.getElementById('drawerPatientEmail').textContent = patient.email;

            // Info Grid
            const infoGrid = document.getElementById('patientInfoGrid');
            infoGrid.innerHTML = `
                <div class="info-item">
                    <div class="info-label">Edad</div>
                    <div class="info-value">${patient.age ? patient.age + ' años' : 'No indicado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Género</div>
                    <div class="info-value">${genderLabels[patient.gender] || patient.gender || 'No indicado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Peso</div>
                    <div class="info-value">${patient.weight ? patient.weight + ' kg' : 'No indicado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Altura</div>
                    <div class="info-value">${patient.height ? patient.height + ' cm' : 'No indicado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Objetivo</div>
                    <div class="info-value">${goalLabels[patient.goal] || patient.goal || 'No indicado'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Actividad Física</div>
                    <div class="info-value">${lifestyleLabels[patient.lifestyle] || patient.lifestyle || 'No indicado'}</div>
                </div>
                ${patient.phone ? `
                <div class="info-item">
                    <div class="info-label">Telefono</div>
                    <div class="info-value">${patient.phone}</div>
                </div>` : ''}
                <div class="info-item full-width">
                    <div class="info-label">Alergias / Intolerancias</div>
                    <div class="info-value multiline">${patient.allergies || 'Ninguna indicada'}</div>
                </div>
                <div class="info-item full-width">
                    <div class="info-label">Condiciones Medicas</div>
                    <div class="info-value multiline">${patient.medical_conditions || 'Ninguna indicada'}</div>
                </div>`;

            // Load routine into editor
            loadRoutineIntoEditor(routine);

            // Load messages
            if (messages) renderDrawerMessages(messages, patientId);

        } catch (err) {
            console.error('[Pro Dashboard] Error loading patient detail:', err);
            showNotification('Error al cargar los datos del paciente.', 'error');
        }
    };

    // ---------------------------------------------------------------
    // ROUTINE EDITOR
    // ---------------------------------------------------------------
    const mealsContainer = document.getElementById('mealsContainer');
    let mealRows = [];

    const createMealRow = (meal = {}) => {
        const row = document.createElement('div');
        row.className = 'routine-meal-row';
        row.innerHTML = `
            <input type="text" class="form-input meal-time" placeholder="Horario" value="${meal.time || ''}">
            <input type="text" class="form-input meal-desc meal-desc-input" placeholder="Descripcion de la comida" value="${meal.description || ''}">
            <input type="number" class="form-input meal-cals" placeholder="kcal" value="${meal.calories || ''}">
            <button type="button" class="btn-remove-meal" title="Eliminar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>`;
        row.querySelector('.btn-remove-meal').addEventListener('click', () => row.remove());
        return row;
    };

    const loadRoutineIntoEditor = (routine) => {
        if (!mealsContainer) return;
        mealsContainer.innerHTML = '';

        const meals = routine?.meals?.length > 0 ? routine.meals : [{}];
        meals.forEach(meal => mealsContainer.appendChild(createMealRow(meal)));

        const recoEl = document.getElementById('routineRecommendations');
        if (recoEl) recoEl.value = routine?.recommendations || '';
    };

    document.getElementById('addMealBtn')?.addEventListener('click', () => {
        mealsContainer.appendChild(createMealRow());
    });

    document.getElementById('clearRoutineBtn')?.addEventListener('click', () => {
        mealsContainer.innerHTML = '';
        mealsContainer.appendChild(createMealRow());
        const recoEl = document.getElementById('routineRecommendations');
        if (recoEl) recoEl.value = '';
    });

    // SAVE ROUTINE
    const routineForm = document.getElementById('routineForm');
    if (routineForm) {
        routineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activePatientId) return;

            const rows = mealsContainer.querySelectorAll('.routine-meal-row');
            const meals = Array.from(rows).map(row => ({
                time:        row.querySelector('.meal-time').value.trim(),
                description: row.querySelector('.meal-desc').value.trim(),
                calories:    Number(row.querySelector('.meal-cals').value) || 0
            })).filter(m => m.time || m.description);

            const recommendations = document.getElementById('routineRecommendations').value;

            const routineNotif = document.getElementById('routineNotification');

            try {
                const response = await fetch(`/api/pro/patient/${activePatientId}/routine`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ meals, recommendations })
                });

                if (response.ok) {
                    if (routineNotif) {
                        routineNotif.textContent = 'Rutina guardada y enviada al paciente.';
                        routineNotif.className = 'notification success';
                        routineNotif.style.display = 'block';
                        setTimeout(() => { routineNotif.style.display = 'none'; }, 4000);
                    }
                    showNotification('Rutina guardada correctamente.');
                    fetchPatients();
                } else {
                    if (routineNotif) {
                        routineNotif.textContent = 'Error al guardar la rutina.';
                        routineNotif.className = 'notification error';
                        routineNotif.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('[Pro Dashboard] Error saving routine:', err);
            }
        });
    }

    // ---------------------------------------------------------------
    // DRAWER CHAT
    // ---------------------------------------------------------------
    const renderDrawerMessages = (messages, patientId) => {
        const chatBox = document.getElementById('drawerChatBox');
        if (!chatBox) return;

        if (!messages || messages.length === 0) {
            chatBox.innerHTML = '<p class="chat-empty">No hay mensajes con este paciente aun.</p>';
            return;
        }

        chatBox.innerHTML = messages.map(msg => {
            const isSent = String(msg.senderModel) === 'Professional';
            const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <div class="chat-bubble ${isSent ? 'chat-bubble-sent' : 'chat-bubble-received'}">
                    ${msg.content}
                    <span class="bubble-time">${time}</span>
                </div>`;
        }).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const fetchDrawerMessages = async (patientId) => {
        try {
            const response = await fetch(`/api/pro/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            renderDrawerMessages(data.messages || [], patientId);
        } catch (err) {
            console.error('[Pro Dashboard] Error fetching messages:', err);
        }
    };

    const drawerChatForm = document.getElementById('drawerChatForm');
    if (drawerChatForm) {
        drawerChatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!activePatientId) return;
            const input = document.getElementById('drawerMessageInput');
            const content = input.value.trim();
            if (!content) return;

            try {
                const response = await fetch(`/api/pro/patient/${activePatientId}/message`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ content })
                });

                if (response.ok) {
                    input.value = '';
                    fetchDrawerMessages(activePatientId);
                }
            } catch (err) {
                console.error('[Pro Dashboard] Error sending message:', err);
            }
        });
    }

    // ---------------------------------------------------------------
    // PROFILE FORM
    // ---------------------------------------------------------------
    const loadProfile = async () => {
        try {
            const response = await fetch('/api/pro/patients', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            updateProAvatar(data.profile_picture, data.name);

            const fields = ['proName', 'proSpecialization', 'proDescription', 'proBio', 'proExperience', 'proEducation'];
            const keys   = ['name', 'specialization', 'description', 'bio', 'experience', 'education'];

            fields.forEach((fieldId, i) => {
                const el = document.getElementById(fieldId);
                if (el && data[keys[i]] !== undefined && data[keys[i]] !== null) {
                    el.value = data[keys[i]];
                }
            });
        } catch (err) {
            console.error('[Pro Dashboard] Error loading profile:', err);
        }
    };

    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profileData = {
            name:           document.getElementById('proName')?.value,
            specialization: document.getElementById('proSpecialization')?.value,
            description:    document.getElementById('proDescription')?.value,
            bio:            document.getElementById('proBio')?.value,
            experience:     document.getElementById('proExperience')?.value,
            education:      document.getElementById('proEducation')?.value
        };

        try {
            const response = await fetch('/api/pro/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                const result = await response.json();
                showNotification(result.message || 'Perfil actualizado.');
                if (nameEl) nameEl.textContent = profileData.name;
                if (sidebarNameEl) sidebarNameEl.textContent = profileData.name;
                showSection('pacientes');
            } else {
                showNotification('Error al actualizar perfil.', 'error');
            }
        } catch (err) {
            showNotification('Error de conexion.', 'error');
        }
    });

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
    fetchPatients();
    loadProfile();
});
