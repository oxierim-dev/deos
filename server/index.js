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
app.use('/public', express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/game.html'));
});

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/quiz.html'));
});

// Player AFK Timer Objesi
const playerAfkTimers = new Map();

io.on('connection', (socket) => {
  console.log('Yeni oyuncu bağlandı:', socket.id);

  socket.on('join_lobby', (data) => {
    // 20 Saniye içinde hazır vermezse atılacak
    const kickTimer = setTimeout(() => {
        console.log(`Oyuncu ${socket.id} 20 saniye içinde hazır olmadığı için atıldı.`);
        socket.emit('error_message', { message: '20 Saniye içinde Hazır vermediğiniz için lobiden atıldınız!' });
        socket.disconnect();
    }, 20000);
    playerAfkTimers.set(socket.id, kickTimer);

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
    // Hazır verdiyse AFK timer'ı iptal et
    if (playerAfkTimers.has(socket.id)) {
        clearTimeout(playerAfkTimers.get(socket.id));
        playerAfkTimers.delete(socket.id);
    }

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

  socket.on('move', (data) => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
        const player = room.getPlayer(socket.id);
        if (player && player.hp > 0) {
            // İstemciden gelen dx, dy (1, 0, -1) değerleri
            const speed = 5; // Araç hareket hızı
            let nx = player.x + (data.dx * speed);
            let ny = player.y + (data.dy * speed);
            
            // Sınır kontrolleri (800x400)
            if (ny < 20) ny = 20;
            if (ny > 380) ny = 380;
            
            // Takım sınırı (Orta çizgiyi geçemezler)
            if (player.team === 1) {
                if (nx < 20) nx = 20;
                if (nx > 380) nx = 380; // Sol tarafın maksimumu
            } else {
                if (nx < 420) nx = 420; // Sağ tarafın minimumu
                if (nx > 780) nx = 780;
            }

            // Kutu/Siper çarpışma kontrolü (AABB)
            let canMove = true;
            for (let obs of room.obstacles) {
                if (obs.hp > 0 &&
                    nx < obs.x + obs.width &&
                    nx + player.width > obs.x &&
                    ny < obs.y + obs.height &&
                    ny + player.height > obs.y) {
                    canMove = false;
                    break;
                }
            }

            if (canMove) {
                player.x = nx;
                player.y = ny;
            }
        }
    }
  });

  socket.on('shoot', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player && player.hp > 0 && room.antiCheat.validateClick(socket.id)) {
        
        let projX = player.team === 1 ? player.x + 50 : player.x - 50;
        let projVx = player.team === 1 ? 15 : -15;

        // "3'lü atış" powerup kontrolü
        let isTriple = (player.powerup === 'tripleshot');
        
        // Merkez mermi
        room.projectiles.push({
          type: 'bullet',
          ownerId: player.id,
          team: player.team,
          damage: Math.floor(Math.random() * 2) + 1,
          x: projX,
          y: player.y + 15,
          vx: projVx,
          vy: 0,
          width: 20,
          height: 4
        });

        if (isTriple) {
            // Yukarı Giden
            room.projectiles.push({
                type: 'bullet', ownerId: player.id, team: player.team, damage: 1,
                x: projX, y: player.y + 15, vx: projVx, vy: -2, width: 20, height: 4
            });
            // Aşağı Giden
            room.projectiles.push({
                type: 'bullet', ownerId: player.id, team: player.team, damage: 1,
                x: projX, y: player.y + 15, vx: projVx, vy: 2, width: 20, height: 4
            });
            // Powerupı tüket (tek kullanımlık veya süreli olabilir, burada tek atışlık tüketelim)
            player.powerup = null;
        }
      }
    }
  });

  socket.on('missile', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (room && room.gameState === 'racing') {
      const player = room.getPlayer(socket.id);
      if (player && player.hp > 0) {
         let projX = player.team === 1 ? player.x + 50 : player.x - 50;
         let projVx = player.team === 1 ? 8 : -8;

         room.projectiles.push({
          type: 'missile',
          ownerId: player.id,
          team: player.team,
          damage: 30, // Büyük hasar
          x: projX,
          y: player.y + 10,
          vx: projVx,
          vy: 0,
          width: 30,
          height: 16
        });
      }
    }
  });

  // Eski shield kapatıldı, powerup tetikleme (ÖZEL GÜÇ) slotu eklendi
  socket.on('use_powerup', () => {
     const room = gameManager.getRoomByPlayerId(socket.id);
     if (room && room.gameState === 'racing') {
        const player = room.getPlayer(socket.id);
        if (player && player.powerup) {
           // Yetenekleri uygula
           if (player.powerup === 'heal') {
               player.hp = Math.min(100, player.hp + 30);
               player.powerup = null;
           } else if (player.powerup === 'shield') {
               player.shieldEndTime = Date.now() + 3000; // 3 saniye ölümsüzlük
               player.powerup = null;
           } else if (player.powerup === 'tripleshot') {
               // Bir sonraki atışta `shoot` eventinde tüketilecek, sadece ui'da yandığını bilelim
           } else if (player.powerup === 'wallbreaker') {
               // Çılgın bir füze at
               let projX = player.team === 1 ? player.x + 50 : player.x - 50;
               let projVx = player.team === 1 ? 12 : -12;
               room.projectiles.push({
                  type: 'wallbreaker',
                  ownerId: player.id,
                  team: player.team,
                  damage: 50, // Siperleri tekte yıkar
                  x: projX,
                  y: player.y,
                  vx: projVx,
                  vy: 0,
                  width: 40,
                  height: 30
               });
               player.powerup = null;
           }
        }
     }
  });

  socket.on('disconnect', () => {
    console.log('Oyuncu ayrıldı:', socket.id);
    if (playerAfkTimers.has(socket.id)) {
        clearTimeout(playerAfkTimers.get(socket.id));
        playerAfkTimers.delete(socket.id);
    }

    const room = gameManager.getRoomByPlayerId(socket.id);
    gameManager.removePlayer(socket.id);
    
    // Auto-win ve otomatik reset kontrolleri
    if (room) {
      if (room.players.length === 0) {
        console.log(`Oda ${room.id} tamamen boşaldı, resetleniyor.`);
        gameManager.resetRoom(room.id);
      } else if (room.gameState === 'racing') {
        // Ayrılan oyuncu varsa takımları kontrol et, eğer takımda hiç adam KALMADIYSA o takım elenir.
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
      
      // Powerup Spawn Mantığı (Her 8 saniyede bir düşsün)
      const now = Date.now();
      if (now - room.lastPowerupSpawn > 8000) {
          if (room.powerups.length < 3) {
              const types = ['heal', 'tripleshot', 'wallbreaker', 'shield'];
              const pType = types[Math.floor(Math.random() * types.length)];
              // Haritada rastgele yere düşsün
              room.powerups.push({
                  id: Math.random().toString(),
                  type: pType,
                  x: 50 + Math.random() * 700,
                  y: 50 + Math.random() * 300,
                  width: 30,
                  height: 30
              });
          }
          room.lastPowerupSpawn = now;
      }

      // Oyuncuların güçleri alması (Collision Array Iteration)
      for (const player of room.players) {
          if (player.hp > 0 && !player.powerup) {
              for (let i = room.powerups.length - 1; i >= 0; i--) {
                  let pu = room.powerups[i];
                  if (player.x < pu.x + pu.width &&
                      player.x + player.width > pu.x &&
                      player.y < pu.y + pu.height &&
                      player.y + player.height > pu.y) {
                      player.powerup = pu.type;
                      room.powerups.splice(i, 1);
                  }
              }
          }
      }

      // Mermileri hareket ettir ve çarpışmaları kontrol et
      for (let i = room.projectiles.length - 1; i >= 0; i--) {
        let proj = room.projectiles[i];
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        let hit = false;
        
        // Ekrandan çıktıysa yokedelim
        if (proj.x < 0 || proj.x > 800 || proj.y < 0 || proj.y > 400) {
            hit = true;
        }

        // Siperlere (Obstacles) çarpışma
        if (!hit) {
            for (let j = room.obstacles.length - 1; j >= 0; j--) {
                let obs = room.obstacles[j];
                if (obs.hp > 0 && 
                    proj.x < obs.x + obs.width &&
                    proj.x + proj.width > obs.x &&
                    proj.y < obs.y + obs.height &&
                    proj.y + proj.height > obs.y) {
                    
                    hit = true;
                    // Duvarı yıkma
                    obs.hp -= proj.damage;
                    break; 
                }
            }
        }

        // Oyunculara (Rakibe) çarpışma
        if (!hit) {
            const targetTeam = proj.team === 1 ? 2 : 1;
            for (const target of room.players) {
                if (target.team === targetTeam && target.hp > 0) {
                    if (proj.x < target.x + target.width &&
                        proj.x + proj.width > target.x &&
                        proj.y < target.y + target.height &&
                        proj.y + proj.height > target.y) {
                        
                        hit = true;
                        
                        // Kalkan kontrolü
                        if (Date.now() > target.shieldEndTime || target.shieldEndTime === undefined) {
                            target.hp -= proj.damage;
                            if (target.hp <= 0) {
                                target.hp = 0;
                                // Hasarı alan ölürse maç sonu tetiği buraya kaydırıldı
                                const team1Alive = room.players.some(p => p.team === 1 && p.hp > 0);
                                const team2Alive = room.players.some(p => p.team === 2 && p.hp > 0);
                                if (!team1Alive || !team2Alive) {
                                    let winnerTeam = team1Alive ? 1 : 2;
                                    const winner = room.players.find(p => p.team === winnerTeam);
                                    finishRace(room, winner ? winner.id : null);
                                    // Hit işlendi, direk döngüyü patlat
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }
        
        if (hit) {
            room.projectiles.splice(i, 1);
        }
      }
      
      // Artık sadece HP bazlı ölümle finishRace çağrıldığı için
      // Her intervaldaki manuel array win/loss taramasını KALDIRDIK.
      // Sadece disconnectionlarda veya hasar aldıktan sonra ölen varsa taranıyor.
      
      io.to(room.id).emit('combat_state', {
        players: room.getPositions(),
        projectiles: room.projectiles,
        obstacles: room.obstacles,
        powerups: room.powerups
      });
    }
  }
}, 50);

server.listen(PORT, () => {
  console.log(`DEOS Combat Arena sunucusu ${PORT} portunda başlatıldı!`);
});