// Intersection Observer for fade-in animations
document.addEventListener('DOMContentLoaded', () => {
    // نبحث عن كل العناصر التي تحمل كلاس .fade-in
    const fadeInElements = document.querySelectorAll('.fade-in');

    // نتأكد من وجود عناصر لتطبيق الحركة عليها
    if (fadeInElements.length > 0) {
        // ننشئ "المراقب" الذي سيراقب متى يظهر العنصر على الشاشة
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // إذا ظهر العنصر في الشاشة
                if (entry.isIntersecting) {
                    // أضف كلاس .visible لتشغيل الأنيميشن في CSS
                    entry.target.classList.add('visible');
                    // أوقف المراقبة عن هذا العنصر لأنه ظهر بالفعل
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1 // يبدأ الأنيميشن عندما يظهر 10% من العنصر
        });

        // نطلب من المراقب أن يراقب كل عنصر من العناصر التي وجدناها
        fadeInElements.forEach(element => {
            observer.observe(element);
        });
    }
});

// --- (يمكنك وضع باقي أكواد utils.js هنا إذا كان لديك أكواد أخرى مثل showNotification) ---

// Create a notification container on the body
const notificationContainer = document.createElement('div');
notificationContainer.id = 'notification-container';
document.body.appendChild(notificationContainer);

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`; // 'success' or 'error'
    notification.textContent = message;

    notificationContainer.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 4000);
}

document.head.insertAdjacentHTML('beforeend', `
<style>
    #notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .notification {
        padding: 15px 20px;
        border-radius: 8px;
        color: #fff;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(120%);
        transition: transform 0.5s ease-in-out;
    }
    .notification.show {
        transform: translateX(0);
    }
    .notification.success {
        background-color: #2e7d32; /* Green */
    }
    .notification.error {
        background-color: #c62828; /* Red */
    }
</style>
`);
