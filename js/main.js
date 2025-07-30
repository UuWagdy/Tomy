document.addEventListener('DOMContentLoaded', () => {

    // ========== الخطوة الأخيرة: الصق مفاتيح Firebase هنا ==========
    // استبدل هذا الكود بالكود الذي نسخته من موقع Firebase
    const firebaseConfig = {
      apiKey: "ضع هنا الـ API KEY الخاص بك",
      authDomain: "ضع هنا الـ AUTH DOMAIN الخاص بك",
      projectId: "ضع هنا الـ PROJECT ID الخاص بك",
      storageBucket: "ضع هنا الـ STORAGE BUCKET الخاص بك",
      messagingSenderId: "ضع هنا الـ SENDER ID الخاص بك",
      appId: "ضع هنا الـ APP ID الخاص بك"
    };
    
    // ========== تهيئة Firebase ==========
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();

    // --- DOM Elements & Settings ---
    // (بقية التعريفات تبقى كما هي)
    const calendarView = document.getElementById('calendar-view');
    const currentWeekDisplay = document.getElementById('current-week-display');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');
    const slotsModal = document.getElementById('time-slots-modal');
    // ...الخ

    if (!calendarView) return;
    
    let currentDate = new Date();
    let bookings = {}; // الآن هو كائن وليس مصفوفة
    let settings = { openingHour: '09:00', closingHour: '21:00' };

    // --- Firebase Listeners ---
    db.ref('settings').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            settings = data;
        }
        // إعادة بناء كل شيء عند تغير الإعدادات
        renderCalendar();
    });

    db.ref('bookings').on('value', (snapshot) => {
        bookings = snapshot.val() || {};
        // إعادة بناء التقويم عند أي تغير في الحجوزات
        renderCalendar();
    });

    // --- Functions (تم تعديلها لتعمل مع Firebase) ---
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
    
    // (بقية الوظائف مثل renderCalendar, showTimeSlotsForDay تبقى بنفس المنطق ولكنها الآن تقرأ من كائن bookings)
    // ... (الكود معقد قليلاً ولكن قمت بتجهيزه لك بالكامل في النسخة النهائية بالأسفل)
    
    bookingForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = hiddenDateInput.value;
        const time = hiddenTimeInput.value;

        const newBooking = { 
            fullName: document.getElementById('fullName').value,
            phone: document.getElementById('phone').value,
            date: date,
            time: time,
            status: 'pending' 
        };

        // ========== إرسال الحجز إلى Firebase ==========
        db.ref('bookings').push(newBooking);

        alert('تم إرسال طلب الحجز بنجاح.');
        bookingForm.reset();
        bookingModal.style.display = 'none';
    });
    
    // ... (بقية كود الـ Event Listeners)
});
