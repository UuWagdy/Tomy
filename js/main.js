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

    // DOM Elements
    const serviceSelection = document.getElementById('service-selection');
    const calendarSection = document.getElementById('calendar-section');
    const calendarView = document.getElementById('calendar-view');
    const calendarLoader = document.getElementById('calendar-loader');
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
    const hiddenServiceIdInput = document.getElementById('selected-service-id');
    const hiddenServiceNameInput = document.getElementById('selected-service-name');

    if (!calendarView) return;

    let currentDate = new Date();
    let bookings = {};
    let services = {};
    let blockedDates = {};
    let settings = { openingHour: '09:00', closingHour: '21:00' };

    const toYYYYMMDD = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const timeStringToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const generateTimeSlots = (dateString) => {
        const selectedServiceId = serviceSelection.value;
        if (!selectedServiceId || !services[selectedServiceId]) return [];
        
        const serviceDuration = parseInt(services[selectedServiceId].duration, 10);
        const openingTime = timeStringToMinutes(settings.openingHour);
        const closingTime = timeStringToMinutes(settings.closingHour);
        const allSlots = [];

        // Generate potential slots based on service duration
        for (let time = openingTime; time <= closingTime - serviceDuration; time += serviceDuration) {
            const hour = Math.floor(time / 60);
            const min = time % 60;
            allSlots.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
        }
        
        // Filter out slots that conflict with existing approved bookings
        const approvedBookingsForDay = Object.values(bookings).filter(b => b.date === dateString && b.status === 'approved');
        
        return allSlots.filter(slot => {
            const slotStart = timeStringToMinutes(slot);
            const slotEnd = slotStart + serviceDuration;

            // Check for overlap with any approved booking
            return !approvedBookingsForDay.some(booking => {
                const bookingService = Object.values(services).find(s => s.name === booking.serviceName);
                if (!bookingService) return false;

                const bookingStart = timeStringToMinutes(booking.time);
                const bookingEnd = bookingStart + parseInt(bookingService.duration, 10);

                // True if there is an overlap
                return slotStart < bookingEnd && slotEnd > bookingStart;
            });
        });
    };
    
    const renderCalendar = () => {
        calendarLoader.style.display = 'none';
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

            if (dayDate < today || blockedDates[dayString]) {
                dayDiv.classList.add('disabled');
                 if(blockedDates[dayString]) dayDiv.innerHTML += '<br><small>(مغلق)</small>';
            } else {
                const possibleSlots = generateTimeSlots(dayString);
                const bookingsForDay = Object.values(bookings).filter(b => b.date === dayString && (b.status === 'approved' || b.status === 'pending')).length;
                if (possibleSlots.length === 0 && bookingsForDay > 5) { // Heuristic for 'full'
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
        
        const possibleSlots = generateTimeSlots(dateString);
        if(possibleSlots.length === 0){
             slotsContainer.innerHTML = '<p>عفواً، لا توجد مواعيد متاحة في هذا اليوم لهذه الخدمة. الرجاء اختيار يوم آخر أو خدمة أخرى.</p>';
        }

        possibleSlots.forEach(time => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot available'; // Now we only show available slots
            slotDiv.textContent = time;
            slotDiv.dataset.date = dateString;
            slotDiv.dataset.time = time;
            slotsContainer.appendChild(slotDiv);
        });
        slotsModal.style.display = 'block';
    };

    const loadServices = () => {
        db.ref('services').on('value', (snapshot) => {
            services = snapshot.val() || {};
            serviceSelection.innerHTML = '<option value="" disabled selected>-- الرجاء اختيار الخدمة أولاً --</option>';
            for (const id in services) {
                const service = services[id];
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${service.name} (${service.duration} دقيقة)`;
                serviceSelection.appendChild(option);
            }
        });
    };

    // --- Firebase Listeners ---
    const fetchData = () => {
        calendarLoader.style.display = 'block';
        const promises = [
            db.ref('settings').once('value'),
            db.ref('bookings').once('value'),
            db.ref('blockedDates').once('value')
        ];

        Promise.all(promises).then((snapshots) => {
            settings = snapshots[0].val() || settings;
            bookings = snapshots[1].val() || {};
            blockedDates = snapshots[2].val() || {};
            renderCalendar();

            // Setup listeners for real-time updates
            db.ref('bookings').on('value', (snapshot) => {
                bookings = snapshot.val() || {};
                renderCalendar();
            });
            db.ref('blockedDates').on('value', (snapshot) => {
                blockedDates = snapshot.val() || {};
                renderCalendar();
            });
        });
    };

    // --- Event Listeners ---
    serviceSelection.addEventListener('change', () => {
        if (serviceSelection.value) {
            calendarSection.style.display = 'block';
            fetchData();
        } else {
            calendarSection.style.display = 'none';
        }
    });

    calendarView.addEventListener('click', (e) => {
        const daySlot = e.target.closest('.day-slot');
        if (daySlot && !daySlot.classList.contains('full') && !daySlot.classList.contains('disabled')) {
            showTimeSlotsForDay(daySlot.dataset.date);
        }
    });

    slotsContainer.addEventListener('click', (e) => {
        const slot = e.target.closest('.time-slot');
        if (slot && slot.classList.contains('available')) {
            const selectedServiceId = serviceSelection.value;
            const selectedService = services[selectedServiceId];

            hiddenDateInput.value = slot.dataset.date;
            hiddenTimeInput.value = slot.dataset.time;
            hiddenServiceIdInput.value = selectedServiceId;
            hiddenServiceNameInput.value = selectedService.name;

            selectedSlotDisplay.textContent = `(${selectedService.name}) يوم ${new Date(slot.dataset.date + 'T00:00:00').toLocaleDateString('ar-EG')} - الساعة ${slot.dataset.time}`;
            slotsModal.style.display = 'none';
            bookingModal.style.display = 'block';
        }
    });

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newBooking = { 
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            serviceId: hiddenServiceIdInput.value,
            serviceName: hiddenServiceNameInput.value,
            date: hiddenDateInput.value,
            time: hiddenTimeInput.value,
            status: 'pending' 
        };

        db.ref('bookings').push(newBooking).then(() => {
            showNotification('تم إرسال طلب الحجز بنجاح.', 'success');
            bookingForm.reset();
            bookingModal.style.display = 'none';
        }).catch(err => {
            showNotification('حدث خطأ أثناء إرسال الحجز.', 'error');
        });
    });
    
    prevWeekBtn.addEventListener('click', () => { if (!prevWeekBtn.disabled) { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); }});
    nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    closeSlotsModalBtn.onclick = () => slotsModal.style.display = "none";
    closeBookingModalBtn.onclick = () => bookingModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == slotsModal) slotsModal.style.display = "none";
        if (event.target == bookingModal) bookingModal.style.display = "none";
    };

    // Initial Load
    loadServices();
});
