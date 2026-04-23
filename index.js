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


const sessionConfig = JSON.stringify({
    type: "realtime",
    model: "gpt-realtime",
    audio: { output: { voice: "marin" } }
});


// Route test
app.get('/', (req, res) => {
    res.json({
        message: 'Backend NodeJS chạy OK 🚀'
    });
});

// Ví dụ API
app.get('/api/hello', (req, res) => {
    res.send('Hello NodeJS');
});

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



// An endpoint which creates a Realtime API session.
app.post("/session", async (req, res) => {
    const fd = new FormData();
    fd.set("sdp", req.body);
    fd.set("session", sessionConfig);

    try {
        const r = await fetch("https://api.openai.com/v1/realtime/calls", {
            method: "POST",
            headers: {
                Authorization: `Bearer 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`,
            },
            body: fd,
        });
        // Send back the SDP we received from the OpenAI REST API
        const sdp = await r.text();
        res.send(sdp);
    } catch (error) {
        console.error("Token generation error:", error);
        res.status(500).json({ error: "Failed to generate token" });
    }
})


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server chạy tại http://localhost:${PORT}`);
    });
}

module.exports = app;

