document.addEventListener('DOMContentLoaded', () => {
    // --- هذا الملف لصفحة الأدمن فقط ---
    const adminContent = document.getElementById('admin-content');
    const passwordPromptDiv = document.getElementById('password-prompt');
    
    // كلمة المرور - يمكنك تغييرها
    const ADMIN_PASSWORD = 'tomy_admin_123'; 

    function authenticate() {
        const enteredPassword = prompt('الرجاء إدخال كلمة مرور الأدمن:');

        if (enteredPassword === ADMIN_PASSWORD) {
            adminContent.style.display = 'block';
            passwordPromptDiv.style.display = 'none';
            initializeAdminPanel();
        } else {
            alert('كلمة مرور خاطئة! لا يمكنك الوصول لهذه الصفحة.');
            // يمكنك إعادة توجيهه لصفحة أخرى إذا أردت
            // window.location.href = 'index.html'; 
            passwordPromptDiv.innerHTML = '<h2>وصول مرفوض</h2><p>كلمة المرور غير صحيحة.</p>';
        }
    }

    function initializeAdminPanel() {
        const pendingList = document.getElementById('pending-bookings-list');
        const approvedList = document.getElementById('approved-bookings-list');
        
        let bookings = JSON.parse(localStorage.getItem('tomyBarberBookings')) || [];

        const saveBookings = () => {
            localStorage.setItem('tomyBarberBookings', JSON.stringify(bookings));
        };

        const renderAdminLists = () => {
            pendingList.innerHTML = '';
            approvedList.innerHTML = '';

            const pendingBookings = bookings.filter(b => b.status === 'pending');
            const approvedBookings = bookings.filter(b => b.status === 'approved');

            if (pendingBookings.length === 0) {
                pendingList.innerHTML = '<p>لا توجد حجوزات معلقة.</p>';
            } else {
                pendingBookings.forEach(booking => {
                    const item = document.createElement('div');
                    item.className = 'booking-item pending';
                    item.innerHTML = `
                        <div>
                            <strong>${booking.fullName}</strong> - ${booking.phone}<br>
                            <small>${booking.date} @ ${booking.time}</small>
                        </div>
                        <div>
                            <button class="btn btn-primary" onclick="approveBooking(${booking.id})">قبول</button>
                            <button class="btn" onclick="rejectBooking(${booking.id})">رفض</button>
                        </div>
                    `;
                    pendingList.appendChild(item);
                });
            }

            if (approvedBookings.length === 0) {
                approvedList.innerHTML = '<p>لا توجد حجوزات مؤكدة.</p>';
            } else {
                 approvedBookings.forEach(booking => {
                    const item = document.createElement('div');
                    item.className = 'booking-item approved';
                    item.innerHTML = `
                        <div>
                            <strong>${booking.fullName}</strong> - ${booking.phone}<br>
                            <small>${booking.date} @ ${booking.time}</small>
                        </div>
                        <div>
                             <button class="btn" onclick="rejectBooking(${booking.id})">إلغاء الحجز</button>
                        </div>
                    `;
                    approvedList.appendChild(item);
                });
            }
        };
        
        window.approveBooking = (id) => {
            const booking = bookings.find(b => b.id === id);
            if (booking) {
                booking.status = 'approved';
                saveBookings();
                renderAdminLists(); // تحديث القوائم
            }
        };

        window.rejectBooking = (id) => {
            bookings = bookings.filter(b => b.id !== id);
            saveBookings();
            renderAdminLists(); // تحديث القوائم
        };
        
        renderAdminLists();
    }

    // --- بدء عملية التحقق من كلمة المرور ---
    authenticate();
});