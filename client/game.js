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
    
    // Oyuncu pozisyonlarını dinle
    gameSocket.on('positions', function(data) {
        racePositions = data;
        updateRaceDisplay(data);
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
    if (readyBtn) {
        readyBtn.addEventListener('click', setPlayerReady);
    }
    
    // Tıklama butonunu dinle
    const clickBtn = document.getElementById('clickBtn');
    if (clickBtn) {
        clickBtn.addEventListener('click', handleClick);
        clickBtn.addEventListener('touchstart', handleClick); // Mobil desteği
    }
    
    // Tekrar oyna butonunu dinle
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
        playAgainBtn.addEventListener('click', playAgain);
    }
    
    // Klavye desteği (Space tuşu)
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space' && gameState === 'racing') {
            event.preventDefault();
            handleClick(event);
        }
    });
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
    
    // Tıklama butonuna focus
    const clickBtn = document.getElementById('clickBtn');
    if (clickBtn) {
        clickBtn.focus();
    }
}

function handleClick(event) {
    if (event) event.preventDefault();
    
    // Sadece yarış durumunda tıklamaları gönder
    if (gameState === 'racing') {
        if (!isNitroActive) {
            gameSocket.emit('click');
            
            // Nitro Şarj Mantığı
            const now = Date.now();
            if (lastClickTime > 0 && (now - lastClickTime) < 200) { // Hızlı tıklama var (saniyede 5+ tık)
                nitroCharge += 5; // her hızlı tıkta %5 dolsun
            } else {
                // Yavaşladıysa nitro barı yavaşça düşebilir ama şimdilik tutalım ya da az düşürelim
                nitroCharge -= 1; 
            }
            
            if (nitroCharge < 0) nitroCharge = 0;
            if (nitroCharge >= 100) {
                activateNitro();
            }
            
            updateNitroUI();
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

function activateNitro() {
    isNitroActive = true;
    nitroCharge = 100;
    
    // Nitro efekti (sarsıntı)
    const raceContainer = document.querySelector('.race-track');
    if (raceContainer) raceContainer.classList.add('nitro-shake');
    
    // Sunucuya nitro kullanıldığını bildir
    gameSocket.emit('use_nitro');
    
    // Nitro çubuğunu yavaş yavaş boşalt
    const nitroInterval = setInterval(() => {
        nitroCharge -= 10;
        updateNitroUI();
        
        if (nitroCharge <= 0) {
            clearInterval(nitroInterval);
            isNitroActive = false;
            nitroCharge = 0;
            if (raceContainer) raceContainer.classList.remove('nitro-shake');
        }
    }, 100); // 1 saniyede biter
}

function updateNitroUI() {
    const nitroFill = document.getElementById('nitroFill');
    if (nitroFill) {
        nitroFill.style.height = nitroCharge + '%';
        if (isNitroActive) {
            nitroFill.style.background = '#00ffff'; // Nitro rengi
            nitroFill.style.boxShadow = '0 0 20px #00ffff';
        } else {
            nitroFill.style.background = '#ff00ff';
            nitroFill.style.boxShadow = 'none';
        }
    }
}

function updateRaceDisplay(positions) {
    // Canvas renderer'ı güncelle
    if (typeof updateCanvasPositions === 'function') {
        updateCanvasPositions(positions);
    }
    
    // Sıralamayı güncelle
    updateRanking(positions);
    
    // İlerleme çubuğunu güncelle
    updateProgress(positions);
}

function updateRanking(positions) {
    const rankingList = document.getElementById('rankingList');
    if (rankingList) {
        // Pozisyona göre sırala
        const sortedPositions = [...positions].sort((a, b) => b.position - a.position);
        
        let rankingHTML = '';
        sortedPositions.forEach((player, index) => {
            rankingHTML += `<div style="color: ${player.color}; font-weight: bold; margin: 5px 0;">${index + 1}. ${player.name}</div>`;
        });
        
        rankingList.innerHTML = rankingHTML;
    }
}

function updateProgress(positions) {
    const myPosition = positions.find(p => p.id === myPlayerId);
    if (myPosition) {
        const progressPercent = Math.min((myPosition.position / 1000) * 100, 100);
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = progressPercent + '%';
        }
        
        if (progressText) {
            progressText.textContent = '%' + Math.round(progressPercent);
        }
    }
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
    if (winnerName && data.rankings.length > 0) {
        const winner = data.rankings[0];
        winnerName.textContent = winner.name;
        winnerName.style.color = winner.color;
    }
    
    // Sıralamayı göster
    const finalRankings = document.getElementById('finalRankings');
    if (finalRankings) {
        let rankingsHTML = '';
        data.rankings.forEach((player, index) => {
            rankingsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: rgba(255,255,255,0.1); border-radius: 10px; border-left: 5px solid ${player.color};">
                    <span style="color: ${player.color}; font-weight: bold; font-size: 1.2rem;">${index + 1}. ${player.name}</span>
                    <span style="color: #ffffff; font-weight: bold;">%${Math.round((player.position / 1000) * 100)}</span>
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