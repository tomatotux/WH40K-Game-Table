const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded map files
const MAPS_DIR = path.join(__dirname, '../data/maps');
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });
app.use('/maps', express.static(MAPS_DIR));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/characters', require('./routes/characters'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/factions', require('./routes/factions'));

// ── Page Routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/gm', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gm.html')));
app.get('/tablet', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tablet.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// ── Socket.IO — Real-time sync across tablets & GM ──────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join-session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`[Socket] ${socket.id} joined session ${sessionId}`);
  });

  // Broadcast modifier changes to all clients in session
  socket.on('modifier-update', (data) => {
    socket.to(`session:${data.sessionId}`).emit('modifier-updated', data);
  });

  // Broadcast condition changes
  socket.on('condition-update', (data) => {
    socket.to(`session:${data.sessionId}`).emit('condition-updated', data);
  });

  // Broadcast session end
  socket.on('session-end', (sessionId) => {
    io.to(`session:${sessionId}`).emit('session-ended', sessionId);
  });

  // Broadcast map change
  socket.on('map-change', (data) => {
    socket.to(`session:${data.sessionId}`).emit('map-changed', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════════════╗`);
  console.log(`║  WH40K Session Manager — Port ${PORT}   ║`);
  console.log(`╠══════════════════════════════════════╣`);
  console.log(`║  GM View:     http://localhost:${PORT}/gm   ║`);
  console.log(`║  Tablet:      http://localhost:${PORT}/tablet║`);
  console.log(`║  Admin:       http://localhost:${PORT}/admin ║`);
  console.log(`╚══════════════════════════════════════╝\n`);
});
