const http = require("http");
const crypto = require("crypto");
const WebSocket = require("ws");

const PORT = process.env.PORT || 3000;
const rooms = new Map();

function makeCode() {
  let code;
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (rooms.has(code));
  return code;
}

function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function roomState(room) {
  return {
    type: "room_state",
    code: room.code,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      ready: p.ready
    }))
  };
}

function broadcast(room, data) {
  for (const player of room.players) send(player.ws, data);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.url === "/health") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      ok: true,
      service: "bring-out-the-specter-server"
    }));
  }

  if (req.url === "/") {
    res.writeHead(200);
    return res.end(JSON.stringify({
      ok: true,
      message: "Bring Out the Specter server online"
    }));
  }

  res.writeHead(404);
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  let player = null;
  let room = null;

  send(ws, {
    type: "connected",
    message: "Conectado al servidor"
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, { type: "error", message: "Mensaje inválido" });
    }

    if (msg.type === "create_room") {
      if (room) return send(ws, { type: "error", message: "Ya estás en una sala" });

      const code = makeCode();
      room = {
        code,
        players: []
      };

      player = {
        id: crypto.randomUUID(),
        name: String(msg.name || "Jugador 1").slice(0, 24),
        ready: false,
        ws
      };

      room.players.push(player);
      rooms.set(code, room);

      send(ws, {
        type: "room_created",
        code,
        playerId: player.id
      });
      broadcast(room, roomState(room));
      return;
    }

    if (msg.type === "join_room") {
      if (room) return send(ws, { type: "error", message: "Ya estás en una sala" });

      const code = String(msg.code || "").trim().toUpperCase();
      const target = rooms.get(code);

      if (!target) {
        return send(ws, { type: "error", message: "Sala no encontrada" });
      }

      if (target.players.length >= 2) {
        return send(ws, { type: "error", message: "La sala está llena" });
      }

      room = target;
      player = {
        id: crypto.randomUUID(),
        name: String(msg.name || "Jugador 2").slice(0, 24),
        ready: false,
        ws
      };

      room.players.push(player);

      send(ws, {
        type: "room_joined",
        code,
        playerId: player.id
      });
      broadcast(room, roomState(room));
      return;
    }

    if (!room || !player) {
      return send(ws, {
        type: "error",
        message: "Primero crea o entra a una sala"
      });
    }

    if (msg.type === "ready") {
      player.ready = Boolean(msg.ready);
      broadcast(room, roomState(room));

      if (
        room.players.length === 2 &&
        room.players.every(p => p.ready)
      ) {
        broadcast(room, {
          type: "game_start",
          message: "Los dos jugadores están listos"
        });
      }
      return;
    }

    if (msg.type === "ping_game") {
      broadcast(room, {
        type: "game_event",
        from: player.id,
        event: msg.event || {}
      });
      return;
    }
  });

  ws.on("close", () => {
    if (!room || !player) return;

    room.players = room.players.filter(p => p !== player);

    if (room.players.length === 0) {
      rooms.delete(room.code);
    } else {
      broadcast(room, {
        type: "player_left",
        message: "Un jugador salió de la sala"
      });
      broadcast(room, roomState(room));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
