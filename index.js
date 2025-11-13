// server.js
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(express.json());

let rooms = {}; // تخزين الرومات

// WebSocket server على port 8081
const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      const { roomCode } = data;
      if (!rooms[roomCode]) rooms[roomCode] = [];
      rooms[roomCode].push(ws);
      console.log(`Client joined room ${roomCode}`);
    } else if (data.type === "msg") {
      const { roomCode, message } = data;
      for (const client of rooms[roomCode] || []) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ message }));
        }
      }
    }
  });

  ws.on("close", () => {
    for (const room of Object.values(rooms)) {
      const index = room.indexOf(ws);
      if (index !== -1) room.splice(index, 1);
    }
  });
});

// HTTP API لإنشاء روم
app.post("/create-room", (req, res) => {
  const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  rooms[roomCode] = [];
  res.json({ roomCode, wsUrl: "wss://multishootsignaling.fly.dev:8081" });
});

// HTTP API للانضمام
app.post("/join-room", (req, res) => {
  const { roomCode } = req.body;
  if (rooms[roomCode]) {
    res.json({ roomCode, wsUrl: "wss://multishootsignaling.fly.dev:8081" });
  } else {
    res.status(404).json({ error: "Room not found" });
  }
});

app.listen(3000, () => console.log("HTTP running on 3000, WS on 8081"));
