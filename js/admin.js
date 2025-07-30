document.addEventListener('DOMContentLoaded', () => {

  const firebaseConfig = {
    apiKey: "AIzaSyA2ag4E5xN46wj85EmGvBYdllOHrrLu1I8", // استخدم بياناتك الصحيحة
    authDomain: "tomy-barber-shop.firebaseapp.com",
    databaseURL: "https://tomy-barber-shop-default-rtdb.firebaseio.com",
    projectId: "tomy-barber-shop",
    storageBucket: "tomy-barber-shop.firebasestorage.app",
    messagingSenderId: "693769920483",
    appId: "1:693769920483:web:88a3b6cf7318263c540ad6",
    measurementId: "G-HNW5F8YJE3"
  };

  firebase.initializeApp(firebaseConfig);

  const db = firebase.database();
  const auth = firebase.auth();
    
    const adminContent = document.getElementById('admin-content');
    const headerLogo = document.getElementById('header-logo');

    auth.onAuthStateChanged(user => {
        if (user) {
            if(adminContent) adminContent.style.display = 'block';
            initializeAdminPanel(user);
        } else {
            window.location.replace('login.html');
        }
    });

    function formatTo12Hour(timeString) {
        if (!timeString) return '';
        const [hour, minute] = timeString.split(':').map(Number);
        const period = hour >= 12 ? 'م' : 'ص';
        const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${adjustedHour}:${String(minute).padStart(2, '0')} ${period}`;
    }

    function initializeAdminPanel(user) {
        // --- DOM Elements ---
        const logoutButton = document.getElementById('logout-btn');
        const logoForm = document.getElementById('logo-form');
        const logoUrlInput = document.getElementById('logo-url');
        const changePasswordBtn = document.getElementById('change-password-btn');
        const paymentForm = document.getElementById('payment-form');
        const instapayNameInput = document.getElementById('instapay-name');
        const vodafoneCashInput = document.getElementById('vodafone-cash');
        const contactPlatformSelect = document.getElementById('contact-platform');
        const contactInfoInput = document.getElementById('contact-info');
        const contactOtherInput = document.getElementById('contact-other');
        const bookingModelForm = document.getElementById('booking-model-form');
        const bookingModelSelect = document.getElementById('booking-model-select');
        const slotsInputContainer = document.getElementById('slots-input-container');
        const slotDurationInput = document.getElementById('slot-duration');
        const capacityInputContainer = document.getElementById('capacity-input-container');
        const dailyCapacityInput = document.getElementById('daily-capacity');
        const scheduleForm = document.getElementById('schedule-form');
        const pendingList = document.getElementById('pending-bookings-list');
        const todayBookingsList = document.getElementById('today-bookings-list');
        // ====== الجزء الجديد: الحصول على عنصر القائمة الجديدة ======
        const upcomingBookingsList = document.getElementById('upcoming-bookings-list');
        const pendingCount = document.getElementById('pending-count');
        const todayCount = document.getElementById('today-count');
        const totalCount = document.getElementById('total-count');

        // --- Load Initial Data ---
        db.ref('settings').on('value', (snapshot) => {
            const settings = snapshot.val() || {};
            // ... (باقي الكود كما هو)
             if(headerLogo) headerLogo.src = settings.logoUrl || 'logo.png';
            if(logoUrlInput) logoUrlInput.value = settings.logoUrl || '';

            if (settings.paymentDetails) {
                if(instapayNameInput) instapayNameInput.value = settings.paymentDetails.instapayName || '';
                if(vodafoneCashInput) vodafoneCashInput.value = settings.paymentDetails.vodafoneCash || '';
                if(contactPlatformSelect) contactPlatformSelect.value = settings.paymentDetails.contactPlatform || 'whatsapp';
                if(contactInfoInput) contactInfoInput.value = settings.paymentDetails.contactInfo || '';
                if(contactOtherInput) contactOtherInput.value = settings.paymentDetails.contactOther || '';
                toggleContactInputs();
            }
            if(bookingModelSelect) bookingModelSelect.value = settings.bookingModel || 'slots';
            if(slotDurationInput) slotDurationInput.value = settings.slotDuration || 30;
            if(dailyCapacityInput) dailyCapacityInput.value = settings.dailyCapacity || 15;
            
            toggleModelInputs();
            if(scheduleForm) renderSchedule(settings.schedule);
        });
        
        db.ref('bookings').on('value', (snapshot) => {
            const allBookings = snapshot.val() || {};
            if(pendingList) renderPendingBookings(allBookings);
            if(todayBookingsList) renderTodayBookings(allBookings);
            // ====== الجزء الجديد: استدعاء الدالة الجديدة لعرض الحجوزات القادمة ======
            if(upcomingBookingsList) renderUpcomingBookings(allBookings);
            if(pendingCount) updateDashboard(allBookings);
        });

        // --- UI Rendering ---

        // ==========================================================
        // ========= بداية الدالة الجديدة للحجوزات القادمة =========
        // ==========================================================
        function renderUpcomingBookings(allBookings) {
            if (!upcomingBookingsList) return;
            upcomingBookingsList.innerHTML = '';

            // 1. تحديد النطاق الزمني (من الغد وحتى 30 يومًا قادمة)
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 31);

            // 2. فلترة الحجوزات لتشمل فقط المؤكدة وفي النطاق الزمني
            const upcomingApproved = Object.entries(allBookings)
                .map(([id, booking]) => ({ id, ...booking })) // إضافة الـ ID للحجز
                .filter(booking => {
                    const bookingDate = new Date(booking.date + 'T00:00:00');
                    return booking.status === 'approved' &&
                           bookingDate >= tomorrow &&
                           bookingDate < thirtyDaysFromNow;
                });

            // 3. ترتيب الحجوزات حسب التاريخ ثم الوقت
            upcomingApproved.sort((a, b) => {
                if (a.date > b.date) return 1;
                if (a.date < b.date) return -1;
                if (a.time > b.time) return 1;
                if (a.time < b.time) return -1;
                return 0;
            });

            // 4. عرض الحجوزات أو رسالة في حالة عدم وجودها
            if (upcomingApproved.length === 0) {
                upcomingBookingsList.innerHTML = '<p class="note">لا توجد حجوزات مؤكدة خلال الـ 30 يومًا القادمة.</p>';
                return;
            }

            let currentDateHeader = '';
            upcomingApproved.forEach(booking => {
                // إضافة عنوان للتاريخ عند تغير اليوم
                if (booking.date !== currentDateHeader) {
                    currentDateHeader = booking.date;
                    const dateObj = new Date(currentDateHeader + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    
                    const dateHeaderEl = document.createElement('h3');
                    dateHeaderEl.className = 'date-header';
                    dateHeaderEl.textContent = formattedDate;
                    upcomingBookingsList.appendChild(dateHeaderEl);
                }

                // عرض تفاصيل الحجز
                const item = document.createElement('div');
                item.className = 'booking-item approved';
                item.innerHTML = `
                    <div>
                        <strong>${booking.fullName}</strong> (${booking.phone}) - <em>الكود: ${booking.bookingCode || 'N/A'}</em><br>
                        <small>الوقت: ${booking.time ? `<strong>${formatTo12Hour(booking.time)}</strong>` : 'غير محدد'}</small><br>
                        <small>طريقة الدفع: ${booking.paymentMethod}</small>
                    </div>
                    <div>
                        <button class="btn" onclick="window.handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>
                    </div>
                `;
                upcomingBookingsList.appendChild(item);
            });
        }
        // ==========================================================
        // ========== نهاية الدالة الجديدة للحجوزات القادمة ==========
        // ==========================================================


        function renderSchedule(scheduleData = {}) {
            // ... الكود هنا كما هو بدون تغيير
            const scheduleContainer = scheduleForm.querySelector('.schedule-grid');
            if(!scheduleContainer) return;
            scheduleContainer.innerHTML = '';
            const days = { monday: 'الإثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة', saturday: 'السبت', sunday: 'الأحد' };
            
            for (const day in days) {
                const dayData = scheduleData[day] || { active: true, open: '09:00', close: '21:00' };
                const dayDiv = document.createElement('div');
                dayDiv.className = 'day-schedule-item';
                dayDiv.innerHTML = `
                    <h4>${days[day]}</h4>
                    <label><input type="checkbox" data-day="${day}" class="active-checkbox" ${dayData.active ? 'checked' : ''}> يوم عمل</label>
                    <div class="day-inputs" style="display:${dayData.active ? 'block' : 'none'}">
                        <label>من:</label><input type="time" class="form-control" value="${dayData.open}" ${!dayData.active ? 'disabled' : ''}>
                        <label>إلى:</label><input type="time" class="form-control" value="${dayData.close}" ${!dayData.active ? 'disabled' : ''}>
                    </div>
                `;
                scheduleContainer.appendChild(dayDiv);
            }
        }
        
        function renderPendingBookings(allBookings) {
             // ... الكود هنا كما هو بدون تغيير
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
                        <strong>${booking.fullName}</strong> (${booking.phone}) - <em>الكود: ${booking.bookingCode || 'N/A'}</em><br>
                        <small>التاريخ: ${booking.date} ${booking.time ? `- ${formatTo12Hour(booking.time)}` : ''}</small><br>
                        <small>الخدمة: ${booking.serviceName || 'حجز موعد'}</small><br>
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
        
        function renderTodayBookings(allBookings) {
            // ... الكود هنا كما هو بدون تغيير
            todayBookingsList.innerHTML = '';
            const toYYYYMMDD = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
            const todayStr = toYYYYMMDD(new Date());

            const today = Object.entries(allBookings)
                .filter(([id, booking]) => booking.date === todayStr && booking.status === 'approved')
                .sort(([, a], [, b]) => (a.time || '').localeCompare(b.time || ''));

            if (today.length === 0) {
                todayBookingsList.innerHTML = '<p>لا توجد حجوزات لهذا اليوم بعد.</p>';
                return;
            }

            today.forEach(([id, booking]) => {
                const item = document.createElement('div');
                item.className = 'booking-item approved';
                item.innerHTML = `
                    <div>
                        <strong>${booking.fullName}</strong> (${booking.phone}) - <em>الكود: ${booking.bookingCode || 'N/A'}</em><br>
                        <small>الوقت: ${booking.time ? `<strong>${formatTo12Hour(booking.time)}</strong>` : 'غير محدد'}</small><br>
                        <small>الخدمة: ${booking.serviceName || 'حجز موعد'}</small><br>
                        <small>طريقة الدفع: ${booking.paymentMethod}</small>
                    </div>
                    <div>
                        <button class="btn" onclick="window.handleBooking('${id}', 'reject')">إلغاء الحجز</button>
                    </div>
                `;
                todayBookingsList.appendChild(item);
            });
        }

        function updateDashboard(allBookings) {
            // ... الكود هنا كما هو بدون تغيير
            const bookingsArray = Object.values(allBookings);
            const toYYYYMMDD = (d) => new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split("T")[0];
            const todayStr = toYYYYMMDD(new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            if(pendingCount) pendingCount.textContent = bookingsArray.filter(b => b.status === 'pending').length;
            if(todayCount) todayCount.textContent = bookingsArray.filter(b => b.date === todayStr && b.status === 'approved').length;
            if(totalCount) totalCount.textContent = bookingsArray.filter(b => new Date(b.date) >= thirtyDaysAgo && b.status === 'approved').length;
        }

        // --- Event Listeners & Actions ---
        // ... كل الأكواد هنا كما هي بدون أي تغيير
        if(logoutButton) logoutButton.addEventListener('click', () => auth.signOut());
        
        if(changePasswordBtn) changePasswordBtn.addEventListener('click', () => {
            auth.sendPasswordResetEmail(user.email)
                .then(() => showNotification('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.', 'success'))
                .catch(err => showNotification('حدث خطأ: ' + err.message, 'error'));
        });

        if(logoForm) logoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            db.ref('settings/logoUrl').set(logoUrlInput.value)
                .then(() => showNotification('تم تحديث الشعار بنجاح.', 'success'));
        });

        function toggleContactInputs() {
            if(!contactPlatformSelect || !contactOtherInput || !contactInfoInput) return;
            if (contactPlatformSelect.value === 'other') {
                contactOtherInput.style.display = 'block';
                contactInfoInput.placeholder = 'اكتب الرابط أو المعلومة هنا...';
            } else {
                contactOtherInput.style.display = 'none';
                contactInfoInput.placeholder = 'اكتب الرقم هنا...';
            }
        }
        if(contactPlatformSelect) contactPlatformSelect.addEventListener('change', toggleContactInputs);

        if(paymentForm) paymentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = { 
                instapayName: instapayNameInput.value, 
                vodafoneCash: vodafoneCashInput.value,
                contactPlatform: contactPlatformSelect.value,
                contactInfo: contactInfoInput.value,
                contactOther: contactOtherInput.value,
            };
            db.ref('settings/paymentDetails').set(data)
                .then(() => showNotification('تم حفظ بيانات الدفع.', 'success'));
        });

        function toggleModelInputs() {
            if(!bookingModelSelect || !capacityInputContainer || !slotsInputContainer) return;
            if (bookingModelSelect.value === 'capacity') {
                capacityInputContainer.style.display = 'block';
                slotsInputContainer.style.display = 'none';
            } else {
                capacityInputContainer.style.display = 'none';
                slotsInputContainer.style.display = 'block';
            }
        }
        if(bookingModelSelect) bookingModelSelect.addEventListener('change', toggleModelInputs);
        
        if(bookingModelForm) bookingModelForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const dataToUpdate = {
                bookingModel: bookingModelSelect.value,
                slotDuration: parseInt(slotDurationInput.value, 10),
                dailyCapacity: parseInt(dailyCapacityInput.value, 10)
            };
            db.ref('settings').update(dataToUpdate)
              .then(() => showNotification('تم حفظ نموذج الحجز بنجاح.', 'success'));
        });
        
        if(scheduleForm) {
            scheduleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const scheduleData = {};
                scheduleForm.querySelectorAll('.day-schedule-item').forEach(item => {
                    const day = item.querySelector('.active-checkbox').dataset.day;
                    const isActive = item.querySelector('.active-checkbox').checked;
                    const inputs = item.querySelectorAll('input');
                    scheduleData[day] = { active: isActive, open: inputs[1].value, close: inputs[2].value };
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
        }

        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref(`bookings/${id}`).update({ status: 'approved' }).then(() => showNotification('تم قبول الحجز.', 'success'));
            } else { // Reject
                db.ref(`bookings/${id}`).remove().then(() => showNotification('تم رفض الحجز.', 'success'));
            }
        };
    }
});
