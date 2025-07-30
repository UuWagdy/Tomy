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
    const auth = firebase.auth();

    const adminContent = document.getElementById('admin-content');
    const logoutButton = document.getElementById('logout-btn');

    function initializeAdminPanel() {
        adminContent.style.display = 'block';

        // DOM Elements
        const settingsForm = document.getElementById('settings-form');
        const openingHourInput = document.getElementById('opening-hour');
        const closingHourInput = document.getElementById('closing-hour');

        const serviceForm = document.getElementById('service-form');
        const serviceNameInput = document.getElementById('service-name');
        const serviceDurationInput = document.getElementById('service-duration');
        const servicesList = document.getElementById('services-list');

        const blockDateForm = document.getElementById('block-date-form');
        const blockDateInput = document.getElementById('block-date-input');

        const searchInput = document.getElementById('search-booking');
        const pendingList = document.getElementById('pending-bookings-list');
        const approvedList = document.getElementById('approved-bookings-list');
        const reportsTableBody = document.getElementById('reports-table-body');
        
        // Dashboard stats
        const pendingCount = document.getElementById('pending-count');
        const approvedCount = document.getElementById('approved-count');
        const pastCount = document.getElementById('past-count');

        // Edit Modal
        const editModal = document.getElementById('edit-booking-modal');
        const closeEditModalBtn = document.getElementById('close-edit-modal');
        const editBookingForm = document.getElementById('edit-booking-form');
        const editFullName = document.getElementById('edit-fullName');
        const editPhone = document.getElementById('edit-phone');
        const hiddenBookingId = document.getElementById('edit-booking-id');

        let bookings = {};
        let services = {};
        let settings = { openingHour: '09:00', closingHour: '21:00' };

        // --- Data Loading and Rendering ---
        const loadSettings = () => {
            openingHourInput.value = settings.openingHour;
            closingHourInput.value = settings.closingHour;
        };

        const renderServices = () => {
            servicesList.innerHTML = '';
            for (const id in services) {
                const service = services[id];
                const item = document.createElement('div');
                item.className = 'booking-item';
                item.innerHTML = `
                    <div><strong>${service.name}</strong> - ${service.duration} دقيقة</div>
                    <div><button class="btn" onclick="deleteService('${id}')">حذف</button></div>
                `;
                servicesList.appendChild(item);
            }
        };

        const renderLists = () => {
            const searchTerm = searchInput.value.toLowerCase();
            pendingList.innerHTML = '';
            approvedList.innerHTML = '';
            reportsTableBody.innerHTML = '';
            
            const now = new Date();
            const bookingsArray = [];
            for (let id in bookings) {
                bookingsArray.push({ id, ...bookings[id] });
            }
            
            const filteredBookings = bookingsArray.filter(b => 
                b.fullName.toLowerCase().includes(searchTerm) || b.phone.includes(searchTerm)
            );

            const sortedBookings = filteredBookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));
            
            const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
            const futureApproved = sortedBookings.filter(b => b.status === 'approved' && new Date(b.date + 'T' + b.time) > now);
            const pastApproved = sortedBookings.filter(b => b.status === 'approved' && new Date(b.date + 'T' + b.time) <= now);
            
            // Update dashboard
            pendingCount.textContent = pendingBookings.length;
            approvedCount.textContent = futureApproved.length;
            pastCount.textContent = pastApproved.length;

            if (pendingBookings.length === 0) pendingList.innerHTML = '<p>لا توجد حجوزات معلقة.</p>';
            pendingBookings.forEach(booking => renderBookingItem(booking, pendingList));
            
            if (futureApproved.length === 0) approvedList.innerHTML = '<p>لا توجد حجوزات مؤكدة قادمة.</p>';
            futureApproved.forEach(booking => renderBookingItem(booking, approvedList));

            if (pastApproved.length === 0) reportsTableBody.innerHTML = '<tr><td colspan="5">لا يوجد حجوزات سابقة في السجل.</td></tr>';
            pastApproved.forEach(booking => {
                const row = reportsTableBody.insertRow();
                row.innerHTML = `
                    <td>${booking.fullName}</td>
                    <td>${booking.phone}</td>
                    <td>${booking.serviceName}</td>
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
            } else { // Approved
                buttons = `<button class="btn" onclick="handleBooking('${booking.id}', 'reject')">إلغاء الحجز</button>`;
            }
            buttons += `<button class="btn" onclick="openEditModal('${booking.id}')">تعديل</button>`;

            item.innerHTML = `
                <div>
                    <strong>${booking.fullName}</strong> (${booking.phone})<br>
                    <small>${dateDisplay} - الساعة ${booking.time}</small><br>
                    <em>الخدمة: ${booking.serviceName || 'غير محدد'}</em>
                </div>
                <div>${buttons}</div>
            `;
            listElement.appendChild(item);
        };

        // --- Firebase Listeners ---
        db.ref('settings').on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) settings = data;
            loadSettings();
        });

        db.ref('services').on('value', (snapshot) => {
            services = snapshot.val() || {};
            renderServices();
        });

        db.ref('bookings').on('value', (snapshot) => {
            bookings = snapshot.val() || {};
            renderLists();
        });

        // --- Global Actions (attached to window) ---
        window.handleBooking = (id, action) => {
            if (action === 'approve') {
                db.ref('bookings/' + id).update({ status: 'approved' })
                    .then(() => showNotification('تم قبول الحجز بنجاح', 'success'));
            } else { // Reject or Cancel
                db.ref('bookings/' + id).remove()
                    .then(() => showNotification('تم إزالة الحجز بنجاح', 'success'));
            }
        };

        window.deleteService = (id) => {
            if (confirm('هل أنت متأكد من رغبتك في حذف هذه الخدمة؟')) {
                db.ref('services/' + id).remove()
                    .then(() => showNotification('تم حذف الخدمة', 'success'));
            }
        };
        
        window.openEditModal = (id) => {
            const booking = bookings[id];
            if(booking){
                hiddenBookingId.value = id;
                editFullName.value = booking.fullName;
                editPhone.value = booking.phone;
                editModal.style.display = 'block';
            }
        };

        // --- Event Listeners ---
        logoutButton.addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.href = 'index.html';
            });
        });

        searchInput.addEventListener('input', renderLists);

        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newSettings = {
                openingHour: openingHourInput.value,
                closingHour: closingHourInput.value
            };
            db.ref('settings').set(newSettings)
                .then(() => showNotification('تم حفظ الإعدادات بنجاح!', 'success'));
        });

        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newService = {
                name: serviceNameInput.value,
                duration: serviceDurationInput.value
            };
            db.ref('services').push(newService)
                .then(() => {
                    showNotification('تم إضافة الخدمة بنجاح!', 'success');
                    serviceForm.reset();
                });
        });
        
        blockDateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const dateToBlock = blockDateInput.value;
            if(dateToBlock) {
                db.ref('blockedDates').child(dateToBlock).set(true)
                .then(() => showNotification(`تم إغلاق يوم ${dateToBlock} للحجوزات.`, 'success'));
            }
        });

        editBookingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = hiddenBookingId.value;
            const updatedData = {
                fullName: editFullName.value,
                phone: editPhone.value
            };
            db.ref('bookings/' + id).update(updatedData)
                .then(() => {
                    showNotification('تم تحديث بيانات الحجز', 'success');
                    editModal.style.display = 'none';
                });
        });

        closeEditModalBtn.onclick = () => editModal.style.display = "none";
        window.onclick = (event) => {
            if (event.target == editModal) editModal.style.display = "none";
        };
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            initializeAdminPanel();
        } else {
            window.location.replace('login.html');
        }
    });
});
```---
### **`admin.html` (Updated)**
*(Completely redesigned to include the new features like dashboard, service management, etc.)*

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لوحة التحكم - Tomy Barber Shop</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <header>
        <nav class="container">
            <a href="index.html" class="logo-link"><img src="logo.png" alt="Tomy Barber Shop Logo" class="logo"></a>
            <h2>لوحة تحكم الأدمن</h2>
            <button id="logout-btn" class="btn">تسجيل الخروج</button>
        </nav>
    </header>

    <main class="container page-padding" id="admin-content" style="display: none;">
        
        <!-- Dashboard Section -->
        <section id="dashboard-section">
            <h2>نظرة عامة</h2>
            <div class="dashboard-grid">
                <div class="stat-card">
                    <h3>حجوزات معلقة</h3>
                    <p id="pending-count">0</p>
                </div>
                <div class="stat-card">
                    <h3>حجوزات قادمة</h3>
                    <p id="approved-count">0</p>
                </div>
                 <div class="stat-card">
                    <h3>حجوزات مكتملة</h3>
                    <p id="past-count">0</p>
                </div>
            </div>
        </section>

        <!-- Management Grids -->
        <div class="management-grid">
            <!-- Settings Section -->
            <section id="settings-section">
                <h2>الإعدادات العامة</h2>
                <form id="settings-form">
                    <div class="form-group">
                        <label for="opening-hour">ساعة بدء العمل:</label>
                        <input type="time" id="opening-hour" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="closing-hour">ساعة انتهاء العمل:</label>
                        <input type="time" id="closing-hour" class="form-control" required>
                    </div>
                    <button type="submit" class="btn btn-primary">حفظ الإعدادات</button>
                </form>
                <hr>
                <form id="block-date-form">
                    <div class="form-group">
                        <label for="block-date-input">إغلاق يوم معين:</label>
                        <input type="date" id="block-date-input" class="form-control" required>
                    </div>
                    <button type="submit" class="btn">إغلاق اليوم</button>
                </form>
            </section>

            <!-- Services Management Section -->
            <section id="services-management-section">
                <h2>إدارة الخدمات</h2>
                <form id="service-form">
                    <div class="form-group">
                        <label for="service-name">اسم الخدمة:</label>
                        <input type="text" id="service-name" class="form-control" placeholder="مثال: قص شعر" required>
                    </div>
                    <div class="form-group">
                        <label for="service-duration">مدة الخدمة (بالدقائق):</label>
                        <input type="number" id="service-duration" class="form-control" placeholder="مثال: 30" required min="15" step="5">
                    </div>
                    <button type="submit" class="btn btn-primary">إضافة خدمة</button>
                </form>
                <div id="services-list" class="item-list"></div>
            </section>
        </div>


        <!-- Bookings Section -->
        <section id="bookings-management-section">
            <h2>إدارة الحجوزات</h2>
            <input type="text" id="search-booking" class="form-control" placeholder="ابحث بالاسم أو رقم الهاتف...">
            
            <div id="admin-section">
                <h3>الحجوزات المعلقة</h3>
                <div id="pending-bookings-list"></div>
            </div>
            
            <div id="approved-section">
                <h3>الحجوزات المؤكدة (القادمة)</h3>
                <div id="approved-bookings-list"></div>
            </div>
        </section>

        <!-- Reports Section -->
        <section id="reports-section">
            <h2>سجل الحجوزات المكتملة</h2>
            <table class="reports-table">
                <thead>
                    <tr>
                        <th>الاسم الكامل</th>
                        <th>رقم الهاتف</th>
                        <th>الخدمة</th>
                        <th>التاريخ</th>
                        <th>الوقت</th>
                    </tr>
                </thead>
                <tbody id="reports-table-body"></tbody>
            </table>
        </section>
    </main>

    <!-- Edit Booking Modal -->
    <div id="edit-booking-modal" class="modal">
        <div class="modal-content">
            <span class="close-button" id="close-edit-modal">×</span>
            <h3>تعديل بيانات الحجز</h3>
            <form id="edit-booking-form">
                <input type="hidden" id="edit-booking-id">
                <label for="edit-fullName">الاسم الكامل:</label>
                <input type="text" id="edit-fullName" required>
                <label for="edit-phone">رقم الهاتف:</label>
                <input type="tel" id="edit-phone" required>
                <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
            </form>
        </div>
    </div>

    <footer>
        <p>© 2025 Tomy Barber Shop. جميع الحقوق محفوظة.</p>
    </footer>

    <!-- Firebase Libraries -->
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-database-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
    
    <!-- Scripts -->
    <script src="js/utils.js"></script>
    <script src="js/admin.js"></script>
</body>
</html>
