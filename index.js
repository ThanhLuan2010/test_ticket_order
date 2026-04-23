const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3300;
const DATA_FILE = path.join(__dirname, 'bookings.json');

// Helper to read data
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

// Helper to write data
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
};


// Middleware đọc JSON
app.use(express.json());
/**
 * API Chức năng đặt vé
 * Fields: Tên, điểm đi, điểm đến, tên nhà xe, ngày đi, giờ đi, số lượng vé,
 * có bào gồm trẻ em hay hành lý không, điểm đón trả cụ thể,
 * múc đích chuyến đi (optional), ghi chú (optional)
 */

// API Lấy danh sách đặt vé
app.get('/api/bookings', (req, res) => {
    const bookings = readData();
    res.json(bookings);
});

// API Đặt vé mới
app.post('/api/bookings', (req, res) => {
    const {
        fullName,
        departurePoint,
        destination,
        busCompany,
        departureDate,
        departureTime,
        ticketQuantity,
        includesChildrenOrLuggage,
        pickupDropoffPoints,
        tripPurpose,
        notes
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!fullName || !departurePoint || !destination || !busCompany ||
        !departureDate || !departureTime || !ticketQuantity ||
        includesChildrenOrLuggage === undefined || !pickupDropoffPoints) {
        return res.status(400).json({
            message: "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại."
        });
    }

    const bookings = readData();

    const newBooking = {
        id: Date.now(),
        fullName,
        departurePoint,
        destination,
        busCompany,
        departureDate,
        departureTime,
        ticketQuantity,
        includesChildrenOrLuggage,
        pickupDropoffPoints,
        tripPurpose: tripPurpose || "",
        notes: notes || "",
        createdAt: new Date().toISOString()
    };

    bookings.push(newBooking);
    writeData(bookings);

    res.status(201).json({
        message: "Đặt vé thành công!",
        data: newBooking
    });
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server chạy tại http://localhost:${PORT}`);
    });
}

module.exports = app;

