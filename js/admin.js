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
        // --- متغيرات لتخزين البيانات ---
        let allBookingsData = {};

        // --- عناصر الواجهة الأساسية ---
        const headerLogo = document.getElementById('header-logo');
        const logoutButton = document.getElementById('logout-btn');
        const pendingList = document.getElementById('pending-bookings-list');
        const todayBookingsList = document.getElementById('today-bookings-list');
        const upcomingBookingsList = document.getElementById('upcoming-bookings-list');
        const datePicker = document.getElementById('date-picker');
        const weekPicker = document.getElementById('week-picker');
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

        // --- تحميل البيانات الأولية ---
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
            updateDashboard(bookingsArray);

            if (datePicker && datePicker.value) {
                handleDateSelection();
            } else if (weekPicker && weekPicker.value) {
                handleWeekSelection();
            }
        });

        // --- دوال العرض (Rendering) ---
        function renderPendingBookings(bookings) {
            if(!pendingList) return;
            pendingList.innerHTML = '';
            
            // **** هذا هو الإصلاح النهائي والمهم ****
            // نعرض فقط الحجوزات المعلقة التي تم إنشاء كود لها بالفعل
            const pending = bookings.filter(b => b.status === 'pending' && b.bookingCode);
            
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

        function createBookingItem(booking) {
            const item = document.createElement('div');
            item.className = `booking-item ${booking.status}`;
            const timeDisplay = booking.time ? `<strong>${formatTo12Hour(booking.time)}</strong>` : 'غير محدد';
            
            // الآن هذا السطر آمن 100% لأننا لن نعرض الحجز المعلق إلا بعد إضافة الكود إليه
            const codeDisplay = `<strong>الكود:</strong> ${booking.bookingCode}`;

            let actionButtons = '';
            if (booking.status === 'pending') {
                actionButtons = `
                    <button class="btn btn-primary" onclick="window.handleBooking('${booking.id}', 'approve')">قبول</button>
                    <button class="btn" onclick="window.handleBooking('${booking.id}', 'reject')">رفض</button>
                `;
            } else { // approved
                actionButtons = `<button class="btn" onclick="window.handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>`;
            }

            item.innerHTML = `
                <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${codeDisplay}</small><br>
                    <small><strong>التاريخ:</strong> ${booking.date} - <strong>الوقت:</strong> ${timeDisplay}</small><br>
                    <small><strong>الدفع:</strong> ${booking.paymentMethod}</small>
                </div>
                <div>
                    ${actionButtons}
                </div>
            `;
            return item;
        }

        function updateDashboard(bookings) {
            const todayStr = toYYYYMMDD(new Date());
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
            if(pendingCount) pendingCount.textContent = bookings.filter(b => b.status === 'pending').length;
            if(todayCount) todayCount.textContent = bookings.filter(b => b.date === todayStr && b.status === 'approved').length;
            if(totalCount) totalCount.textContent = bookings.filter(b => new Date(b.date) >= thirtyDaysAgo && b.status === 'approved').length;
        }

        // --- دوال معالجة الأحداث (Event Handlers) ---
        function handleDateSelection() {
            if (weekPicker) weekPicker.value = '';
            const selectedDate = datePicker.value;
            if (!selectedDate) {
                renderFilteredBookings([], "الرجاء اختيار يوم لعرض الحجوزات.");
                return;
            }
            const bookingsArray = Object.values(allBookingsData);
            const filtered = bookingsArray.filter(b => b.date === selectedDate && b.status === 'approved').sort((a,b) => (a.time || '').localeCompare(b.time || ''));
            const title = `حجوزات يوم: ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
            renderFilteredBookings(filtered, title);
        }

        function handleWeekSelection() {
            if (datePicker) datePicker.value = '';
            const selectedWeek = weekPicker.value;
            if (!selectedWeek) {
                renderFilteredBookings([], "الرجاء اختيار أسبوع لعرض الحجوزات.");
                return;
            }

            const { start, end } = getWeekDateRange(selectedWeek);
            const startDateStr = toYYYYMMDD(start);
            const endDateStr = toYYYYMMDD(end);

            const bookingsArray = Object.values(allBookingsData);
            const filtered = bookingsArray.filter(b => b.status === 'approved' && b.date >= startDateStr && b.date <= endDateStr)
                .sort((a,b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
            
            const title = `حجوزات الأسبوع من ${start.toLocaleDateString('ar-EG')} إلى ${end.toLocaleDateString('ar-EG')}`;
            renderFilteredBookings(filtered, title);
        }
        
        function getWeekDateRange(weekString) {
            const [year, weekNum] = weekString.split('-W').map(Number);
            const d = new Date("Jan 01, " + year + " 01:00:00");
            const w = d.getTime() + 604800000 * (weekNum - 1);
            const n1 = new Date(w);
            const n2 = new Date(w + 518400000);
            return { start: n1, end: n2 };
        }

        function renderSchedule(scheduleData = {}) {
            // ... (الكود هنا كما هو)
        }
        
        function toggleContactInputs() {
            // ... (الكود هنا كما هو)
        }
        
        function toggleModelInputs() {
            // ... (الكود هنا كما هو)
        }

        // --- ربط الأحداث بالعناصر ---
        if(logoutButton) logoutButton.addEventListener('click', () => auth.signOut());
        if(datePicker) datePicker.addEventListener('change', handleDateSelection);
        if(weekPicker) weekPicker.addEventListener('change', handleWeekSelection);
        // ... (باقي ربط الأحداث كما هو)
        
        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref(`bookings/${id}`).update({ status: 'approved' }).then(() => showNotification('تم قبول الحجز.', 'success'));
            } else { // Reject
                db.ref(`bookings/${id}`).remove().then(() => showNotification('تم رفض الحجز.', 'success'));
            }
        };
    }
});
