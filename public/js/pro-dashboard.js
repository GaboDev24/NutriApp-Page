document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || user.role !== 'pro') {
        window.location.href = 'login.html';
        return;
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
                <div>
                    ${isPending ? `
                        <button onclick="handleRequest('${item._id}', 'accept')" class="btn btn-primary" style="padding: 0.5rem 1rem;">Aceptar</button>
                        <button onclick="handleRequest('${item._id}', 'deny')" class="btn btn-outline" style="padding: 0.5rem 1rem; border-color: #ef4444; color: #ef4444;">Denegar</button>
                    ` : `
                        <button onclick="viewPatient('${item._id}')" class="btn btn-outline" style="padding: 0.5rem 1rem;">Ver Perfil</button>
                    `}
                </div>
            </li>
        `).join('');
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
            fetchPatients();
        }
    };

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    fetchPatients();
});
