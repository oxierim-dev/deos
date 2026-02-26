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

    // if (room.isFull()) blokunu sildik.
    // Otomatik başlama hatasını kaldırdık. Sadece oyuncular "HAZIR" dediğinde oyun başlayacak.
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
        // Herkes hazır olduğunda client'lara geri sayımı başlatmalarını söyle (Lobi ekranı silinir!)
        io.to(room.id).emit('all_ready', {
          countdown: 3
        });

        // Geri sayım bittiğinde (3 saniye sonra) yarışı asıl başlatan komutu gönder
        setTimeout(() => {
          if (room.gameState !== 'racing') {
            startRace(room);
          }
        }, 3000);
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

  socket.on('use_nitro', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player) {
        player.position += 100; // Nitro gücü
        
        if (player.position >= 1000) {
          finishRace(room, socket.id);
        } else {
          io.to(room.id).emit('positions', room.getPositions());
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('Oyuncu ayrıldı:', socket.id);
    const room = gameManager.getRoomByPlayerId(socket.id);
    gameManager.removePlayer(socket.id);
    
    // Auto-win ve otomatik reset kontrolleri
    if (room) {
      if (room.players.length === 0) {
        console.log(`Oda ${room.id} tamamen boşaldı, resetleniyor.`);
        gameManager.resetRoom(room.id);
      } else if (room.gameState === 'racing' && room.players.length === 1) {
        console.log(`Oda ${room.id}'de tek oyuncu kaldı, otomatik kazanıyor.`);
        // Son kalan oyuncu kazanır
        const winner = room.players[0];
        winner.position = 1000; // çizgiyi geçmiş gibi göster
        finishRace(room, winner.id);
      } else if (room.gameState === 'waiting') {
        // Bekleme modundaysa, lobiyi diğer oyuncular için güncelle
        io.to(room.id).emit('lobby_update', {
          roomId: room.id,
          players: room.getPlayers(),
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers
        });
      }
    }
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