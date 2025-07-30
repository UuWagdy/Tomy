document.addEventListener('DOMContentLoaded', () => {

    const firebaseConfig = {
        apiKey: "AIzaSyA2ag4E5xN46wj85EmGvBYdllOHrrLu1I8",
        authDomain: "tomy-barber-shop.firebaseapp.com",
        projectId: "tomy-barber-shop",
        storageBucket: "tomy-barber-shop.firebasestorage.app",
        messagingSenderId: "693769920483",
        appId: "1:693769920483:web:88a3b6cf7318263c540ad6",
        measurementId: "G-HNW5F8YJE3"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // --- Global State ---
    let currentDate = new Date();
    let settings = {};
    let services = {};
    let bookings = {};
    let selectedService = null;
    
    // --- DOM Elements ---
    const loader = document.getElementById('loader');
    const bookingContainer = document.getElementById('booking-container');
    const headerLogo = document.getElementById('header-logo');
    const serviceSection = document.getElementById('service-selection-section');
    const serviceSelect = document.getElementById('service-selection');
    const calendarSection = document.getElementById('calendar-section');
    const calendarTitle = document.getElementById('calendar-title');
    const calendarView = document.getElementById('calendar-view');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const bookingModal = document.getElementById('booking-modal');
    const closeBookingModalBtn = document.getElementById('close-booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const selectedSlotDisplay = document.getElementById('selected-slot-display');
    const hiddenDateInput = document.getElementById('selected-date');
    const hiddenTimeInput = document.getElementById('selected-time');
    const paymentMethodSelect = document.getElementById('payment-method');
    const slotsModal = document.getElementById('time-slots-modal');
    const closeSlotsModalBtn = document.getElementById('close-slots-modal');
    const slotsModalTitle = document.getElementById('slots-modal-title');
    const slotsContainer = document.getElementById('time-slots-container');
    const confirmationModal = document.getElementById('confirmation-modal');
    const closeConfirmationModalBtn = document.getElementById('close-confirmation-modal');
    const bookingCodeDisplay = document.getElementById('booking-code-display');
    const paymentInfoDisplay = document.getElementById('payment-info-display');


    // --- Initialization ---
    function initializeApp() {
        const settingsRef = db.ref('settings').once('value');
        const servicesRef = db.ref('services').once('value');
        const bookingsRef = db.ref('bookings').once('value');

        Promise.all([settingsRef, servicesRef, bookingsRef]).then(([settingsSnap, servicesSnap, bookingsSnap]) => {
            settings = settingsSnap.val() || {};
            services = servicesSnap.val() || {};
            bookings = bookingsSnap.val() || {};

            loader.style.display = 'none';
            bookingContainer.style.display = 'block';
            
            headerLogo.src = settings.logoUrl || 'logo.png';
            
            populatePaymentMethods();
            setupUIForBookingModel();
            
            db.ref('bookings').on('value', snap => {
                bookings = snap.val() || {};
                if (calendarSection.style.display !== 'none') renderCalendar();
            });

        }).catch(err => {
            loader.innerHTML = "حدث خطأ في تحميل الإعدادات. الرجاء المحاولة مرة أخرى.";
            console.error(err);
        });
    }
    
    function populatePaymentMethods() {
        paymentMethodSelect.innerHTML = '<option value="عند تمام العمل" selected>الدفع عند تمام العمل</option>';
        if (settings.paymentDetails) {
            if (settings.paymentDetails.instapayName) {
                paymentMethodSelect.innerHTML += '<option value="InstaPay">انستا باي</option>';
            }
            if (settings.paymentDetails.vodafoneCash) {
                paymentMethodSelect.innerHTML += '<option value="Vodafone Cash">فودافون كاش</option>';
            }
        }
    }

    function setupUIForBookingModel() {
        if (settings.bookingModel === 'capacity') {
            serviceSection.style.display = 'none';
            calendarSection.style.display = 'block';
            calendarTitle.textContent = "الخطوة 1: اختر اليوم المناسب للحجز";
            renderCalendar();
        } else { // 'slots' model
            serviceSection.style.display = 'block';
            populateServices();
        }
    }

    function populateServices() {
        serviceSelect.innerHTML = '<option value="" disabled selected>-- الرجاء اختيار الخدمة أولاً --</option>';
        for (const id in services) {
            serviceSelect.innerHTML += `<option value="${id}">${services[id].name} (${services[id].duration} دقيقة)</option>`;
        }
    }

    // --- Calendar & Slots Logic ---
    function getDaySchedule(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        return settings.schedule ? (settings.schedule[dayName] || { active: false }) : { active: false };
    }

    function renderCalendar() {
        calendarView.innerHTML = '';
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (currentDate.getDay() || 7) + 1);

        currentWeekDisplay.textContent = `الأسبوع من ${weekStart.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}`;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        prevWeekBtn.disabled = weekStart < today;

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayString = toYYYYMMDD(dayDate);
            const schedule = getDaySchedule(dayDate);
            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-slot';
            dayDiv.dataset.date = dayString;
            
            const dayBookings = Object.values(bookings).filter(b => b.date === dayString);
            const approvedBookings = dayBookings.filter(b => b.status === 'approved').length;
            const pendingBookings = dayBookings.filter(b => b.status === 'pending').length;

            dayDiv.innerHTML = `<strong>${dayDate.toLocaleDateString('ar-EG', { weekday: 'long' })}</strong><br>${dayDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;

            if (dayDate < today || !schedule.active) {
                dayDiv.classList.add('disabled');
                if (!schedule.active) dayDiv.innerHTML += '<br><small>(إجازة)</small>';
            } else {
                if(settings.bookingModel === 'capacity') {
                    // UPDATED: Use the global dailyCapacity setting
                    const capacity = settings.dailyCapacity || 10;
                    if (approvedBookings >= capacity) {
                        dayDiv.classList.add('full');
                        dayDiv.innerHTML += '<br><small>مكتمل العدد</small>';
                    } else {
                         dayDiv.innerHTML += `<br><small>متاح: ${capacity - approvedBookings}</small>`;
                         if(pendingBookings > 0) dayDiv.innerHTML += `<br><small>قيد الانتظار: ${pendingBookings}</small>`;
                    }
                }
                // For 'slots' model, fullness is checked in the modal
            }
            calendarView.appendChild(dayDiv);
        }
    }

    function renderTimeSlots(dateString) {
        slotsContainer.innerHTML = '';
        const schedule = getDaySchedule(new Date(dateString));
        const serviceDuration = parseInt(selectedService.duration, 10);
        
        const timeToMinutes = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);
        const start = timeToMinutes(schedule.open);
        const end = timeToMinutes(schedule.close);
        
        const now = new Date();
        const todayString = toYYYYMMDD(now);
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

        for (let time = start; time < end; time += serviceDuration) {
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';
            slotDiv.textContent = timeStr;
            slotDiv.dataset.date = dateString;
            slotDiv.dataset.time = timeStr;

            const isPast = dateString === todayString && time < currentTimeMinutes;
            const booking = Object.values(bookings).find(b => b.date === dateString && b.time === timeStr);

            if (isPast) {
                slotDiv.classList.add('disabled');
                slotDiv.innerHTML += booking ? ' (تم حجزه)' : ' (فائت)';
            } else if (booking) {
                slotDiv.classList.add(booking.status === 'approved' ? 'approved' : 'pending');
                slotDiv.innerHTML += booking.status === 'approved' ? ' (محجوز)' : ' (قيد التأكيد)';
            } else {
                slotDiv.classList.add('available');
            }
            slotsContainer.appendChild(slotDiv);
        }
        slotsModal.style.display = 'block';
    }


    // --- Event Handlers ---
    serviceSelect.addEventListener('change', () => {
        if (serviceSelect.value) {
            selectedService = services[serviceSelect.value];
            calendarSection.style.display = 'block';
            renderCalendar();
        }
    });

    calendarView.addEventListener('click', (e) => {
        const daySlot = e.target.closest('.day-slot');
        if (!daySlot || daySlot.classList.contains('disabled') || daySlot.classList.contains('full')) return;

        const date = daySlot.dataset.date;
        if (settings.bookingModel === 'slots') {
            slotsModalTitle.textContent = `المواعيد المتاحة ليوم ${new Date(date + 'T00:00:00').toLocaleDateString('ar-EG')}`;
            renderTimeSlots(date);
        } else { // capacity model
            openBookingModal(date);
        }
    });
    
    slotsContainer.addEventListener('click', (e) => {
        const slot = e.target.closest('.time-slot.available');
        if(slot) {
            openBookingModal(slot.dataset.date, slot.dataset.time);
        }
    });
    
    function openBookingModal(date, time = null) {
        hiddenDateInput.value = date;
        hiddenTimeInput.value = time;
        
        let display = `يوم ${new Date(date + 'T00:00:00').toLocaleDateString('ar-EG')}`;
        if(time) display += ` - الساعة ${time}`;
        if(selectedService) display += ` (خدمة: ${selectedService.name})`;

        selectedSlotDisplay.textContent = display;
        slotsModal.style.display = 'none';
        bookingModal.style.display = 'block';
    }

    bookingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = hiddenDateInput.value;
        const paymentMethod = paymentMethodSelect.value;
        const dayFormatted = date.split('-').slice(1).join('');

        const counterRef = db.ref(`dayCounters/${date}`);
        let newId;
        try {
            const { committed, snapshot } = await counterRef.transaction(currentCount => {
                return (currentCount || 0) + 1;
            });
            if (committed) {
                newId = snapshot.val();
            } else {
                throw new Error("Failed to generate booking ID.");
            }
        } catch (error) {
            console.error(error);
            showNotification('حدث خطأ فني، الرجاء المحاولة مرة أخرى.', 'error');
            return;
        }
        
        const bookingCode = dayFormatted + newId;

        const newBooking = {
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            date: date,
            time: hiddenTimeInput.value || null,
            serviceName: selectedService ? selectedService.name : null,
            paymentMethod: paymentMethod,
            bookingCode: bookingCode,
            status: 'pending'
        };

        db.ref('bookings').push(newBooking).then(() => {
            bookingModal.style.display = 'none';
            bookingForm.reset();
            showConfirmationModal(bookingCode, paymentMethod);
        });
    });

    function showConfirmationModal(code, paymentMethod) {
        bookingCodeDisplay.textContent = code;
        paymentInfoDisplay.innerHTML = '';

        if(paymentMethod === 'InstaPay' || paymentMethod === 'Vodafone Cash') {
            const details = settings.paymentDetails;
            let html = `<h4>الرجاء إتمام الدفع وإرسال إثبات التحويل</h4>`;
            if (paymentMethod === 'InstaPay' && details.instapayName) {
                html += `<p><strong>حساب انستا باي:</strong> ${details.instapayName}</p>`;
            }
            if (paymentMethod === 'Vodafone Cash' && details.vodafoneCash) {
                html += `<p><strong>رقم فودافون كاش:</strong> ${details.vodafoneCash}</p>`;
            }
            if (details.telegramContact) {
                html += `<p><strong>أرسل إثبات التحويل إلى تليجرام رقم:</strong> ${details.telegramContact}</p>`;
            }
             paymentInfoDisplay.innerHTML = html;
        }
        confirmationModal.style.display = 'block';
    }

    // --- Helpers & Utils ---
    const toYYYYMMDD = (date) => date.toISOString().split('T')[0];

    // --- Modal Controls ---
    prevWeekBtn.addEventListener('click', () => { if (!prevWeekBtn.disabled) { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); }});
    nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    closeBookingModalBtn.onclick = () => bookingModal.style.display = "none";
    closeSlotsModalBtn.onclick = () => slotsModal.style.display = "none";
    closeConfirmationModalBtn.onclick = () => confirmationModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == bookingModal) bookingModal.style.display = "none";
        if (event.target == slotsModal) slotsModal.style.display = "none";
        if (event.target == confirmationModal) confirmationModal.style.display = "none";
    };

    // --- Start the App ---
    initializeApp();
});
