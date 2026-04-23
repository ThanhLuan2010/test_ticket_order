const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3300;
// Lưu trữ trong biến (In-memory storage)
// CẢNH BÁO: Dữ liệu sẽ bị mất mỗi khi server restart hoặc Vercel Cold Start
let bookingsStore = [];
let shippingStore = [];

// Helper to read data (nay lấy từ biến)
const readData = () => bookingsStore;
const writeData = (data) => {
    bookingsStore = data;
};

// Helper cho shipping (nay lấy từ biến)
const getShippingStore = () => shippingStore;
const setShippingStore = (data) => {
    shippingStore = data;
};

// Helper tạo ID ngẫu nhiên 3 chữ số (100-999)
const generateShortId = (store) => {
    let id;
    do {
        id = Math.floor(Math.random() * 900) + 100;
    } while (store.some(item => item.id === id));
    return id;
};


// Middleware đọc JSON
app.use(express.json());
/**
 * API Chức năng đặt vé
 * Fields: Tên, Sđt, điểm đi, điểm đến, tên nhà xe, ngày đi, giờ đi, số lượng vé,
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
        phoneNumber,
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
    if (!fullName || !phoneNumber || !departurePoint || !destination || !busCompany ||
        !departureDate || !departureTime || !ticketQuantity ||
        includesChildrenOrLuggage === undefined || !pickupDropoffPoints) {
        return res.status(400).json({
            message: "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại."
        });
    }

    const bookings = readData();

    const newBooking = {
        id: generateShortId(bookings),
        fullName,
        phoneNumber,
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

// API Tìm kiếm vé (theo bất kỳ thông tin nào)
app.get('/api/bookings/search', (req, res) => {
    const q = req.query.q || (req.body && req.body.q);
    if (!q) {
        return res.status(400).json({ message: "Vui lòng cung cấp từ khóa tìm kiếm (q=...)" });
    }

    const bookings = readData();
    const query = typeof q === 'string' ? q?.toLowerCase() : q;

    const results = bookings.filter(booking => {
        return Object.values(booking).some(value =>
            String(value).toLowerCase().includes(query)
        );
    });

    res.json({
        data: results[0],
        messgae: "Lấy thông tin thành công"
    });
});

// API Chỉnh sửa vé (đổi giờ, thông tin...)
app.put('/api/bookings', (req, res) => {
    const { id, ...updates } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Vui lòng cung cấp ID vé trong body." });
    }

    let bookings = readData();

    const index = bookings.findIndex(b => b.id === parseInt(id));
    if (index === -1) {
        return res.status(404).json({ message: "Không tìm thấy vé với ID này." });
    }

    // Cập nhật các trường gửi lên, trừ các trường hệ thống
    const allowedUpdates = [
        'fullName', 'phoneNumber', 'departurePoint', 'destination', 'busCompany',
        'departureDate', 'departureTime', 'ticketQuantity',
        'includesChildrenOrLuggage', 'pickupDropoffPoints', 'tripPurpose', 'notes'
    ];

    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
            bookings[index][key] = updates[key];
        }
    });

    bookings[index].updatedAt = new Date().toISOString();
    writeData(bookings);

    res.json({
        message: "Cập nhật vé thành công!",
        data: bookings[index]
    });
});

// API Huỷ vé
app.delete('/api/bookings', (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Vui lòng cung cấp ID vé trong body." });
    }

    let bookings = readData();

    const initialLength = bookings.length;
    let filteredBookings = bookings.filter(b => b.id !== parseInt(id));

    if (filteredBookings.length === initialLength) {
        return res.status(404).json({ message: "Không tìm thấy vé với ID này." });
    }

    writeData(filteredBookings);

    res.json({
        message: "Huỷ vé thành công!"
    });
});

/**
 * API Chức năng gửi hàng
 * Fields: Tên khách, Loại hàng, Số lượng kiện hàng, Khối lượng, 
 * Gửi từ, Đến, Sđt người gửi, Sđt người nhận
 */

// API Lấy danh sách gửi hàng
app.get('/api/shipping', (req, res) => {
    const shipping = getShippingStore();
    res.json(shipping);
});

// API Gửi hàng mới
app.post('/api/shipping', (req, res) => {
    const {
        customerName,
        itemType,
        packageQuantity,
        weight,
        senderPoint,
        receiverPoint,
        senderPhone,
        receiverPhone
    } = req.body;

    // Kiểm tra các trường bắt buộc
    if (!customerName || !itemType || !packageQuantity || !weight ||
        !senderPoint || !receiverPoint || !senderPhone || !receiverPhone) {
        return res.status(400).json({
            message: "Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại."
        });
    }

    const shippingList = getShippingStore();

    const newShipping = {
        id: generateShortId(shippingList),
        customerName,
        itemType,
        packageQuantity,
        weight,
        senderPoint,
        receiverPoint,
        senderPhone,
        receiverPhone,
        createdAt: new Date().toISOString()
    };

    shippingList.push(newShipping);
    setShippingStore(shippingList);

    res.status(201).json({
        message: "Gửi hàng thành công!",
        data: newShipping
    });
});

// API Tìm kiếm đơn gửi hàng
app.get('/api/shipping/search', (req, res) => {
    const q = req.query.q || (req.body && req.body.q);
    if (!q) {
        return res.status(400).json({ message: "Vui lòng cung cấp từ khóa tìm kiếm (q=...)" });
    }

    const shippingList = getShippingStore();
    const query = typeof q === 'string' ? q?.toLowerCase() : q;

    const results = shippingList.filter(item => {
        return Object.values(item).some(value =>
            String(value).toLowerCase().includes(query)
        );
    });

    res.json(results);
});

// API Chỉnh sửa đơn gửi hàng
app.put('/api/shipping', (req, res) => {
    const { id, ...updates } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Vui lòng cung cấp ID đơn hàng trong body." });
    }

    let shippingList = getShippingStore();

    const index = shippingList.findIndex(s => s.id === parseInt(id));
    if (index === -1) {
        return res.status(404).json({ message: "Không tìm thấy đơn gửi hàng với ID này." });
    }

    // Cập nhật các trường gửi lên
    const allowedUpdates = [
        'customerName', 'itemType', 'packageQuantity', 'weight',
        'senderPoint', 'receiverPoint', 'senderPhone', 'receiverPhone'
    ];

    Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
            shippingList[index][key] = updates[key];
        }
    });

    shippingList[index].updatedAt = new Date().toISOString();
    setShippingStore(shippingList);

    res.json({
        message: "Cập nhật đơn gửi hàng thành công!",
        data: shippingList[index]
    });
});

// API Huỷ đơn gửi hàng
app.delete('/api/shipping', (req, res) => {
    const { id } = req.body;

    if (!id) {
        return res.status(400).json({ message: "Vui lòng cung cấp ID đơn hàng trong body." });
    }

    let shippingList = getShippingStore();

    const initialLength = shippingList.length;
    let filteredList = shippingList.filter(s => s.id !== parseInt(id));

    if (filteredList.length === initialLength) {
        return res.status(404).json({ message: "Không tìm thấy đơn gửi hàng với ID này." });
    }

    setShippingStore(filteredList);

    res.json({
        message: "Huỷ đơn gửi hàng thành công!"
    });
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server chạy tại http://localhost:${PORT}`);
    });
}

module.exports = app;

