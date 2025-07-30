/* ... (كل التنسيقات السابقة تبقى كما هي) ... */

/* Calendar */
.day-slot {
    background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center;
    cursor: pointer; transition: background-color 0.3s, transform 0.2s;
}
.day-slot:hover { background-color: #f0f0f0; transform: translateY(-2px); }
.day-slot.full {
    background-color: #ffebee; border-color: #ef9a9a; color: #c62828; font-weight: bold; cursor: not-allowed;
}

/* Time Slots Modal Styles */
#time-slots-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
    margin-top: 20px;
}

.time-slot {
    padding: 15px 10px;
    border-radius: 5px;
    text-align: center;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.3s, color 0.3s;
}

.time-slot.available {
    background-color: #e8f5e9; /* أخضر فاتح */
    color: #2e7d32;
    border: 1px solid #a5d6a7;
}
.time-slot.available:hover { background-color: #c8e6c9; }

.time-slot.pending {
    background-color: #fffde7; /* أصفر فاتح */
    color: #fbc02d;
    border: 1px solid #fff59d;
    cursor: not-allowed;
    text-decoration: line-through;
}

.time-slot.approved {
    background-color: #ffebee; /* أحمر فاتح */
    color: #c62828;
    border: 1px solid #ef9a9a;
    cursor: not-allowed;
    text-decoration: line-through;
}
