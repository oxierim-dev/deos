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
    return this.players.length === 4;
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
        if (room.players.length === 0) {
          this.rooms.delete(room.id);
        }
      }
      this.players.delete(playerId);
    }
  }

  findOrCreateRoom() {
    for (const room of this.rooms.values()) {
      if (!room.isFull() && room.gameState === 'waiting') {
        return room;
      }
    }
    
    const roomId = `room_${++this.roomCounter}`;
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
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