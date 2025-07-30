document.addEventListener('DOMContentLoaded', () => {
    
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
            alert('كلمة مرور خاطئة! لا يمكنك الوصول لهذه الصفحة.');
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

            const sortedBookings = bookings.sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time));

            const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
            const approvedBookings = sortedBookings.filter(b => b.status === 'approved');

            if (pendingBookings.length === 0) {
                pendingList.innerHTML = '<p>لا توجد حجوزات معلقة.</p>';
            } else {
                pendingBookings.forEach(booking => {
                    const item = document.createElement('div');
                    item.className = 'booking-item pending';
                    item.innerHTML = `
                        <div>
                            <strong>${booking.fullName}</strong> (${booking.phone})<br>
                            <small>${new Date(booking.date + 'T00:00:00').toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'long'})} - الساعة ${booking.time}</small>
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
                            <strong>${booking.fullName}</strong> (${booking.phone})<br>
                            <small>${new Date(booking.date + 'T00:00:00').toLocaleDateString('ar-EG', {weekday: 'long', day: 'numeric', month: 'long'})} - الساعة ${booking.time}</small>
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
            const bookingIndex = bookings.findIndex(b => b.id === id);
            if (bookingIndex > -1) {
                bookings[bookingIndex].status = 'approved';
                saveBookings();
                renderAdminLists();
            }
        };

        window.rejectBooking = (id) => {
            bookings = bookings.filter(b => b.id !== id);
            saveBookings();
            renderAdminLists();
        };
        
        renderAdminLists();
    }

    authenticate();
});
