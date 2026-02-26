// Oyun yönetimi için global değişkenler
let gameSocket;
let gameState = 'lobby'; // lobby, countdown, racing, finished
let currentRoom = null;
let myPlayerId = null;
let racePositions = [];
let countdownInterval = null;

// Nitro sistemi değişkenleri
let nitroCharge = 0;
let isNitroActive = false;
let lastClickTime = 0;

// Hareket kontrol değişkenleri
let inputState = {
    up: false,
    down: false,
    left: false,
    right: false
};
let moveInterval = null;
let currentPowerup = null;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    // Socket.IO bağlantısını kur
    gameSocket = io();
    
    // Bağlantı olaylarını dinle
    gameSocket.on('connect', function() {
        console.log('Oyun sunucusuna bağlandı:', gameSocket.id);
        myPlayerId = gameSocket.id;
        
        // Oyuncu bağlandıktan sonra lobiye katıl
        joinLobby();
    });
    
    gameSocket.on('disconnect', function() {
        console.log('Oyun sunucusundan ayrıldı');
        gameState = 'disconnected';
    });
    
    // Lobby güncelleme olayını dinle
    gameSocket.on('lobby_update', function(data) {
        console.log('Lobby güncellendi:', data);
        currentRoom = data.roomId;
        updateLobbyUI(data);
    });
    
    // Tüm oyuncular hazır olayını dinle
    gameSocket.on('all_ready', function(data) {
        console.log('Tüm oyuncular hazır, geri sayım başlıyor:', data);
        showCountdown(data.countdown);
    });
    
    // Yarış başlatma olayını dinle
    gameSocket.on('race_start', function(data) {
        console.log('Yarış başlıyor:', data);
        startRace(data.countdown);
    });
    
    // Savaş durumlarını (HP, mermiler) dinle
    gameSocket.on('combat_state', function(data) {
        racePositions = data.players; // Geriye dönük uyumluluk için, renderer'da kullanılacak
        updateCombatDisplay(data);
    });
    
    // Yarış bitiş olayını dinle
    gameSocket.on('race_finish', function(data) {
        console.log('Yarış bitti:', data);
        showResults(data);
    });
    
    // Hata mesajlarını dinle
    gameSocket.on('error_message', function(data) {
        alert(data.message);
        window.location.href = '/';
    });
    
    // Buton olaylarını bağla
    setupEventListeners();
}

function setupEventListeners() {
    // Hazır butonunu dinle
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) readyBtn.addEventListener('click', setPlayerReady);
    
    // Tıklama butonunu dinle (ATEŞ ET)
    const clickBtn = document.getElementById('clickBtn');
    if (clickBtn) {
        clickBtn.addEventListener('click', () => handleClick(null));
        clickBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleClick(null); });
    }

    // Özel Güç butonunu dinle
    const powerupBtn = document.getElementById('powerupBtn');
    if (powerupBtn) {
        powerupBtn.addEventListener('click', activatePowerup);
        powerupBtn.addEventListener('touchstart', (e) => { e.preventDefault(); activatePowerup(); });
    }
    
    // Tekrar oyna butonunu dinle
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) playAgainBtn.addEventListener('click', playAgain);
    
    // Klavye desteği (WASD Hareket, Space Ateş, Shift Özel Güç)
    document.addEventListener('keydown', function(event) {
        if (gameState !== 'racing') return;
        
        // Hareket Tuşları
        if (event.code === 'KeyW' || event.code === 'ArrowUp') inputState.up = true;
        if (event.code === 'KeyS' || event.code === 'ArrowDown') inputState.down = true;
        if (event.code === 'KeyA' || event.code === 'ArrowLeft') inputState.left = true;
        if (event.code === 'KeyD' || event.code === 'ArrowRight') inputState.right = true;

        // Aksiyon Tuşları
        if (event.code === 'Space') {
            event.preventDefault();
            handleClick(event);
        }
        if (event.code === 'ShiftLeft') {
            event.preventDefault();
            activatePowerup();
        }
    });

    document.addEventListener('keyup', function(event) {
        if (event.code === 'KeyW' || event.code === 'ArrowUp') inputState.up = false;
        if (event.code === 'KeyS' || event.code === 'ArrowDown') inputState.down = false;
        if (event.code === 'KeyA' || event.code === 'ArrowLeft') inputState.left = false;
        if (event.code === 'KeyD' || event.code === 'ArrowRight') inputState.right = false;
    });
}

