const AntiCheat = require('./antiCheat');

class Player {
  constructor(id) {
    this.id = id;
    this.name = `Player ${id.substr(0, 6)}`;
    this.color = this.generateColor();
    this.position = 0;
    this.ready = false;
    this.antiCheat = new AntiCheat();
  }

  generateColor() {
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  reset() {
    this.position = 0;
    this.ready = false;
  }
}

class Room {
  constructor(id) {
    this.id = id;
    this.players = [];
    this.gameState = 'waiting'; // waiting, ready, racing, finished
    this.startTime = null;
    this.antiCheat = new AntiCheat();
  }

  addPlayer(player) {
    if (this.players.length < 4) {
      this.players.push(player);
      return true;
    }
    return false;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
  }

  getPlayer(playerId) {
    return this.players.find(p => p.id === playerId);
  }

  setPlayerReady(playerId) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.ready = true;
    }
  }

  getPlayers() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      ready: p.ready,
      position: p.position
    }));
  }

  getPositions() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      position: p.position,
      color: p.color
    }));
  }

  getRankings() {
    return this.players
      .sort((a, b) => b.position - a.position)
      .map((p, index) => ({
        rank: index + 1,
        id: p.id,
        name: p.name,
        color: p.color,
        position: p.position
      }));
  }

  isFull() {
    return this.players.length === this.maxPlayers;
  }

  allPlayersReady() {
    return this.players.length > 0 && this.players.every(p => p.ready);
  }

  reset() {
    this.players.forEach(p => p.reset());
    this.gameState = 'waiting';
    this.startTime = null;
  }
}

class GameManager {
  constructor() {
    this.rooms = new Map();
    this.players = new Map();
    this.roomCounter = 0;
    
    // Sabit 2 oda oluştur
    // Oda 1: 4 kişilik (Varsayılan olarak başlatılır, mod isteğine göre değişebilir ama burada sabitliyoruz)
    // Ancak kullanıcının isteği "SADECE 2 ROOM OLSUN" ve mod seçeneği de var.
    // Mod seçeneğiyle oda kapasitesi değişiyor.
    // Kullanıcının dediği: "ROOM 1 DOLU DEĞİLSE ORAYA, DOLUYSA ROOM 2'YE"
    // Bu durumda dinamik oda yaratmayı kapatıp, sabit 2 oda üzerinden gideceğiz.
    // Ancak mod seçimi ne olacak?
    // Kullanıcı "HEM 2Lİ HEM 4LÜ OLSUN" dedi, sonra "SADECE 2 ODA OLSUN" dedi.
    // Basitlik için: Oda 1 ve Oda 2 her zaman var olacak.
    // İlk giren oyuncunun seçtiği moda göre odanın kapasitesi o anlık belirlenebilir veya
    // Oda 1 ve Oda 2 sabit kalır, mod seçimi sadece odaya girişte kontrol edilir.
    
    // En mantıklısı: Dinamik oda yaratmayı (findOrCreateRoom) değiştirmek.
    // Sadece 'room_1' ve 'room_2' kullanılacak.
    
    this.rooms.set('room_1', new Room('room_1', 4)); // Başlangıçta 4 kişilik varsayalım
    this.rooms.set('room_2', new Room('room_2', 4));
  }

  addPlayer(playerId) {
    const player = new Player(playerId);
    this.players.set(playerId, player);
    return player;
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (player) {
      const room = this.getRoomByPlayerId(playerId);
      if (room) {
        room.removePlayer(playerId);
        // Odayı silmiyoruz, sadece oyuncuyu çıkarıyoruz.
         // Eğer oda boşaldıysa ve oyun bitmişse durumu resetleyebiliriz.
         if (room.players.length === 0) {
            console.log(`Oda ${room.id} boşaldı, resetleniyor.`);
            room.reset();
            room.gameState = 'waiting';
         }
      }
      this.players.delete(playerId);
    }
  }

  findAvailableRoom(mode = 4) {
    const room1 = this.rooms.get('room_1');
    const room2 = this.rooms.get('room_2');
    
    // Önce Oda 1'i kontrol et
    // Eğer oda boşsa, modunu güncelle
    if (room1.players.length === 0) {
        room1.maxPlayers = mode;
    }
    
    // Oda 1 uygun mu? (Boş yer var, oyun başlamamış, ve modu uyumlu)
    if (!room1.isFull() && room1.gameState === 'waiting' && room1.maxPlayers === mode) {
        return room1;
    }
    
    // Oda 2'yi kontrol et
    if (room2.players.length === 0) {
        room2.maxPlayers = mode;
    }
    
    if (!room2.isFull() && room2.gameState === 'waiting' && room2.maxPlayers === mode) {
        return room2;
    }
    
    return null; // İkisi de dolu
  }


  getRoomByPlayerId(playerId) {
    for (const room of this.rooms.values()) {
      if (room.getPlayer(playerId)) {
        return room;
      }
    }
    return null;
  }

  resetRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.reset();
    }
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }
}

module.exports = GameManager;