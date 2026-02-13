document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('id');

    if (!token || user.role !== 'pro') {
        window.location.href = 'login.html';
        return;
    }

    if (!patientId) {
        alert('No se especificó un paciente');
        window.location.href = 'pro-dashboard.html';
        return;
    }

    const notification = document.getElementById('notification');
    const mealsContainer = document.getElementById('mealsContainer');
    const chatBox = document.getElementById('chatBox');

    function showNotification(message, type = 'success') {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        setTimeout(() => { notification.className = 'notification'; }, 5000);
    }

    // --- Fetch Patient Data, Routine & Messages ---
    async function loadData() {
        try {
            const response = await fetch(`/api/pro/patient/${patientId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar datos');

            const data = await response.json();

            // Render Patient Info
            document.getElementById('patientInfo').innerHTML = `
                <p><strong>Nombre:</strong> ${data.patient.name}</p>
                <p><strong>Email:</strong> ${data.patient.email}</p>
                <p><strong>Usuario desde:</strong> ${new Date(data.patient.createdAt).toLocaleDateString()}</p>
            `;

            // Render Routine
            mealsContainer.innerHTML = '';
            if (data.routine && data.routine.meals) {
                data.routine.meals.forEach(meal => addMeal(meal));
                document.getElementById('recommendations').value = data.routine.recommendations || '';
            } else {
                addMeal(); // Add one empty slot by default
            }

            // Render Messages
            renderMessages(data.messages);

        } catch (error) {
            console.error(error);
            showNotification('Error al cargar la información del paciente', 'error');
        }
    }

    // --- Routine Management ---
    window.addMeal = (meal = { time: '', description: '', calories: '' }) => {
        const div = document.createElement('div');
        div.className = 'meal-entry';
        div.innerHTML = `
            <input type="time" name="time" value="${meal.time || ''}" required>
            <input type="text" name="description" placeholder="Descripción de la comida" value="${meal.description || ''}" required>
            <input type="number" name="calories" placeholder="Kcal" value="${meal.calories || ''}">
            <button type="button" onclick="this.parentElement.remove()" class="btn btn-outline" style="color: red; border-color: red;">X</button>
        `;
        mealsContainer.appendChild(div);
    };

    document.getElementById('routineForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const meals = [];
        document.querySelectorAll('.meal-entry').forEach(entry => {
            meals.push({
                time: entry.querySelector('[name="time"]').value,
                description: entry.querySelector('[name="description"]').value,
                calories: entry.querySelector('[name="calories"]').value
            });
        });

        const recommendations = document.getElementById('recommendations').value;

        try {
            const response = await fetch(`/api/pro/patient/${patientId}/routine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ meals, recommendations })
            });

            const res = await response.json();
            if (response.ok) {
                showNotification('Rutina guardada exitosamente');
            } else {
                showNotification(res.message, 'error');
            }
        } catch (error) {
            showNotification('Error al guardar la rutina', 'error');
        }
    });

    // --- Messaging System ---
    function renderMessages(messages) {
        chatBox.innerHTML = messages.map(msg => `
            <div class="message ${msg.sender === user.id ? 'sent' : 'received'}">
                <small>${new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><br>
                ${msg.content}
            </div>
        `).join('');
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    document.getElementById('chatForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content) return;

        try {
            const response = await fetch(`/api/pro/patient/${patientId}/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });

            if (response.ok) {
                const res = await response.json();
                input.value = '';
                // Append message locally for immediate feedback
                const msgDiv = document.createElement('div');
                msgDiv.className = 'message sent';
                msgDiv.innerHTML = `<small>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small><br>${content}`;
                chatBox.appendChild(msgDiv);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
        } catch (error) {
            console.error(error);
        }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });

    loadData();
});
