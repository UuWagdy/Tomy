document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: "AIzaSyA2ag4E5xN46wj85EmGvBYdllOHrrLu1I8",
        authDomain: "tomy-barber-shop.firebaseapp.com",
        projectId: "tomy-barber-shop",
        storageBucket: "tomy-barber-shop.firebasestorage.app", // This can stay, it doesn't hurt
        messagingSenderId: "693769920483",
        appId: "1:693769920483:web:88a3b6cf7318263c540ad6",
        measurementId: "G-HNW5F8YJE3"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    const auth = firebase.auth();
    // We no longer need the storage service
    // const storage = firebase.storage(); 

    const adminContent = document.getElementById('admin-content');
    const headerLogo = document.getElementById('header-logo');

    // --- Authentication Check ---
    auth.onAuthStateChanged(user => {
        if (user) {
            initializeAdminPanel(user);
        } else {
            window.location.replace('login.html');
        }
    });

    function initializeAdminPanel(user) {
        adminContent.style.display = 'block';

        // --- DOM Elements ---
        const logoutButton = document.getElementById('logout-btn');
        const logoForm = document.getElementById('logo-form');
        const logoUrlInput = document.getElementById('logo-url');
        const changePasswordBtn = document.getElementById('change-password-btn');
        const paymentForm = document.getElementById('payment-form');
        const instapayNameInput = document.getElementById('instapay-name');
        const vodafoneCashInput = document.getElementById('vodafone-cash');
        const telegramContactInput = document.getElementById('telegram-contact');
        const bookingModelForm = document.getElementById('booking-model-form');
        const bookingModelSelect = document.getElementById('booking-model-select');
        const scheduleForm = document.getElementById('schedule-form');
        const pendingList = document.getElementById('pending-bookings-list');
        const pendingCount = document.getElementById('pending-count');
        const todayCount = document.getElementById('today-count');
        const totalCount = document.getElementById('total-count');

        // --- Load Initial Data ---
        db.ref('settings').on('value', (snapshot) => {
            const settings = snapshot.val() || {};
            // Load Logo
            headerLogo.src = settings.logoUrl || 'logo.png';
            logoUrlInput.value = settings.logoUrl || '';
            // Load Payment Details
            if (settings.paymentDetails) {
                instapayNameInput.value = settings.paymentDetails.instapayName || '';
                vodafoneCashInput.value = settings.paymentDetails.vodafoneCash || '';
                telegramContactInput.value = settings.paymentDetails.telegramContact || '';
            }
            // Load Booking Model
            bookingModelSelect.value = settings.bookingModel || 'slots';
            // Load Schedule
            renderSchedule(settings.schedule);
        });
        
        db.ref('bookings').on('value', (snapshot) => {
            const bookings = snapshot.val() || {};
            renderPendingBookings(bookings);
            updateDashboard(bookings);
        });

        // --- UI Rendering ---
        function renderSchedule(scheduleData = {}) {
            const scheduleContainer = scheduleForm.querySelector('.schedule-grid');
            scheduleContainer.innerHTML = '';
            const days = { monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' };
            
            for (const day in days) {
                const dayData = scheduleData[day] || { active: true, open: '09:00', close: '21:00', capacity: 10 };
                const dayDiv = document.createElement('div');
                dayDiv.className = 'day-schedule-item';
                dayDiv.innerHTML = `
                    <h4>${days[day]}</h4>
                    <label><input type="checkbox" data-day="${day}" class="active-checkbox" ${dayData.active ? 'checked' : ''}> يوم عمل</label>
                    <div class="day-inputs" style="display:${dayData.active ? 'block' : 'none'}">
                        <label>من:</label><input type="time" class="form-control" value="${dayData.open}" ${!dayData.active ? 'disabled' : ''}>
                        <label>إلى:</label><input type="time" class="form-control" value="${dayData.close}" ${!dayData.active ? 'disabled' : ''}>
                        <label>الطاقة الاستيعابية (للنموذج العددي):</label>
                        <input type="number" class="form-control" value="${dayData.capacity}" min="1" ${!dayData.active ? 'disabled' : ''}>
                    </div>
                `;
                scheduleContainer.appendChild(dayDiv);
            }
        }
        
        function renderPendingBookings(allBookings) {
             pendingList.innerHTML = '';
             const pending = Object.entries(allBookings).filter(([id, booking]) => booking.status === 'pending');
             if(pending.length === 0) {
                 pendingList.innerHTML = '<p>لا توجد حجوزات معلقة.</p>';
                 return;
             }
             pending.forEach(([id, booking]) => {
                const item = document.createElement('div');
                item.className = 'booking-item pending';
                item.innerHTML = `
                    <div>
                        <strong>${booking.fullName}</strong> (${booking.phone}) - <em>الكود: ${booking.bookingCode}</em><br>
                        <small>التاريخ: ${booking.date} ${booking.time ? `- الساعة ${booking.time}` : ''}</small><br>
                        <small>الخدمة: ${booking.serviceName || 'حجز يوم'}</small><br>
                        <small>الدفع: ${booking.paymentMethod}</small>
                    </div>
                    <div>
                        <button class="btn btn-primary" onclick="window.handleBooking('${id}', 'approve')">قبول</button>
                        <button class="btn" onclick="window.handleBooking('${id}', 'reject')">رفض</button>
                    </div>
                `;
                pendingList.appendChild(item);
             });
        }
        
        function updateDashboard(allBookings) {
            const bookingsArray = Object.values(allBookings);
            const toYYYYMMDD = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
            const todayStr = toYYYYMMDD(new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            pendingCount.textContent = bookingsArray.filter(b => b.status === 'pending').length;
            todayCount.textContent = bookingsArray.filter(b => b.date === todayStr && b.status === 'approved').length;
            totalCount.textContent = bookingsArray.filter(b => {
                const bookingDate = new Date(b.date);
                return b.status === 'approved' && bookingDate >= thirtyDaysAgo;
            }).length;
        }

        // --- Event Listeners & Actions ---
        logoutButton.addEventListener('click', () => auth.signOut());
        
        changePasswordBtn.addEventListener('click', () => {
            auth.sendPasswordResetEmail(user.email)
                .then(() => showNotification('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success'))
                .catch(err => showNotification('حدث خطأ: ' + err.message, 'error'));
        });

        logoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newLogoUrl = logoUrlInput.value;
            db.ref('settings/logoUrl').set(newLogoUrl)
                .then(() => showNotification('تم تحديث الشعار بنجاح.', 'success'))
                .catch(err => showNotification('فشل تحديث الشعار: ' + err.message, 'error'));
        });

        paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                instapayName: instapayNameInput.value,
                vodafoneCash: vodafoneCashInput.value,
                telegramContact: telegramContactInput.value,
            };
            db.ref('settings/paymentDetails').set(data)
                .then(() => showNotification('تم حفظ بيانات الدفع.', 'success'));
        });
        
        bookingModelForm.addEventListener('submit', (e) => {
            e.preventDefault();
            db.ref('settings/bookingModel').set(bookingModelSelect.value)
              .then(() => showNotification('تم حفظ نموذج الحجز.', 'success'));
        });
        
        scheduleForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const scheduleData = {};
            const dayItems = scheduleForm.querySelectorAll('.day-schedule-item');
            dayItems.forEach(item => {
                const day = item.querySelector('.active-checkbox').dataset.day;
                const isActive = item.querySelector('.active-checkbox').checked;
                const inputs = item.querySelectorAll('input');
                scheduleData[day] = {
                    active: isActive,
                    open: inputs[1].value,
                    close: inputs[2].value,
                    capacity: parseInt(inputs[3].value, 10)
                };
            });
            db.ref('settings/schedule').set(scheduleData)
                .then(() => showNotification('تم حفظ أوقات العمل الأسبوعية.', 'success'));
        });
        
        scheduleForm.addEventListener('change', (e) => {
            if (e.target.classList.contains('active-checkbox')) {
                const parent = e.target.closest('.day-schedule-item');
                const inputsContainer = parent.querySelector('.day-inputs');
                inputsContainer.style.display = e.target.checked ? 'block' : 'none';
                parent.querySelectorAll('.form-control').forEach(input => input.disabled = !e.target.checked);
            }
        });

        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref(`bookings/${id}`).update({ status: 'approved' }).then(() => showNotification('تم قبول الحجز.', 'success'));
            } else { // Reject
                db.ref(`bookings/${id}`).remove().then(() => showNotification('تم رفض الحجز.', 'success'));
            }
        };
    }
});
