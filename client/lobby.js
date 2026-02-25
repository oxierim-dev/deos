// Lobby yönetimi için global değişkenler
let socket;
let currentRoom = null;
let myPlayerId = null;

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    initializeLobby();
});

function initializeLobby() {
    // Socket.IO bağlantısını kur
    socket = io();
    
    // Bağlantı olaylarını dinle
    socket.on('connect', function() {
        console.log('Sunucuya bağlandı:', socket.id);
        myPlayerId = socket.id;
    });
    
    socket.on('disconnect', function() {
        console.log('Sunucudan ayrıldı');
    });
    
    // Lobby güncelleme olayını dinle
    socket.on('lobby_update', function(data) {
        updateLobbyUI(data);
    });
    
    // Tüm oyuncular hazır olayını dinle
    socket.on('all_ready', function(data) {
        showCountdown(data.countdown);
    });
    
    // Yarış başlatma olayını dinle
    socket.on('race_start', function(data) {
        startRace(data.countdown);
    });
    
    // Yarış bitiş olayını dinle
    socket.on('race_finish', function(data) {
        showResults(data);
    });
    
    // Oyuncu pozisyonlarını dinle
    socket.on('positions', function(data) {
        updateRacePositions(data);
    });
    
    // Ana sayfadaki "YARIŞA KATIL" butonlarını dinle
    const joinRaceBtn2 = document.getElementById('joinRaceBtn2');
    if (joinRaceBtn2) {
        joinRaceBtn2.addEventListener('click', () => joinLobby(2));
    }

    const joinRaceBtn4 = document.getElementById('joinRaceBtn4');
    if (joinRaceBtn4) {
        joinRaceBtn4.addEventListener('click', () => joinLobby(4));
    }
    
    // Game sayfasındaki hazır butonunu dinle
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
}

function joinLobby(mode = 4) {
    const nameInput = document.getElementById('playerNameInput');
    const playerName = nameInput ? nameInput.value.trim() : '';
    
    if (!playerName) {
        alert('Lütfen bir kullanıcı adı giriniz!');
        if (nameInput) nameInput.focus();
        return;
    }
    
    console.log('Lobiye katılıyor... Mod:', mode, 'İsim:', playerName);
    
    // Ana sayfadan game sayfasına geç
    setTimeout(function() {
        window.location.href = '/game?mode=' + mode + '&name=' + encodeURIComponent(playerName);
    }, 500);
}

function updateLobbyUI(data) {
    console.log('Lobby güncellendi:', data);
    currentRoom = data.roomId;
    
    // Oyuncu sayacını güncelle
    const playerCounter = document.getElementById('playerCounter');
    if (playerCounter) {
        playerCounter.textContent = `Oyuncu bekleniyor... (${data.playerCount}/4)`;
    }
    
    // Oyuncu slotlarını güncelle
    updatePlayerSlots(data.players);
    
    // Hazır butonunu kontrol et
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        if (data.playerCount === 4) {
            readyBtn.disabled = false;
            readyBtn.style.opacity = '1';
        } else {
            readyBtn.disabled = true;
            readyBtn.style.opacity = '0.6';
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
    socket.emit('player_ready');
    
    // Butonu devre dışı bırak
    const readyBtn = document.getElementById('readyBtn');
    if (readyBtn) {
        readyBtn.disabled = true;
        readyBtn.style.opacity = '0.6';
        readyBtn.textContent = 'HAZIR';
    }
}

function showCountdown(countdown) {
    console.log('Geri sayım başlıyor:', countdown);
    
    // Lobby ekranını gizle, geri sayım ekranını göster
    const lobbyScreen = document.getElementById('lobbyScreen');
    const countdownScreen = document.getElementById('countdownScreen');
    
    if (lobbyScreen) lobbyScreen.classList.remove('active');
    if (countdownScreen) countdownScreen.classList.add('active');
    
    // Geri sayımı başlat
    let currentCountdown = countdown;
    const countdownNumber = document.getElementById('countdownNumber');
    
    const countdownInterval = setInterval(function() {
        if (countdownNumber) {
            countdownNumber.textContent = currentCountdown;
        }
        
        currentCountdown--;
        
        if (currentCountdown < 0) {
            clearInterval(countdownInterval);
            // Yarış ekranına geçiş game.js'de handle edilecek
        }
    }, 1000);
}

function startRace(countdown) {
    console.log('Yarış başlıyor:', countdown);
    
    // Geri sayım ekranını gizle, yarış ekranını göster
    const countdownScreen = document.getElementById('countdownScreen');
    const raceScreen = document.getElementById('raceScreen');
    
    if (countdownScreen) countdownScreen.classList.remove('active');
    if (raceScreen) raceScreen.classList.add('active');
    
    // Canvas renderer'ı başlat
    if (typeof initRaceCanvas === 'function') {
        initRaceCanvas();
    }
}

function handleClick(event) {
    event.preventDefault();
    
    // Sadece yarış durumunda tıklamaları gönder
    const raceScreen = document.getElementById('raceScreen');
    if (raceScreen && raceScreen.classList.contains('active')) {
        console.log('Tıklama gönderiliyor');
        socket.emit('click');
        
        // Buton animasyonu
        const clickBtn = document.getElementById('clickBtn');
        if (clickBtn) {
            clickBtn.style.transform = 'scale(0.9)';
            setTimeout(function() {
                clickBtn.style.transform = 'scale(1)';
            }, 100);
        }
    }
}

function updateRacePositions(positions) {
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
            rankingHTML += `<div style="color: ${player.color};">${index + 1}. ${player.name}</div>`;
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
    console.log('Yarış bitti:', data);
    
    // Yarış ekranını gizle, sonuç ekranını göster
    const raceScreen = document.getElementById('raceScreen');
    const resultScreen = document.getElementById('resultScreen');
    
    if (raceScreen) raceScreen.classList.remove('active');
    if (resultScreen) resultScreen.classList.add('active');
    
    // Kazananı göster
    const winnerName = document.getElementById('winnerName');
    if (winnerName) {
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
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: rgba(255,255,255,0.1); border-radius: 10px;">
                    <span style="color: ${player.color}; font-weight: bold;">${index + 1}. ${player.name}</span>
                    <span style="color: #ffffff;">%${Math.round((player.position / 1000) * 100)}</span>
                </div>
            `;
        });
        finalRankings.innerHTML = rankingsHTML;
    }
}

function playAgain() {
    console.log('Tekrar oynanıyor');
    window.location.href = '/';
}