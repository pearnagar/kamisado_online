// server/src/index.ts
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

// Shared protocol types (client/server agree on message shapes)
import type { RoomId, Side, ClientToServer } from '../../shared/net/protocol';

// Server game engine helpers (you created these in server/src/engine.ts)
import {
  makeGame,
  snapshot,
  applyMoveAndResolve,
  type ServerGame,
} from './engine';

const app = express();
const server = http.createServer(app);

// Allow the Vite dev host(s) to connect
const io = new Server(server, {
  cors: {
    // Allow any origin during dev (easiest way to rule out CORS)
    origin: (_origin, cb) => cb(null, true),
    credentials: false,
    methods: ['GET', 'POST'],
  },
});

app.get('/', (_req, res) => res.send('Kamisado Socket.IO server is running.'));
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ---------------------- Room state ------------------------ */
type Room = {
  id: RoomId;
  size: 8 | 10;
  bottomOwner: Side;
  game: ServerGame;
  sockets: { [side in Side]?: string };
};

const rooms = new Map<RoomId, Room>();

function makeRoomId(): RoomId {
  return Math.random().toString(36).slice(2, 7) as RoomId; // e.g. "xk39a"
}

/* ---------------------- Socket handlers ------------------- */
io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);

  socket.on('msg', (msg: ClientToServer) => {
    try {
      if (msg.t === 'create_room') {
        const id = makeRoomId();
        const room: Room = {
          id,
          size: msg.size,
          bottomOwner: msg.bottomOwner,
          game: makeGame(msg.size, msg.bottomOwner),
          sockets: { [msg.bottomOwner]: socket.id },
        };
        rooms.set(id, room);
        socket.join(id);
        socket.emit('msg', {
          t: 'room_created',
          room: id,
          you: msg.bottomOwner,
          size: msg.size,
        });
        console.log(`room ${id} created, bottomOwner=${msg.bottomOwner}`);
      }

      else if (msg.t === 'join_room') {
        const room = rooms.get(msg.room);
        if (!room) {
          socket.emit('msg', { t: 'error', msg: 'Room not found' });
          return;
        }

        // Assign opposite side
        const opp: Side = room.bottomOwner === 'White' ? 'Black' : 'White';
        if (room.sockets[opp]) {
          socket.emit('msg', { t: 'error', msg: 'Room full' });
          return;
        }
        room.sockets[opp] = socket.id;
        socket.join(room.id);

        socket.emit('msg', {
          t: 'room_joined',
          room: room.id,
          you: opp,
          size: room.size,
          oppJoined: true,
        });

        // Broadcast full snapshot to both
        io.to(room.id).emit('msg', {
          t: 'state',
          room: room.id,
          state: snapshot(room.game, room.size, room.bottomOwner),
        });

        console.log(`socket ${socket.id} joined room ${room.id} as ${opp}`);
      }

      else if (msg.t === 'move') {
        const room = rooms.get(msg.room);
        if (!room) {
          socket.emit('msg', { t: 'error', msg: 'Room not found' });
          return;
        }

        const ok = applyMoveAndResolve(room.game, msg.from, msg.to);
        if (!ok) {
          socket.emit('msg', { t: 'error', msg: 'Illegal move' });
          return;
        }

        io.to(room.id).emit('msg', {
          t: 'state',
          room: room.id,
          state: snapshot(room.game, room.size, room.bottomOwner),
        });
      }

      else if (msg.t === 'resign') {
        const room = rooms.get(msg.room);
        if (!room) return;
        io.to(room.id).emit('msg', { t: 'error', msg: 'Opponent resigned.' });
        rooms.delete(room.id);
      }
    } catch (err) {
      console.error('Error handling msg', err);
      socket.emit('msg', { t: 'error', msg: 'Server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`socket disconnected: ${socket.id}`);
    // Optional: clean up room if a player leaves
    for (const [id, room] of rooms) {
      if (room.sockets.White === socket.id || room.sockets.Black === socket.id) {
        io.to(id).emit('msg', { t: 'error', msg: 'Opponent disconnected' });
        rooms.delete(id);
      }
    }
  });
});

/* ---------------------- Start ----------------------------- */
const PORT = process.env.PORT ? Number(process.env.PORT) : 8787;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Kamisado server running on http://localhost:${PORT}`);
});
