class AntiCheat {
  constructor() {
    this.playerClicks = new Map();
    this.MAX_CLICKS_PER_SECOND = 15;
    this.CLICK_WINDOW = 1000; // 1 saniye
  }

  validateClick(playerId) {
    const now = Date.now();
    
    if (!this.playerClicks.has(playerId)) {
      this.playerClicks.set(playerId, []);
    }
    
    const playerClicks = this.playerClicks.get(playerId);
    
    // Eski tıklamaları temizle
    const validClicks = playerClicks.filter(time => now - time < this.CLICK_WINDOW);
    
    // Yeni tıklamayı ekle
    validClicks.push(now);
    this.playerClicks.set(playerId, validClicks);
    
    // Tıklama limitini kontrol et
    if (validClicks.length > this.MAX_CLICKS_PER_SECOND) {
      console.log(`Hile tespit edildi! Oyuncu ${playerId} saniyede ${validClicks.length} tıklama yaptı.`);
      return false;
    }
    
    return true;
  }

  resetPlayer(playerId) {
    this.playerClicks.delete(playerId);
  }

  getClickRate(playerId) {
    if (!this.playerClicks.has(playerId)) {
      return 0;
    }
    
    const now = Date.now();
    const playerClicks = this.playerClicks.get(playerId);
    const recentClicks = playerClicks.filter(time => now - time < this.CLICK_WINDOW);
    
    return recentClicks.length;
  }
}

module.exports = AntiCheat;