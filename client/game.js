// Oyun yönetimi için global değişkenler
let gameSocket;
let gameState = 'lobby'; // lobby, countdown, racing, finished
let currentRoom = null;
let myPlayerId = null;
let racePositions = [];
let countdownInterval = null;

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
    
    // URL'den modu al
    const urlParams = new URLSearchParams(window.location.search);
    const mode = parseInt(urlParams.get('mode')) || 4;
    
    gameSocket.emit('join_lobby', { mode: mode });
}

function updateLobbyUI(data) {
    // Oyuncu sayacını güncelle
    const playerCounter = document.getElementById('playerCounter');
    if (playerCounter) {
        playerCounter.innerHTML = `Oda: <strong>${data.roomId}</strong><br>Oyuncu bekleniyor... (${data.playerCount}/${data.maxPlayers})`;
    }
    
    // Oyuncu slotlarını güncelle
    updatePlayerSlots(data.players);
    
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

function updatePlayerSlots(players) {
    for (let i = 1; i <= 4; i++) {
        const playerSlot = document.getElementById(`player${i}`);
        const player = players[i - 1];
        
        if (playerSlot) {
            if (player) {
                playerSlot.classList.add('active');
                
                const playerColor = playerSlot.querySelector('.player-color');
                const playerName = playerSlot.querySelector('.player-name');
                const playerStatus = playerSlot.querySelector('.player-status');
                
                if (playerColor) {
                    playerColor.style.backgroundColor = player.color;
                }
                
                if (playerName) {
                    playerName.textContent = player.name;
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
    event.preventDefault();
    
    // Sadece yarış durumunda tıklamaları gönder
    if (gameState === 'racing') {
        console.log('Tıklama gönderiliyor');
        gameSocket.emit('click');
        
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