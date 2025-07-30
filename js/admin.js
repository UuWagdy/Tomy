document.addEventListener('DOMContentLoaded', () => {

    // ========== الخطوة الأخيرة: الصق مفاتيح Firebase هنا ==========
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

    // DOM Elements
    const adminContent = document.getElementById('admin-content');
    const passwordPromptDiv = document.getElementById('password-prompt');
    const ADMIN_PASSWORD = 'tomy_admin_123';

    function authenticate() {
        const enteredPassword = prompt('الرجاء إدخال كلمة مرور الأدمن:');
        if (enteredPassword === ADMIN_PASSWORD) {
            adminContent.style.display = 'block';
            passwordPromptDiv.style.display = 'none';
            initializeAdminPanel();
        } else {
            alert('كلمة مرور خاطئة!');
            passwordPromptDiv.innerHTML = '<h2>وصول مرفوض</h2>';
        }
    }

    function initializeAdminPanel() {
        const settingsForm = document.getElementById('settings-form');
        const openingHourInput = document.getElementById('opening-hour');
        const closingHourInput = document.getElementById('closing-hour');
        const pendingList = document.getElementById('pending-bookings-list');
        const approvedList = document.getElementById('approved-bookings-list');
        const reportsTableBody = document.getElementById('reports-table-body');
        
        let bookings = {};
        let settings = { openingHour: '09:00', closingHour: '21:00' };

        const loadSettings = () => {
            openingHourInput.value = settings.openingHour;
            closingHourInput.value = settings.closingHour;
        };

        const renderLists = () => {
            pendingList.innerHTML = '';
            approvedList.innerHTML = '';
            reportsTableBody.innerHTML = '';
            
            const now = new Date();
            const bookingsArray = [];
            for (let id in bookings) {
                bookingsArray.push({ id, ...bookings[id] });
            }
            
            const sortedBookings = bookingsArray.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            
            const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
            const futureApproved = sortedBookings.filter(b => b.status === 'approved' && new Date(b.date + 'T' + b.time) > now);
            const pastApproved = sortedBookings.filter(b => b.status === 'approved' && new Date(b.date + 'T' + b.time) <= now);
            
            if (pendingBookings.length === 0) pendingList.innerHTML = '<p>لا توجد حجوزات معلقة.</p>';
            pendingBookings.forEach(booking => renderBookingItem(booking, pendingList));
            
            if (futureApproved.length === 0) approvedList.innerHTML = '<p>لا توجد حجوزات مؤكدة قادمة.</p>';
            futureApproved.forEach(booking => renderBookingItem(booking, approvedList));

            if (pastApproved.length === 0) reportsTableBody.innerHTML = '<tr><td colspan="4">لا يوجد حجوزات سابقة في السجل.</td></tr>';
            pastApproved.forEach(booking => {
                const row = reportsTableBody.insertRow();
                row.innerHTML = `
                    <td>${booking.fullName}</td>
                    <td>${booking.phone}</td>
                    <td>${new Date(booking.date + 'T00:00:00').toLocaleDateString('ar-EG')}</td>
                    <td>${booking.time}</td>
                `;
            });
        };

        const renderBookingItem = (booking, listElement) => {
            const item = document.createElement('div');
            item.className = `booking-item ${booking.status}`;
            const dateDisplay = new Date(booking.date + 'T00:00:00').toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'long'});
            
            let buttons = '';
            if (booking.status === 'pending') {
                buttons = `
                    <button class="btn btn-primary" onclick="handleBooking('${booking.id}', 'approve')">قبول</button>
                    <button class="btn" onclick="handleBooking('${booking.id}', 'reject')">رفض</button>
                `;
            } else {
                buttons = `<button class="btn" onclick="handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>`;
            }

            item.innerHTML = `
                <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${dateDisplay} - الساعة ${booking.time}</small>
                </div>
                <div>${buttons}</div>
            `;
            listElement.appendChild(item);
        };

        // Firebase Listeners
        db.ref('settings').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) settings = data;
            loadSettings();
        });

        db.ref('bookings').on('value', (snapshot) => {
            bookings = snapshot.val() || {};
            renderLists();
        });

        // Global Actions
        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref('bookings/' + id).update({ status: 'approved' });
            } else {
                db.ref('bookings/' + id).remove();
            }
        };

        // Event Listeners
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newSettings = {
                openingHour: openingHourInput.value,
                closingHour: closingHourInput.value
            };
            db.ref('settings').set(newSettings);
            alert('تم حفظ إعدادات أوقات العمل بنجاح!');
        });
    }
    authenticate();
});
