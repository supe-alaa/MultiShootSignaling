const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let rooms = {};

// تنظيف الرومات القديمة تلقائياً
setInterval(() => {
    const now = Date.now();
    const timeout = 30 * 60 * 1000; // 30 دقيقة
    
    for (const code in rooms) {
        if (now - rooms[code].createdAt > timeout) {
            console.log("Cleaning up old room:", code);
            delete rooms[code];
        }
    }
}, 5 * 60 * 1000); // كل 5 دقائق

app.post("/create", (req, res) => {
    const { host_ip, port } = req.body;
    if (!host_ip || !port) {
        return res.status(400).json({ error: "Missing host_ip or port" });
    }
    
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[code] = { 
        host_ip, 
        port,
        createdAt: Date.now()
    };
    
    console.log("Room created:", code, rooms[code]);
    res.json({ code });
});

app.get("/join", (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        return res.status(400).json({ error: "Room code required" });
    }
    
    if (rooms[code]) {
        console.log("Room found:", code, rooms[code]);
        res.json(rooms[code]);
    } else {
        console.log("Room not found:", code);
        res.status(404).json({ error: "Room not found" });
    }
});

// للحصول على قائمة الرومات (اختياري)
app.get("/rooms", (req, res) => {
    res.json(rooms);
});

app.listen(8080, () => console.log("✅ Server running on port 8080"));