function startMovementLoop() {
    if (moveInterval) clearInterval(moveInterval);
    
    // Server'a her 50ms'de (20 FPS) bir yön belirt
    moveInterval = setInterval(() => {
        if (gameState === 'racing') {
            let dx = 0;
            let dy = 0;
            
            if (inputState.up) dy -= 1;
            if (inputState.down) dy += 1;
            if (inputState.left) dx -= 1;
            if (inputState.right) dx += 1;
            
            if (dx !== 0 || dy !== 0) {
                gameSocket.emit('move', { dx: dx, dy: dy });
            }
        }
    }, 50);
}

function activatePowerup() {
    if (gameState === 'racing' && currentPowerup) {
        gameSocket.emit('use_powerup');
        // İkonu boşalt, sunucudan teyit beklemeye gerek yok hissttirmek için
        currentPowerup = null;
        updatePowerupUI();
    }
}

function updatePowerupUI() {
    const powerupBtn = document.getElementById('powerupBtn');
    const powerupIcon = document.getElementById('powerupIcon');
    
    if (powerupBtn && powerupIcon) {
        if (currentPowerup) {
            powerupBtn.disabled = false;
            powerupBtn.classList.add('active');
            
            // Güç ismine göre ikon ver
            if (currentPowerup === 'heal') powerupIcon.innerHTML = 'CAN (++hp)';
            else if (currentPowerup === 'tripleshot') powerupIcon.innerHTML = '3\'LÜ<br>ATIŞ';
            else if (currentPowerup === 'wallbreaker') powerupIcon.innerHTML = 'DUVAR<br>DELİCİ';
            else powerupIcon.innerHTML = currentPowerup.toUpperCase();
        } else {
            powerupBtn.disabled = true;
            powerupBtn.classList.remove('active');
            powerupIcon.innerHTML = 'BOŞ<br>SLOT';
        }
    }
}

function joinLobby() {
    console.log('Lobiye katılıyor...');
    gameState = 'lobby';
    
    // URL'den modu ve ismi al
    const urlParams = new URLSearchParams(window.location.search);
    const mode = parseInt(urlParams.get('mode')) || 4;
    // URL decode işlemi otomatik yapılır ama güvenli olsun
    let playerName = urlParams.get('name') || 'Player';
    
    console.log("URL'den alınan isim:", playerName); // Debug
    
    gameSocket.emit('join_lobby', { mode: mode, name: playerName });
}

function updateLobbyUI(data) {
    // Oyuncu sayacını güncelle
    const playerCounter = document.getElementById('playerCounter');
    if (playerCounter) {
        playerCounter.innerHTML = `Oda: <strong>${data.roomId}</strong><br>Oyuncu bekleniyor... (${data.playerCount}/${data.maxPlayers})`;
    }
    
    // Oyuncu slotlarını güncelle
    updatePlayerSlots(data.players, data.maxPlayers);
    
    // Hazır butonunu kontrol et
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        if (data.playerCount === data.maxPlayers) {
            readyBtn.disabled = false;
            readyBtn.style.opacity = '1';
            readyBtn.innerHTML = '<span class="btn-text">HAZIR MISIN?</span><div class="btn-glow"></div>';
        } else {
            readyBtn.disabled = true;
            readyBtn.style.opacity = '0.6';
            readyBtn.innerHTML = '<span class="btn-text">BEKLENIYOR...</span><div class="btn-glow"></div>';
        }
    }
}

function updatePlayerSlots(players, maxPlayers = 4) {
    for (let i = 1; i <= 4; i++) {
        const playerSlot = document.getElementById(`player${i}`);
        const player = players[i - 1];
        
        if (playerSlot) {
            // Eğer mod 2 kişilikse ve bu 3. veya 4. slotsa gizle
            if (i > maxPlayers) {
                playerSlot.style.display = 'none';
                continue;
            } else {
                playerSlot.style.display = 'flex';
            }

            if (player) {
                playerSlot.classList.add('active');
                
                const playerColor = playerSlot.querySelector('.player-color');
                const playerName = playerSlot.querySelector('.player-name');
                const playerStatus = playerSlot.querySelector('.player-status');
                
                if (playerColor) {
                    playerColor.style.backgroundColor = player.color;
                }
                
                if (playerName) {
                    // İsmi sunucudan gelen veriden al, yoksa varsayılanı kullan
                    // console.log("Player name:", player.name); // Debug için
                    playerName.textContent = (player.name && player.name.trim() !== '') ? player.name : `Player ${player.id.substr(0,4)}`;
                }
                
                if (playerStatus) {
                    playerStatus.textContent = player.ready ? 'Hazır' : 'Bekliyor';
                    playerStatus.style.color = player.ready ? '#00ff00' : '#cccccc';
                }
            } else {
                playerSlot.classList.remove('active');
                
                const playerColor = playerSlot.querySelector('.player-color');
                const playerName = playerSlot.querySelector('.player-name');
                const playerStatus = playerSlot.querySelector('.player-status');
                
                if (playerColor) {
                    playerColor.style.backgroundColor = '#666';
                }
                
                if (playerName) {
                    playerName.textContent = 'Boş';
                }
                
                if (playerStatus) {
                    playerStatus.textContent = 'Bekliyor';
                    playerStatus.style.color = '#cccccc';
                }
            }
        }
    }
}

