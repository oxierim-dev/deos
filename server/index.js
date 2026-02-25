const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const gameManager = new GameManager();

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/game.html'));
});

io.on('connection', (socket) => {
  console.log('Yeni oyuncu bağlandı:', socket.id);

  socket.on('join_lobby', (data) => {
    const mode = (data && data.mode) ? data.mode : 4;
    const playerName = (data && data.name) ? data.name : null;
    
    const player = gameManager.addPlayer(socket.id, playerName);
    const room = gameManager.findAvailableRoom(mode);
    
    if (!room) {
        socket.emit('error_message', { message: 'Tüm odalar dolu! Lütfen daha sonra tekrar deneyin.' });
        return;
    }
    
    socket.join(room.id);
    room.addPlayer(player);
    
    console.log(`Oyuncu ${socket.id} ${room.id} odasına katıldı (Mod: ${mode})`);
    
    socket.emit('lobby_update', {
      roomId: room.id,
      players: room.getPlayers(),
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers
    });
    
    socket.to(room.id).emit('lobby_update', {
      roomId: room.id,
      players: room.getPlayers(),
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers
    });

    if (room.isFull()) {
      io.to(room.id).emit('all_ready', {
        countdown: 5
      });
      
      // 5 saniye sonra yarışı otomatik başlat
      setTimeout(() => {
        if (room.gameState !== 'racing') {
          startRace(room);
        }
      }, 5000);
    }
  });

  socket.on('player_ready', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room) {
      room.setPlayerReady(socket.id);
      
      io.to(room.id).emit('lobby_update', {
        roomId: room.id,
        players: room.getPlayers(),
        playerCount: room.players.length,
        maxPlayers: room.maxPlayers
      });

      if (room.allPlayersReady()) {
        setTimeout(() => {
          startRace(room);
        }, 1000);
      }
    }
  });

  socket.on('click', (data) => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player && room.antiCheat.validateClick(socket.id)) {
        player.position += 2; // CLICK_POWER = 2
        
        if (player.position >= 1000) { // TRACK_LENGTH = 1000
          finishRace(room, socket.id);
        } else {
          io.to(room.id).emit('positions', room.getPositions());
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Oyuncu ayrıldı:', socket.id);
    gameManager.removePlayer(socket.id);
  });
});

function startRace(room) {
  room.gameState = 'racing';
  room.startTime = Date.now();
  
  io.to(room.id).emit('race_start', {
    countdown: 3
  });
}

function finishRace(room, winnerId) {
  room.gameState = 'finished';
  const rankings = room.getRankings();
  
  io.to(room.id).emit('race_finish', {
    winner: winnerId,
    rankings: rankings
  });
  
  setTimeout(() => {
    gameManager.resetRoom(room.id);
  }, 5000);
}

server.listen(PORT, () => {
  console.log(`DEOS Racing Simulator sunucusu ${PORT} portunda başlatıldı!`);
});