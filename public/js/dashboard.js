document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || user.role !== 'user') {
        window.location.href = 'login.html';
        return;
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
        if (!routine || !routine.meals) return;
        const list = document.getElementById('routineList');
        list.innerHTML = routine.meals.map(meal => `
            <div style="display: flex; justify-content: space-between; padding: 1rem; border-bottom: 1px solid #f1f5f9;">
                <div><strong>${meal.time}</strong> - ${meal.description}</div>
                <div>${meal.calories} kcal</div>
            </div>
        `).join('');
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
        if (response.ok) alert('Solicitud enviada');
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
                alert('Progreso guardado');
                location.reload();
            }
        });
    }

    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    fetchUser();
    fetchPros();
});
