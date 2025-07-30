document.addEventListener('DOMContentLoaded', () => {

    // --- إعدادات العمل ---
    const WORK_START_HOUR = 9; // 9 صباحًا
    const WORK_END_HOUR = 21; // 9 مساءً
    const SLOT_DURATION_MINUTES = 45;

    // --- DOM Elements ---
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
    let bookings = JSON.parse(localStorage.getItem('tomyBarberBookings')) || [];

    // --- وظائف مساعدة ---
    const saveBookings = () => localStorage.setItem('tomyBarberBookings', JSON.stringify(bookings));
    
    // وظيفة لإنشاء قائمة بكل المواعيد الممكنة في يوم
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
            for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
                const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
                slots.push(time);
            }
        }
        return slots;
    };
    const allPossibleSlots = generateTimeSlots();

    // --- Calendar Logic ---
    const renderCalendar = () => {
        calendarView.innerHTML = '';
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1)); // Start Monday

        currentWeekDisplay.textContent = `الأسبوع من ${weekStart.toLocaleDateString('ar-EG')}`;

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(weekStart);
            dayDate.setDate(weekStart.getDate() + i);
            const dayString = dayDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-slot';
            dayDiv.innerHTML = `<strong>${dayDate.toLocaleDateString('ar-EG', { weekday: 'long' })}</strong><br>${dayDate.toLocaleDateString('ar-EG')}`;
            dayDiv.dataset.date = dayString;

            // التحقق إذا كان اليوم ممتلئاً بالكامل
            const approvedBookingsForDay = bookings.filter(b => b.date === dayString && b.status === 'approved').length;
            if (approvedBookingsForDay >= allPossibleSlots.length) {
                dayDiv.classList.add('full');
            }
            
            calendarView.appendChild(dayDiv);
        }
    };
    
    // --- Time Slots Logic ---
    const showTimeSlotsForDay = (dateString) => {
        slotsContainer.innerHTML = '';
        const selectedDate = new Date(dateString);
        slotsModalTitle.textContent = `المواعيد المتاحة ليوم ${selectedDate.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;

        allPossibleSlots.forEach(time => {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'time-slot';
            slotDiv.textContent = time;
            slotDiv.dataset.date = dateString;
            slotDiv.dataset.time = time;

            const existingBooking = bookings.find(b => b.date === dateString && b.time === time);

            if (existingBooking) {
                slotDiv.classList.add(existingBooking.status); // 'pending' or 'approved'
            } else {
                slotDiv.classList.add('available');
            }
            slotsContainer.appendChild(slotDiv);
        });
        slotsModal.style.display = 'block';
    };

    // --- Event Listeners ---
    calendarView.addEventListener('click', (e) => {
        const daySlot = e.target.closest('.day-slot');
        if (daySlot && !daySlot.classList.contains('full')) {
            showTimeSlotsForDay(daySlot.dataset.date);
        }
    });

    slotsContainer.addEventListener('click', (e) => {
        const slot = e.target.closest('.time-slot');
        if (slot && slot.classList.contains('available')) {
            hiddenDateInput.value = slot.dataset.date;
            hiddenTimeInput.value = slot.dataset.time;
            selectedSlotDisplay.textContent = `${new Date(slot.dataset.date).toLocaleDateString('ar-EG')} - الساعة ${slot.dataset.time}`;
            slotsModal.style.display = 'none';
            bookingModal.style.display = 'block';
        } else if (slot && (slot.classList.contains('pending') || slot.classList.contains('approved'))) {
            alert('عفواً، هذا الموعد محجوز بالفعل.');
        }
    });

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = hiddenDateInput.value;
        const time = hiddenTimeInput.value;

        // إعادة التحقق مرة أخرى قبل الحفظ النهائي
        if (bookings.some(b => b.date === date && b.time === time)) {
            alert('عفواً، لقد تم حجز هذا الموعد للتو من قبل شخص آخر. الرجاء اختيار موعد آخر.');
            return;
        }

        const newBooking = {
            id: Date.now(),
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            date: date,
            time: time,
            status: 'pending'
        };

        bookings.push(newBooking);
        saveBookings();
        alert('تم إرسال طلب الحجز بنجاح. سيتم تأكيد الموعد من قبل الأدمن.');
        
        bookingForm.reset();
        bookingModal.style.display = 'none';
        renderCalendar(); // تحديث التقويم لاحتمالية امتلاء اليوم
    });

    // التنقل بين الأسابيع
    prevWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() - 7); renderCalendar(); });
    nextWeekBtn.addEventListener('click', () => { currentDate.setDate(currentDate.getDate() + 7); renderCalendar(); });
    
    // إغلاق النوافذ المنبثقة
    closeSlotsModalBtn.onclick = () => slotsModal.style.display = "none";
    closeBookingModalBtn.onclick = () => bookingModal.style.display = "none";
    window.onclick = (event) => {
        if (event.target == slotsModal) slotsModal.style.display = "none";
        if (event.target == bookingModal) bookingModal.style.display = "none";
    };

    // --- Initial Load ---
    renderCalendar();
});```

#### 📁 ملف `js/admin.js` (تعديل طفيف لتحسين العرض)

تم تحسين طريقة العرض لتكون أكثر وضوحاً للأدمن.

```javascript
// ... (كود التحقق من كلمة المرور يبقى كما هو) ...

function initializeAdminPanel() {
    // ...
    const renderAdminLists = () => {
        // ...
        // ترتيب الحجوزات حسب التاريخ والوقت
        const sortedBookings = bookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

        const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
        const approvedBookings = sortedBookings.filter(b => b.status === 'approved');

        // ... (بقية الكود مع التعديل على العرض) ...
        // مثال على تعديل العرض داخل حلقة forEach
        pendingBookings.forEach(booking => {
            const item = document.createElement('div');
            item.className = 'booking-item pending';
            item.innerHTML = `
                <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${new Date(booking.date).toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'long'})} - الساعة ${booking.time}</small>
                </div>
                <div>
                    <button class="btn btn-primary" onclick="approveBooking(${booking.id})">قبول</button>
                    <button class="btn" onclick="rejectBooking(${booking.id})">رفض</button>
                </div>
            `;
            pendingList.appendChild(item);
        });
        
        approvedBookings.forEach(booking => {
            const item = document.createElement('div');
            item.className = 'booking-item approved';
            item.innerHTML = `
                 <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${new Date(booking.date).toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'long'})} - الساعة ${booking.time}</small>
                </div>
                <div>
                     <button class="btn" onclick="rejectBooking(${booking.id})">إلغاء الحجز</button>
                </div>
            `;
            approvedList.appendChild(item);
        });
    };
    // ...
}

// ... (بقية الكود) ...
