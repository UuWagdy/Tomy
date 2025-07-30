document.addEventListener('DOMContentLoaded', () => {

    // ========== الخطوة الأخيرة: الصق مفاتيح Firebase هنا ==========
   const firebaseConfig = {
  apiKey: "AIzaSyA2ag4E5xN46wj85EmGvBYdllOHrrLu1I8",
  authDomain: "tomy-barber-shop.firebaseapp.com",
  projectId: "tomy-barber-shop",
  storageBucket: "tomy-barber-shop.firebasestorage.app",
  messagingSenderId: "693769920483",
  appId: "1:693769920483:web:88a3b6cf7318263c540ad6",
  measurementId: "G-HNW5F8YJE3"
};

    // ========== تهيئة Firebase ==========
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // DOM Elements
    const calendarView = document.getElementById('calendar-view');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const slotsModal = document.getElementById('time-slots-modal');
    const closeSlotsModalBtn = document.getElementById('close-slots-modal');
    const slotsModalTitle = document.getElementById('slots-modal-title');
    const slotsContainer = document.getElementById('time-slots-container');
    const bookingModal = document.getElementById('booking-modal');
    const closeBookingModalBtn = document.getElementById('close-booking-modal');
    const bookingForm = document.getElementById('booking-form');
    const selectedSlotDisplay = document.getElementById('selected-slot-display');
    const hiddenDateInput = document.getElementById('selected-date');
    const hiddenTimeInput = document.getElementById('selected-time');

    if (!calendarView) return;

    let currentDate = new Date();
    let bookings = {};
    let settings = { openingHour: '09:00', closingHour: '21:00' };
    let allPossibleSlots = [];

    const toYYYYMMDD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const generateTimeSlots = () => {
        const WORK_START_HOUR = parseInt(settings.openingHour.split(':')[0]);
        const WORK_END_HOUR = parseInt(settings.closingHour.split(':')[0]);
        const SLOT_DURATION_MINUTES = 45;
        const slots = [];
        for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
            for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
                const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };
    
    const renderCalendar = () => {
        allPossibleSlots = generateTimeSlots();
        calendarView.innerHTML = '';
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - (currentDate.getDay() || 7) + 1);

        currentWeekDisplay.textContent = `الأسبوع من ${weekStart.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}`;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        prevWeekBtn.disabled = weekStart <= today;

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayString = toYYYYMMDD(dayDate);

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-slot';
            dayDiv.innerHTML = `<strong>${dayDate.toLocaleDateString('ar-EG', { weekday: 'long' })}</strong><br>${dayDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}`;
            dayDiv.dataset.date = dayString;

            const bookingsArray = Object.values(bookings);
            if (dayDate < today) {
                dayDiv.classList.add('disabled');
            } else {
                const approvedBookingsForDay = bookingsArray.filter(b => b.date === dayString && b.status === 'approved').length;
                if (approvedBookingsForDay >= allPossibleSlots.length) {
                    dayDiv.classList.add('full');
                }
            }
            calendarView.appendChild(dayDiv);
        }
    };
    
    const showTimeSlotsForDay = (dateString) => {
        slotsContainer.innerHTML = '';
        const selectedDate = new Date(dateString + 'T00:00:00');
        slotsModalTitle.textContent = `المواعيد المتاحة ليوم ${selectedDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

        const bookingsArray = Object.values(bookings);
        allPossibleSlots.forEach(time => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';
            slotDiv.textContent = time;
            slotDiv.dataset.date = dateString;
            slotDiv.dataset.time = time;
            
            const existingBooking = bookingsArray.find(b => b.date === dateString && b.time === time);
            if (existingBooking) {
                slotDiv.classList.add(existingBooking.status);
            } else {
                slotDiv.classList.add('available');
            }
            slotsContainer.appendChild(slotDiv);
        });
        slotsModal.style.display = 'block';
    };

    // Firebase Listeners
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) settings = data;
        renderCalendar();
    });

    db.ref('bookings').on('value', (snapshot) => {
        bookings = snapshot.val() || {};
        renderCalendar();
    });

    // Event Listeners
    calendarView.addEventListener('click', (e) => {
        const daySlot = e.target.closest('.day-slot');
        if (daySlot && !daySlot.classList.contains('full') && !daySlot.classList.contains('disabled')) {
            showTimeSlotsForDay(daySlot.dataset.date);
        }
    });

    slotsContainer.addEventListener('click', (e) => {
        const slot = e.target.closest('.time-slot');
        if (slot && slot.classList.contains('available')) {
            hiddenDateInput.value = slot.dataset.date;
            hiddenTimeInput.value = slot.dataset.time;
            selectedSlotDisplay.textContent = `${new Date(slot.dataset.date + 'T00:00:00').toLocaleDateString('ar-EG')} - الساعة ${slot.dataset.time}`;
            slotsModal.style.display = 'none';
            bookingModal.style.display = 'block';
        } else if (slot && (slot.classList.contains('pending') || slot.classList.contains('approved'))) {
            alert('عفواً، هذا الموعد محجوز بالفعل.');
        }
    });

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBooking = { 
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            date: hiddenDateInput.value,
            time: hiddenTimeInput.value,
            status: 'pending' 
        };

        db.ref('bookings').push(newBooking);

        alert('تم إرسال طلب الحجز بنجاح.');
        bookingForm.reset();
        bookingModal.style.display = 'none';
    });
    
    prevWeekBtn.addEventListener('click', () => { if (!prevWeekBtn.disabled) { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); }});
    nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    closeSlotsModalBtn.onclick = () => slotsModal.style.display = "none";
    closeBookingModalBtn.onclick = () => bookingModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == slotsModal) slotsModal.style.display = "none";
        if (event.target == bookingModal) bookingModal.style.display = "none";
    };
});
