document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || user.role !== 'pro') {
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

    const fetchPatients = async () => {
        const response = await fetch('/api/pro/patients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        renderList('requestsList', data.pendingRequests, true);
        renderList('patientsList', data.patients, false);
    };

    const renderList = (elementId, list, isPending) => {
        const element = document.getElementById(elementId);
        if (!list || list.length === 0) {
            element.innerHTML = '<li>Sin pacientes en esta categoría.</li>';
            return;
        }

        element.innerHTML = list.map(item => `
            <li class="patient-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${item.email}</small>
                </div>
                <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    ${isPending ? `
                        <button onclick="handleRequest('${item._id}', 'accept')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Aceptar</button>
                        <button onclick="handleRequest('${item._id}', 'deny')" class="btn btn-outline" style="padding: 0.5rem 1rem; border-color: #ef4444; color: #ef4444;">Denegar</button>
                    ` : `
                        <button onclick="viewPatient('${item._id}')" class="btn btn-outline" style="padding: 0.5rem 1rem;">Ver Perfil</button>
                        <a href="patient-stats.html?id=${item._id}" class="btn btn-primary" style="padding: 0.5rem 1rem; text-decoration: none;">Ver Estadísticas</a>
                    `}
                </div>
            </li>
        `).join('');
    };

    // Section management
    window.showSection = (sectionId) => {
        const sections = ['profileSection', 'pendingRequests', 'activePatients'];
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.style.display = id === sectionId ? 'block' : 'none';
            }
        });

        // Close mobile sidebar
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    };

    // Load profile data
    const loadProfile = async () => {
        const response = await fetch('/api/pro/patients', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (document.getElementById('proName')) {
            document.getElementById('proName').value = data.name || '';
            document.getElementById('proSpecialization').value = data.specialization || '';
            document.getElementById('proDescription').value = data.description || '';
            document.getElementById('proBio').value = data.bio || '';
            document.getElementById('proExperience').value = data.experience || '';
            document.getElementById('proEducation').value = data.education || '';
        }
    };

    // Profile form submission
    document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const profileData = {
            name: document.getElementById('proName').value,
            specialization: document.getElementById('proSpecialization').value,
            description: document.getElementById('proDescription').value,
            bio: document.getElementById('proBio').value,
            experience: document.getElementById('proExperience').value,
            education: document.getElementById('proEducation').value
        };

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
            showNotification(result.message);
            document.getElementById('userName').textContent = profileData.name;
            window.showSection('activePatients');
        } else {
            showNotification('Error al actualizar perfil', 'error');
        }
    });

    window.viewPatient = (id) => {
        window.location.href = `patient-profile.html?id=${id}`;
    };

    window.handleRequest = async (userId, action) => {
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
            showNotification(res.message);
            fetchPatients();
        } else {
            showNotification('Error al procesar la solicitud', 'error');
        }
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    fetchPatients();
    loadProfile();
});
