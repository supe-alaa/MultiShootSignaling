import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";

const app = express();
app.use(cors());
app.use(express.json());

let rooms = {};
const wss = new WebSocketServer({ port: 8081 });

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);
    if (data.type === "join") {
      const { roomCode } = data;
      if (!rooms[roomCode]) rooms[roomCode] = [];
      rooms[roomCode].push(ws);
      console.log("Client joined room:", roomCode);
    } else if (data.type === "msg") {
      const { roomCode, message } = data;
      for (const client of rooms[roomCode] || []) {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({ message }));
        }
      }
    }
  });
});

app.post("/create-room", (req, res) => {
  const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  rooms[roomCode] = [];
  res.json({ roomCode, wsUrl: "wss://multishootsignaling.fly.dev:8081" });
});


app.post('/join-room', (req, res) => {
    const { roomCode } = req.body;
    if (rooms[roomCode]) {
        res.json({ hostIP: rooms[roomCode].hostIP, hostPort: rooms[roomCode].hostPort });
    } else {
        res.status(404).json({ error: "Room not found" });
    }
});

app.listen(8080, () => console.log("Matchmaker server running on port 8080"));
