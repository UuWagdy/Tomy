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
    
    let currentDate = new Date();
    let settings = {};
    let services = {};
    let bookings = {};
    
    const loader = document.getElementById('loader');
    const bookingContainer = document.getElementById('booking-container');
    const headerLogo = document.getElementById('header-logo');
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

    function startBookingSystem() {
        const settingsRef = db.ref('settings').once('value');
        const servicesRef = db.ref('services').once('value');
        Promise.all([settingsRef, servicesRef]).then(([settingsSnap, servicesSnap]) => {
            settings = settingsSnap.val() || {};
            services = servicesSnap.val() || {};
            if (headerLogo) headerLogo.src = settings.logoUrl || 'logo.png';
            populatePaymentMethods();
            setupUIForBookingModel(); 
            db.ref('bookings').on('value', snap => {
                bookings = snap.val() || {};
                renderCalendar(); 
            });
            loader.style.display = 'none';
            bookingContainer.style.display = 'block';
        }).catch(err => {
            console.error("خطأ في تحميل الإعدادات الأولية:", err);
            loader.innerHTML = "حدث خطأ في تحميل الإعدادات. الرجاء المحاولة مرة أخرى.";
        });
    }
    
    function formatTo12Hour(timeString) {
        if (!timeString) return '';
        const [hour, minute] = timeString.split(':').map(Number);
        const period = hour >= 12 ? 'م' : 'ص';
        const adjustedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${adjustedHour}:${String(minute).padStart(2, '0')} ${period}`;
    }
    
    function populatePaymentMethods() {
        if (!paymentMethodSelect) return;
        paymentMethodSelect.innerHTML = '<option value="عند تمام العمل" selected>الدفع عند تمام العمل</option>';
        if (settings.paymentDetails) {
            if (settings.paymentDetails.instapayName) paymentMethodSelect.innerHTML += '<option value="InstaPay">انستا باي</option>';
            if (settings.paymentDetails.vodafoneCash) paymentMethodSelect.innerHTML += '<option value="Vodafone Cash">فودافون كاش</option>';
        }
    }

    function setupUIForBookingModel() {
        if (!calendarSection || !calendarTitle) return;
        calendarSection.style.display = 'block';
        const serviceSection = document.getElementById('service-selection-section');
        if(serviceSection) serviceSection.style.display = 'none';
        if (settings.bookingModel === 'capacity') {
            calendarTitle.textContent = "الخطوة 1: اختر اليوم المناسب للحجز";
        } else {
            calendarTitle.textContent = "الخطوة 1: اختر اليوم والموعد";
        }
    }

    function getDaySchedule(date) {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayName = dayNames[date.getDay()];
        return settings.schedule ? (settings.schedule[dayName] || { active: false }) : { active: false };
    }

    function renderCalendar() {
        if (!calendarView || !currentWeekDisplay || !prevWeekBtn) return;
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
            const dayBookings = bookings ? Object.values(bookings).filter(b => b.date === dayString) : [];
            dayDiv.innerHTML = `<strong>${dayDate.toLocaleDateString('ar-EG', { weekday: 'long' })}</strong><br>${dayDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
            if (dayDate < today || !schedule.active) {
                dayDiv.classList.add('disabled');
                if (!schedule.active) dayDiv.innerHTML += '<br><small>(إجازة)</small>';
            } else {
                if(settings.bookingModel === 'capacity') {
                    const capacity = settings.dailyCapacity || 10;
                    const approvedBookingsCount = dayBookings.filter(b => b.status === 'approved').length;
                    if (approvedBookingsCount >= capacity) {
                        dayDiv.classList.add('full');
                        dayDiv.innerHTML += '<br><small>مكتمل العدد</small>';
                    } else {
                         const availableCount = capacity - approvedBookingsCount;
                         dayDiv.innerHTML += `<br><small>متاح: ${availableCount}</small>`;
                    }
                } else {
                    dayDiv.classList.add('available');
                }
            }
            calendarView.appendChild(dayDiv);
        }
    }

     function renderTimeSlots(dateString) {
        if (!slotsContainer || !slotsModal) return;
        slotsContainer.innerHTML = '';
        const schedule = getDaySchedule(new Date(dateString));
        if (!schedule || !schedule.open || !schedule.close) return;
        const slotDuration = parseInt(settings.slotDuration, 10) || 30;
        const timeToMinutes = (t) => t.split(':').map(Number).reduce((h, m) => h * 60 + m);
        const start = timeToMinutes(schedule.open);
        const end = timeToMinutes(schedule.close);
        const now = new Date();
        const todayString = toYYYYMMDD(now);
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        for (let time = start; time < end; time += slotDuration) {
            const h = Math.floor(time / 60);
            const m = time % 60;
            const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';
            slotDiv.textContent = formatTo12Hour(timeStr);
            slotDiv.dataset.date = dateString;
            slotDiv.dataset.time = timeStr;
            const isPast = dateString === todayString && time < currentTimeMinutes;
            const booking = bookings ? Object.values(bookings).find(b => b.date === dateString && b.time === timeStr) : null;
            if (isPast) {
                slotDiv.classList.add('disabled');
            } else if (booking) {
                slotDiv.classList.add(booking.status === 'approved' ? 'approved' : 'pending');
            } else {
                slotDiv.classList.add('available');
            }
            slotsContainer.appendChild(slotDiv);
        }
        slotsModal.style.display = 'block';
    }
    
    function openBookingModal(date, time = null) {
        if(!hiddenDateInput || !hiddenTimeInput || !selectedSlotDisplay || !slotsModal || !bookingModal) return;
        hiddenDateInput.value = date;
        hiddenTimeInput.value = time;
        let display = `يوم ${new Date(date + 'T00:00:00').toLocaleDateString('ar-EG')}`;
        if(time) display += ` - الساعة ${formatTo12Hour(time)}`;
        selectedSlotDisplay.textContent = display;
        slotsModal.style.display = 'none';
        bookingModal.style.display = 'block';
    }
    
    function showConfirmationModal(id, paymentMethod) {
        if(!bookingCodeDisplay || !paymentInfoDisplay || !confirmationModal) return;
        // تم تغيير اسم المتغير من code إلى id ليعكس المعنى الجديد
        bookingCodeDisplay.textContent = id; 
        paymentInfoDisplay.innerHTML = '';
        if(paymentMethod === 'InstaPay' || paymentMethod === 'Vodafone Cash') {
            const details = settings.paymentDetails;
            let html = `<h4>الرجاء إتمام الدفع وإرسال إثبات التحويل</h4>`;
            if (details && details.instapayName) html += `<p><strong>حساب انستا باي:</strong> ${details.instapayName}</p>`;
            if (details && details.vodafoneCash) html += `<p><strong>رقم فودافون كاش:</strong> ${details.vodafoneCash}</p>`;
            if (details && details.contactInfo) {
                let platform = details.contactPlatform === 'other' ? details.contactOther : (details.contactPlatform || 'واتساب');
                platform = platform.charAt(0).toUpperCase() + platform.slice(1);
                html += `<p><strong>أرسل إثبات التحويل إلى ${platform} على:</strong> ${details.contactInfo}</p>`;
            }
            paymentInfoDisplay.innerHTML = html;
        }
        confirmationModal.style.display = 'block';
    }

    const toYYYYMMDD = (date) => date.toISOString().split('T')[0];

    if(calendarView) {
        calendarView.addEventListener('click', (e) => {
            const daySlot = e.target.closest('.day-slot');
            if (!daySlot || daySlot.classList.contains('disabled') || daySlot.classList.contains('full')) return;
            const date = daySlot.dataset.date;
            if (settings.bookingModel === 'slots') {
                if(slotsModalTitle) slotsModalTitle.textContent = `المواعيد المتاحة ليوم ${new Date(date + 'T00:00:00').toLocaleDateString('ar-EG')}`;
                renderTimeSlots(date);
            } else {
                openBookingModal(date);
            }
        });
    }
    
    if(slotsContainer) {
        slotsContainer.addEventListener('click', (e) => {
            const slot = e.target.closest('.time-slot.available');
            if(slot) openBookingModal(slot.dataset.date, slot.dataset.time);
        });
    }
    
    if(bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newBooking = {
                fullName: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                date: hiddenDateInput.value,
                time: hiddenTimeInput.value || null,
                serviceName: "حجز موعد",
                paymentMethod: paymentMethodSelect.value,
                status: 'pending'
            };
            db.ref('bookings').push(newBooking).then((ref) => {
                const date = newBooking.date;
                
                // **** بداية التعديل على نظام الـ ID ****
                // 1. نستخدم العداد اليومي
                const counterRef = db.ref(`dayCounters/${date}`);
                counterRef.transaction(currentCount => (currentCount || 0) + 1).then(transactionResult => {
                    const dailyId = transactionResult.snapshot.val(); // هذا هو رقم الحجز اليومي (1, 2, 3...)
                    
                    // 2. نقوم بتحديث الحجز بالرقم الجديد
                    ref.update({ dailyId: dailyId });
                    
                    // 3. نعرض الرقم للعميل
                    showConfirmationModal(dailyId, newBooking.paymentMethod);
                });
                // **** نهاية التعديل على نظام الـ ID ****
            });
            if(bookingModal) bookingModal.style.display = 'none';
            bookingForm.reset();
        });
    }

    if(prevWeekBtn) prevWeekBtn.addEventListener('click', () => { if (!prevWeekBtn.disabled) { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); }});
    if(nextWeekBtn) nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    if(closeBookingModalBtn) closeBookingModalBtn.onclick = () => { if(bookingModal) bookingModal.style.display = "none"; };
    if(closeSlotsModalBtn) closeSlotsModalBtn.onclick = () => { if(slotsModal) slotsModal.style.display = "none"; };
    if(closeConfirmationModalBtn) closeConfirmationModalBtn.onclick = () => { if(confirmationModal) confirmationModal.style.display = "none"; };
    
    window.onclick = (event) => {
        if (event.target == bookingModal) bookingModal.style.display = "none";
        if (event.target == slotsModal) slotsModal.style.display = "none";
        if (event.target == confirmationModal) confirmationModal.style.display = "none";
    };

    startBookingSystem();
});