function setPlayerReady() {
    console.log('Oyuncu hazır durumuna geçiyor');
    gameSocket.emit('player_ready');
    
    // Butonu devre dışı bırak
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.style.opacity = '0.6';
        readyBtn.innerHTML = '<span class="btn-text">HAZIR</span><div class="btn-glow"></div>';
    }
}

function showCountdown(countdown) {
    console.log('Geri sayım başlıyor:', countdown);
    gameState = 'countdown';
    
    // Lobby ekranını gizle, geri sayım ekranını göster
    const lobbyScreen = document.getElementById('lobbyScreen');
    const countdownScreen = document.getElementById('countdownScreen');
    
    if (lobbyScreen) lobbyScreen.classList.remove('active');
    if (countdownScreen) countdownScreen.classList.add('active');
    
    // Geri sayımı başlat
    let currentCountdown = countdown;
    const countdownNumber = document.getElementById('countdownNumber');
    
    countdownInterval = setInterval(function() {
        if (countdownNumber) {
            countdownNumber.textContent = currentCountdown;
        }
        
        currentCountdown--;
        
        if (currentCountdown < 0) {
            clearInterval(countdownInterval);
            // Yarış ekranına geçiş startRace fonksiyonunda handle edilecek
        }
    }, 1000);
}

function startRace(countdown) {
    console.log('Yarış başlıyor:', countdown);
    gameState = 'racing';
    
    // Geri sayımı durdur
    if (countdownInterval) {
        clearInterval(countdownInterval);
    }
    
    // Geri sayım ekranını gizle, yarış ekranını göster
    const countdownScreen = document.getElementById('countdownScreen');
    const raceScreen = document.getElementById('raceScreen');
    
    if (countdownScreen) countdownScreen.classList.remove('active');
    if (raceScreen) raceScreen.classList.add('active');
    
    // Canvas renderer'ı başlat
    if (typeof initRaceCanvas === 'function') {
        initRaceCanvas();
    }
    
    // Hareket döngüsünü başlat
    startMovementLoop();
    
    // Tıklama butonuna focus
    const clickBtn = document.getElementById('clickBtn');
    if (clickBtn) {
        clickBtn.focus();
    }
}

function handleClick(event) {
    if (event && event.type !== 'keydown') event.preventDefault();
    
    // Sadece yarış durumunda tıklamaları gönder
    if (gameState === 'racing') {
        if (!isNitroActive) {
            gameSocket.emit('shoot');
            
            // Füze (Ulti) Şarj Mantığı
            const now = Date.now();
            if (lastClickTime > 0 && (now - lastClickTime) < 250) { // Hızlı tıklama var
                nitroCharge += 4; // her hızlı tıkta %4 dolsun
            } else {
                nitroCharge -= 2; 
            }
            
            if (nitroCharge < 0) nitroCharge = 0;
            if (nitroCharge >= 100) {
                activateMissile();
            }
            
            updateMissileUI();
            lastClickTime = now;
        }

        // Buton animasyonu
        const clickBtn = document.getElementById('clickBtn');
        if (clickBtn) {
            clickBtn.style.transform = 'scale(0.9)';
            setTimeout(function() {
                clickBtn.style.transform = 'scale(1)';
            }, 100);
        }
        
        // Haptic feedback (mobil için)
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }
}

function activateMissile() {
    isNitroActive = true;
    nitroCharge = 100;
    
    // Füze atıldığını bildir
    gameSocket.emit('missile');
    
    // Füze çubuğunu yavaş yavaş boşalt
    const nitroInterval = setInterval(() => {
        nitroCharge -= 5;
        updateMissileUI();
        
        if (nitroCharge <= 0) {
            clearInterval(nitroInterval);
            isNitroActive = false;
            nitroCharge = 0;
            updateMissileUI();
        }
    }, 100); // 2 saniyede biter (cooldown)
}

