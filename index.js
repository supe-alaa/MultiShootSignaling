// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

/*
Protocol (JSON messages)
- create_room: { type: "create_room", room: "ABCD" }  // host sends after generating room
- join_room:   { type: "join_room", room: "ABCD" }    // joiner requests to join
- offer:       { type: "offer", room: "ABCD", data: <offer data> } // host -> server -> joiner
- answer:      { type: "answer", room: "ABCD", data: <answer data> } // joiner -> server -> host
- candidate:   { type: "candidate", room: "ABCD", data: <candidate> } // both ways
- close:       { type: "close", room: "ABCD" } // either can close
*/

const rooms = new Map(); // roomCode -> { host: ws, joiner: ws }

function genRoomCode() {
  return crypto.randomBytes(3).toString("base64").replace(/[/+=]/g, "").slice(0, 5).toUpperCase();
}

wss.on("connection", function connection(ws) {
  ws.on("message", function incoming(raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    const t = msg.type;

    if (t === "create_room") {
      // generate unique code if not provided
      let room = msg.room || genRoomCode();
      // ensure unique
      while (rooms.has(room)) room = genRoomCode();
      rooms.set(room, { host: ws, joiner: null });
      ws.room = room;
      ws.role = "host";
      ws.send(JSON.stringify({ type: "room_created", room }));
      console.log("Room created:", room);
      return;
    }

    if (t === "join_room") {
      const room = msg.room;
      const entry = rooms.get(room);
      if (!entry) {
        ws.send(JSON.stringify({ type: "error", message: "room_not_found" }));
        return;
      }
      if (entry.joiner) {
        ws.send(JSON.stringify({ type: "error", message: "room_full" }));
        return;
      }
      entry.joiner = ws;
      ws.room = room;
      ws.role = "joiner";
      ws.send(JSON.stringify({ type: "joined", room }));
      // notify host that joiner arrived
      if (entry.host && entry.host.readyState === WebSocket.OPEN) {
        entry.host.send(JSON.stringify({ type: "peer_joined", room }));
      }
      console.log("Joiner joined room:", room);
      return;
    }

    // Relay offer/answer/candidate
    if (t === "offer" || t === "answer" || t === "candidate") {
      const room = msg.room;
      const entry = rooms.get(room);
      if (!entry) {
        ws.send(JSON.stringify({ type: "error", message: "room_not_found" }));
        return;
      }
      // route to other peer
      let target = null;
      if (ws.role === "host") target = entry.joiner;
      else if (ws.role === "joiner") target = entry.host;
      if (target && target.readyState === WebSocket.OPEN) {
        target.send(JSON.stringify({ type: t, room, data: msg.data }));
      }
      return;
    }

    if (t === "close") {
      const room = msg.room;
      const entry = rooms.get(room);
      if (entry) {
        if (entry.host && entry.host !== ws && entry.host.readyState === WebSocket.OPEN) entry.host.send(JSON.stringify({ type: "closed" }));
        if (entry.joiner && entry.joiner !== ws && entry.joiner.readyState === WebSocket.OPEN) entry.joiner.send(JSON.stringify({ type: "closed" }));
        rooms.delete(room);
      }
      return;
    }

    // other messages ignored
  });

  ws.on("close", () => {
    // cleanup rooms if a peer disconnects
    const room = ws.room;
    if (room) {
      const entry = rooms.get(room);
      if (!entry) return;
      if (ws.role === "host") {
        // notify joiner
        if (entry.joiner && entry.joiner.readyState === WebSocket.OPEN) entry.joiner.send(JSON.stringify({ type: "host_disconnected" }));
      } else if (ws.role === "joiner") {
        if (entry.host && entry.host.readyState === WebSocket.OPEN) entry.host.send(JSON.stringify({ type: "joiner_disconnected" }));
        entry.joiner = null;
      }
      // If host disconnected, remove room
      if (ws.role === "host") rooms.delete(room);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Signaling server listening on ${PORT}`);
});
