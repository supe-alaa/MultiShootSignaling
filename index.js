import express from 'express';
import cors from 'cors';

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // هذا مهم جدًا لتجهيز req.body

let rooms = {};

// إنشاء روم جديد
app.post('/create-room', (req, res) => {
    const { hostIP, hostPort } = req.body;
    console.log("Request body:", req.body); // تحقق هنا إذا فيه بيانات

    const roomCode = Math.floor(1000 + Math.random() * 9000).toString(); // 4 digits
    console.log("Generated room code:", roomCode);

    rooms[roomCode] = { hostIP, hostPort };
    res.json({ roomCode });
});

// الانضمام لروم موجود
app.post('/join-room', (req, res) => {
    const { roomCode } = req.body;

    if (rooms[roomCode]) {
        res.json({ hostIP: rooms[roomCode].hostIP, hostPort: rooms[roomCode].hostPort });
    } else {
        res.status(404).json({ error: "Room not found" });
    }
});

// تشغيل السيرفر
app.listen(3000, () => console.log("Matchmaker server running on port 3000"));
