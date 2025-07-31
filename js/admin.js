document.addEventListener('DOMContentLoaded', () => {

  const firebaseConfig = {
    apiKey: "AIzaSyA2ag4E5xN46wj85EmGvBYdllOHrrLu1I8",
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
    
    const toYYYYMMDD = (d) => d.toISOString().split("T")[0];

    function initializeAdminPanel(user) {
        let allBookingsData = {};
        const headerLogo = document.getElementById('header-logo');
        const logoutButton = document.getElementById('logout-btn');
        const pendingList = document.getElementById('pending-bookings-list');
        const todayBookingsList = document.getElementById('today-bookings-list');
        const upcomingBookingsList = document.getElementById('upcoming-bookings-list');
        const pastBookingsList = document.getElementById('past-bookings-list'); // الإضافة الجديدة
        const startDatePicker = document.getElementById('start-date-picker');
        const endDatePicker = document.getElementById('end-date-picker');
        const bookingCountDisplay = document.getElementById('booking-count');
        const viewerResultsContainer = document.getElementById('viewer-results-container');
        const pendingCount = document.getElementById('pending-count');
        const todayCount = document.getElementById('today-count');
        const totalCount = document.getElementById('total-count');
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

        db.ref('settings').on('value', (snapshot) => {
            const settings = snapshot.val() || {};
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
            allBookingsData = snapshot.val() || {};
            const bookingsArray = Object.entries(allBookingsData).map(([id, booking]) => ({ id, ...booking }));
            renderPendingBookings(bookingsArray);
            renderTodayBookings(bookingsArray);
            renderUpcomingBookings(bookingsArray);
            renderPastBookings(bookingsArray); // الإضافة الجديدة
            updateDashboard(bookingsArray);
            if (startDatePicker && startDatePicker.value && endDatePicker && endDatePicker.value) {
                handleDateRangeSelection();
            }
        });

        // =======================================================
        // ▼▼▼ هذا هو الكود بعد التعديل المطلوب لإضافة زر الحذف ▼▼▼
        // =======================================================
        function createBookingItem(booking) {
            const item = document.createElement('div');
            item.className = `booking-item ${booking.status}`;
            const timeDisplay = booking.time ? `<strong>${formatTo12Hour(booking.time)}</strong>` : 'غير محدد';
            const codeDisplay = `<strong>رقم الحجز:</strong> #${booking.bookingCode || 'غير محدد'}`;
            let actionButtons = '';
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const bookingDate = new Date(booking.date + 'T00:00:00');

            if (booking.status === 'pending') {
                actionButtons = `<button class="btn btn-primary" onclick="window.handleBooking('${booking.id}', 'approve')">قبول</button> <button class="btn" onclick="window.handleBooking('${booking.id}', 'reject')">رفض</button>`;
            } else if (booking.status === 'approved') {
                if (bookingDate < today) {
                    // إذا كان الحجز في الماضي، يظهر زر الحذف
                    actionButtons = `<button class="btn btn-danger" onclick="if(confirm('هل أنت متأكد من حذف هذا الحجز نهائياً؟ لا يمكن التراجع عن هذا الإجراء.')) window.handleBooking('${booking.id}', 'reject')">حذف نهائي</button>`;
                } else {
                    // إذا كان الحجز اليوم أو في المستقبل، يظهر زر الإلغاء
                    actionButtons = `<button class="btn" onclick="window.handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>`;
                }
            }

            item.innerHTML = `
                <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${codeDisplay}</small><br>
                    <small><strong>التاريخ:</strong> ${booking.date} - <strong>الوقت:</strong> ${timeDisplay}</small><br>
                    <small><strong>الدفع:</strong> ${booking.paymentMethod}</small>
                </div>
                <div>${actionButtons}</div>`;
            return item;
        }
        // ===========================================
        // ▲▲▲ نهاية الكود المعدل ▲▲▲
        // ===========================================

        function renderPendingBookings(bookings) {
            if(!pendingList) return;
            pendingList.innerHTML = '';
            const pending = bookings.filter(b => b.status === 'pending');
            if (pending.length === 0) {
                pendingList.innerHTML = '<p class="note">لا توجد حجوزات معلقة.</p>';
                return;
            }
            pending.forEach(booking => pendingList.appendChild(createBookingItem(booking)));
        }
        
        function renderTodayBookings(bookings) {
            if(!todayBookingsList) return;
            todayBookingsList.innerHTML = '';
            const todayStr = toYYYYMMDD(new Date());
            const today = bookings.filter(b => b.date === todayStr && b.status === 'approved').sort((a,b) => (a.time || '').localeCompare(b.time || ''));
            if (today.length === 0) {
                todayBookingsList.innerHTML = '<p class="note">لا توجد حجوزات لهذا اليوم بعد.</p>';
                return;
            }
            today.forEach(booking => todayBookingsList.appendChild(createBookingItem(booking)));
        }

        function renderUpcomingBookings(bookings) {
            if (!upcomingBookingsList) return;
            upcomingBookingsList.innerHTML = '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            const thirtyDaysFromNow = new Date(today);
            thirtyDaysFromNow.setDate(today.getDate() + 31);
            const upcoming = bookings.filter(b => {
                const bookingDate = new Date(b.date + 'T00:00:00');
                return b.status === 'approved' && bookingDate >= tomorrow && bookingDate < thirtyDaysFromNow;
            }).sort((a,b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
            if (upcoming.length === 0) {
                upcomingBookingsList.innerHTML = '<p class="note">لا توجد حجوزات مؤكدة خلال الـ 30 يومًا القادمة.</p>';
                return;
            }
            let currentDateHeader = '';
            upcoming.forEach(booking => {
                if (booking.date !== currentDateHeader) {
                    currentDateHeader = booking.date;
                    const dateObj = new Date(currentDateHeader + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                    const dateHeaderEl = document.createElement('h3');
                    dateHeaderEl.className = 'date-header';
                    dateHeaderEl.textContent = formattedDate;
                    upcomingBookingsList.appendChild(dateHeaderEl);
                }
                upcomingBookingsList.appendChild(createBookingItem(booking));
            });
        }
        
        // =================================================
        // ▼▼▼ هذه هي الدالة الجديدة لعرض الحجوزات السابقة ▼▼▼
        // =================================================
        function renderPastBookings(bookings) {
            if (!pastBookingsList) return;
            pastBookingsList.innerHTML = '';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const past = bookings.filter(b => {
                const bookingDate = new Date(b.date + 'T00:00:00');
                return b.status === 'approved' && bookingDate < today;
            }).sort((a,b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))); // ترتيب تنازلي

            if (past.length === 0) {
                pastBookingsList.innerHTML = '<p class="note">لا توجد حجوزات سابقة لعرضها.</p>';
                return;
            }
            past.forEach(booking => pastBookingsList.appendChild(createBookingItem(booking)));
        }
        // ===========================================
        // ▲▲▲ نهاية الدالة الجديدة ▲▲▲
        // ===========================================

        function renderFilteredBookings(bookings, title) {
            if (!viewerResultsContainer || !bookingCountDisplay) return;
            viewerResultsContainer.innerHTML = '';
            bookingCountDisplay.textContent = bookings.length;
            if (title) {
                const titleEl = document.createElement('h3');
                titleEl.className = 'date-header';
                titleEl.textContent = title;
                viewerResultsContainer.appendChild(titleEl);
            }
            if (bookings.length === 0) {
                viewerResultsContainer.innerHTML += '<p class="note">لا توجد حجوزات مؤكدة في هذه الفترة.</p>';
                return;
            }
            bookings.forEach(booking => viewerResultsContainer.appendChild(createBookingItem(booking)));
        }

        function updateDashboard(bookings) {
            const todayStr = toYYYYMMDD(new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            if(pendingCount) pendingCount.textContent = bookings.filter(b => b.status === 'pending').length;
            if(todayCount) todayCount.textContent = bookings.filter(b => b.date === todayStr && b.status === 'approved').length;
            if(totalCount) totalCount.textContent = bookings.filter(b => new Date(b.date) >= thirtyDaysAgo && b.status === 'approved').length;
        }

        function handleDateRangeSelection() {
            const startDate = startDatePicker.value;
            const endDate = endDatePicker.value;
            if (!startDate || !endDate) {
                renderFilteredBookings([], "الرجاء تحديد فترة زمنية كاملة (من تاريخ وإلى تاريخ).");
                return;
            }
            if (endDate < startDate) {
                renderFilteredBookings([], "خطأ: تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.");
                return;
            }
            const bookingsArray = Object.values(allBookingsData);
            const filtered = bookingsArray.filter(b => b.status === 'approved' && b.date >= startDate && b.date <= endDate)
                                          .sort((a,b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
            const title = `عرض الحجوزات من ${startDate} إلى ${endDate}`;
            renderFilteredBookings(filtered, title);
        }

        function renderSchedule(scheduleData = {}) {
            if(!scheduleForm) return;
            const scheduleContainer = scheduleForm.querySelector('.schedule-grid');
            if(!scheduleContainer) return;
            scheduleContainer.innerHTML = '';
            const days = { 
                saturday: 'السبت', sunday: 'الأحد', monday: 'الإثنين', tuesday: 'الثلاثاء', 
                wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة' 
            };
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
                    </div>`;
                scheduleContainer.appendChild(dayDiv);
            }
        }
        
        function toggleContactInputs() {
            if(!contactPlatformSelect || !contactOtherInput || !contactInfoInput) return;
            contactOtherInput.style.display = (contactPlatformSelect.value === 'other') ? 'block' : 'none';
            contactInfoInput.placeholder = (contactPlatformSelect.value === 'other') ? 'اكتب الرابط أو المعلومة هنا...' : 'اكتب الرقم هنا...';
        }
        
        function toggleModelInputs() {
            if(!bookingModelSelect || !capacityInputContainer || !slotsInputContainer) return;
            slotsInputContainer.style.display = (bookingModelSelect.value === 'slots') ? 'block' : 'none';
            capacityInputContainer.style.display = (bookingModelSelect.value === 'capacity') ? 'block' : 'none';
        }

        if(logoutButton) logoutButton.addEventListener('click', () => auth.signOut());
        if(startDatePicker) startDatePicker.addEventListener('change', handleDateRangeSelection);
        if(endDatePicker) endDatePicker.addEventListener('change', handleDateRangeSelection);
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
                    if(inputsContainer) inputsContainer.style.display = e.target.checked ? 'block' : 'none';
                    parent.querySelectorAll('.form-control').forEach(input => input.disabled = !e.target.checked);
                }
            });
        }
        
        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref(`bookings/${id}`).update({ status: 'approved' }).then(() => showNotification('تم قبول الحجز.', 'success'));
            } else { // هذا الإجراء 'reject' سيقوم بالرفض أو الإلغاء أو الحذف النهائي
                db.ref(`bookings/${id}`).remove().then(() => showNotification('تم تنفيذ الإجراء بنجاح.', 'success'));
            }
        };
    }
});
