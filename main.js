document.addEventListener('DOMContentLoaded', () => {
    // --- هذا الملف لصفحة المستخدم فقط ---

    // --- DOM Elements ---
    const calendarView = document.getElementById('calendar-view');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const openFormBtn = document.getElementById('open-booking-form');
    const modal = document.getElementById('booking-modal');
    const closeBtn = document.querySelector('.close-button');
    const bookingForm = document.getElementById('booking-form');

    // التأكد من أننا في الصفحة الصحيحة قبل تشغيل الكود
    if (!calendarView) return;

    let currentDate = new Date();
    let bookings = JSON.parse(localStorage.getItem('tomyBarberBookings')) || [];

    const saveBookings = () => {
        localStorage.setItem('tomyBarberBookings', JSON.stringify(bookings));
    };

    // --- Calendar Logic (User View) ---
    const renderCalendar = () => {
        calendarView.innerHTML = '';
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1)); // Start on Monday

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        currentWeekDisplay.textContent = `الأسبوع من ${weekStart.toLocaleDateString('ar-EG')} إلى ${weekEnd.toLocaleDateString('ar-EG')}`;

        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);

            const dayDiv = document.createElement('div');
            dayDiv.className = 'day-slot';
            dayDiv.innerHTML = `<strong>${day.toLocaleDateString('ar-EG', { weekday: 'long' })}</strong><br>${day.toLocaleDateString('ar-EG')}`;
            
            // المستخدم يرى فقط الأيام المحجوزة بعد الموافقة
            const isBooked = bookings.some(b => b.status === 'approved' && new Date(b.date).toDateString() === day.toDateString());

            if (isBooked) {
                dayDiv.classList.add('booked');
            }
            
            calendarView.appendChild(dayDiv);
        }
    };

    // --- Event Listeners ---
    prevWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 7);
        renderCalendar();
    });

    nextWeekBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 7);
        renderCalendar();
    });

    openFormBtn.addEventListener('click', () => modal.style.display = 'block');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const newBooking = {
            id: Date.now(),
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            status: 'pending' // دائماً يبدأ كطلب معلق
        };

        bookings.push(newBooking);
        saveBookings();

        alert('تم إرسال طلب الحجز بنجاح. سيتم تأكيد الموعد من قبل الأدمن.');
        
        bookingForm.reset();
        modal.style.display = 'none';
    });

    // --- Initial Load ---
    renderCalendar();
});