function updateMissileUI() {
    const nitroFill = document.getElementById('nitroFill');
    if (nitroFill) {
        nitroFill.style.height = nitroCharge + '%';
        if (isNitroActive) {
            nitroFill.style.background = '#ff0000'; // Füze rengi kırmızı
            nitroFill.style.boxShadow = '0 0 20px #ff0000';
        } else {
            nitroFill.style.background = '#ffffff';
            nitroFill.style.boxShadow = 'none';
        }
    }
}

function updateCombatDisplay(data) {
    // Kendi powerup durumumuzu kontrol et ve UI'yı güncelle
    const myPosition = data.players.find(p => p.id === myPlayerId);
    if (myPosition && myPosition.powerup !== currentPowerup) {
        currentPowerup = myPosition.powerup;
        updatePowerupUI();
    }

    // Renderer'a hem oyuncuları hem mermileri yolla
    if (typeof updateCanvasPositions === 'function') {
        updateCanvasPositions({
            players: data.players,
            projectiles: data.projectiles,
            obstacles: data.obstacles,
            powerups: data.powerups
        });
    }
    
    // Can barlarını güncelle
    updateHealthBars(data.players);
}

function updateHealthBars(players) {
    // Takım 1 Canı Hesapla (Ortalama veya Toplam, burada ortalama alalım)
    const team1Players = players.filter(p => p.team === 1);
    const team1TotalHp = team1Players.reduce((sum, p) => sum + p.hp, 0);
    const team1HpPercent = team1Players.length > 0 ? (team1TotalHp / (team1Players.length * 100)) * 100 : 0;

    // Takım 2 Canı Hesapla
    const team2Players = players.filter(p => p.team === 2);
    const team2TotalHp = team2Players.reduce((sum, p) => sum + p.hp, 0);
    const team2HpPercent = team2Players.length > 0 ? (team2TotalHp / (team2Players.length * 100)) * 100 : 0;

    const t1Fill = document.getElementById('team1HpFill');
    if (t1Fill) t1Fill.style.width = Math.max(0, team1HpPercent) + '%';

    const t2Fill = document.getElementById('team2HpFill');
    if (t2Fill) t2Fill.style.width = Math.max(0, team2HpPercent) + '%';
}

function showResults(data) {
    console.log('Sonuçlar gösteriliyor:', data);
    gameState = 'finished';
    
    // Yarış ekranını gizle, sonuç ekranını göster
    const raceScreen = document.getElementById('raceScreen');
    const resultScreen = document.getElementById('resultScreen');
    
    if (raceScreen) raceScreen.classList.remove('active');
    if (resultScreen) resultScreen.classList.add('active');
    
    // Kazananı göster
    const winnerName = document.getElementById('winnerName');
    if (winnerName && data.winner) {
        // Kazanan takımın adını yazdır
        const winnerObj = data.rankings.find(r => r.id === data.winner);
        if (winnerObj) {
            winnerName.textContent = `TAKIM ${winnerObj.team} KAZANDI!`;
            winnerName.style.color = winnerObj.team === 1 ? '#ff3333' : '#3333ff';
        }
    } else {
        if(winnerName) winnerName.textContent = "BERABARE / OYUN BİTTİ";
    }
    
    // Sıralamayı (Kalan Canları) göster
    const finalRankings = document.getElementById('finalRankings');
    if (finalRankings) {
        let rankingsHTML = '';
        data.rankings.forEach((player, index) => {
            const teamColor = player.team === 1 ? '#ff3333' : '#3333ff';
            rankingsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: rgba(255,255,255,0.1); border-radius: 10px; border-left: 5px solid ${teamColor};">
                    <span style="color: ${teamColor}; font-weight: bold; font-size: 1.2rem;">${player.name} (T${player.team})</span>
                    <span style="color: #ffffff; font-weight: bold;">✚ ${Math.max(0, player.hp)} HP</span>
                </div>
            `;
        });
        finalRankings.innerHTML = rankingsHTML;
    }
    
    // Konfeti efekti
    createConfetti();
}

function createConfetti() {
    // Basit konfeti animasyonu
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 50; i++) {
        setTimeout(function() {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.top = '-10px';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = '50%';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            confetti.style.animation = 'confettiFall 3s linear forwards';
            
            document.body.appendChild(confetti);
            
            setTimeout(function() {
                confetti.remove();
            }, 3000);
        }, i * 100);
    }
    
    // CSS animasyonu ekle
    const style = document.createElement('style');
    style.textContent = `
        @keyframes confettiFall {
            0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

function playAgain() {
    console.log('Tekrar oynanıyor');
    window.location.href = '/';
}