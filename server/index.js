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

  socket.on('shoot', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player && room.antiCheat.validateClick(socket.id)) {
        // Yeni bir mermi ateşle, rakip takıma doğru
        room.projectiles.push({
          type: 'bullet',
          ownerId: player.id,
          team: player.team,
          damage: Math.floor(Math.random() * 2) + 1, // 1 veya 2 hasar
          progress: 0, // 0'dan 100'e kadar karşıya gidecek
          speed: 15
        });
      }
    }
  });

  socket.on('missile', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player) {
         room.projectiles.push({
          type: 'missile',
          ownerId: player.id,
          team: player.team,
          damage: 25, // Büyük hasar
          progress: 0,
          speed: 5
        });
      }
    }
  });

  socket.on('shield', () => {
     const room = gameManager.getRoomByPlayerId(socket.id);
     if (room && room.gameState === 'racing') {
        const player = room.getPlayer(socket.id);
        if (player) {
           // 2 saniye kalkan, cooldown client'ta tutulsun
           player.shieldEndTime = Date.now() + 2000;
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
      } else if (room.gameState === 'racing') {
        // Kalan oyuncuların takımlarına bak
        const team1Alive = room.players.some(p => p.team === 1 && p.hp > 0);
        const team2Alive = room.players.some(p => p.team === 2 && p.hp > 0);
        
        if (!team1Alive || !team2Alive) {
            console.log(`Oda ${room.id}'de bir takım tamamen düştü, maç bitiyor.`);
            let winnerTeam = team1Alive ? 1 : 2;
            const winner = room.players.find(p => p.team === winnerTeam);
            finishRace(room, winner ? winner.id : null);
        }
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

// Savaş Motoru Döngüsü (20 FPS - 50ms)
setInterval(() => {
  for (const room of gameManager.rooms.values()) {
    if (room.gameState === 'racing') {
      let stateChanged = false;
      
      // Mermileri hareket ettir
      for (let i = room.projectiles.length - 1; i >= 0; i--) {
        let proj = room.projectiles[i];
        proj.progress += proj.speed; // 0'dan 100'e gidiyor (Karşı tarafa)
        stateChanged = true;
        
        // Mermi karşıya ulaştı
        if (proj.progress >= 100) {
          // Rakip takımı bul
          const targetTeam = proj.team === 1 ? 2 : 1;
          const enemies = room.players.filter(p => p.team === targetTeam && p.hp > 0);
          
          if (enemies.length > 0) {
            // Rastgele bir rakibe veya ilk rakibe (basitlik için ilk)
            const target = enemies[Math.floor(Math.random() * enemies.length)];
            
            // Kalkan kontrolü (Kalkan yoksa hasar alır)
            if (Date.now() > target.shieldEndTime) {
              target.hp -= proj.damage;
              if (target.hp < 0) target.hp = 0;
            }
          }
          
          room.projectiles.splice(i, 1);
        }
      }
      
      // Takım çöküşü (Oyun Sonu) kontrolü
      const team1Alive = room.players.some(p => p.team === 1 && p.hp > 0);
      const team2Alive = room.players.some(p => p.team === 2 && p.hp > 0);
      
      if (!team1Alive || !team2Alive) {
          let winnerTeam = team1Alive ? 1 : 2;
          // Takımda sadece 1 kazananı seçeceğimiz için veya takım id'si, burada ilk kişiyi baz alıyoruz
          const winner = room.players.find(p => p.team === winnerTeam);
          finishRace(room, winner ? winner.id : null);
          continue;
      }
      
      // Her halükarda durumu client'a yolla (Mermiler uçarken)
      io.to(room.id).emit('combat_state', {
        players: room.getPositions(),
        projectiles: room.projectiles
      });
    }
  }
}, 50);

server.listen(PORT, () => {
  console.log(`DEOS Combat Arena sunucusu ${PORT} portunda başlatıldı!`);
});