// quiz.js

// Otonom Araçlar temalı 11 adet gittikçe zorlaşan soru havuzu
const questions = [
    { text: "Teknolojide sıkça duyduğumuz 'Otonom' kelimesinin temel anlamı nedir?", options: ["A) Kendi Kendine Yeten / Yöneden", "B) Elektrikli Motor", "C) Hızlı Giden", "D) Uzaktan Kumandalı"], correct: 0 },
    { text: "Tekerleklerin bağlandığı ve gücün iletilmesini sağlayan mil sistemine ne ad verilir?", options: ["A) Dingil (Aks)", "B) Amortisör", "C) Şasi", "D) Buji"], correct: 0 },
    { text: "Aşağıdakilerden hangisi doğrudan bir 'Mikrodenetleyici' DEĞİLDİR (kart düzeyinde bilgisayardır)?", options: ["A) Arduino Uno", "B) Raspberry Pi", "C) ESP32", "D) PIC16F877A"], correct: 1 },
    { text: "Otonom araçların çevresini lazer ışınlarıyla 3 boyutlu taramasını sağlayan en önemli donanım hangisidir?", options: ["A) LIDAR", "B) Radar", "C) Ultrasonik Sensör", "D) Termal Kamera"], correct: 0 },
    { text: "Sürücüye hiç ihtiyaç duyulmayan 'Tam Otonom' sürüş seviyesi hangisidir?", options: ["A) Seviye 3", "B) Seviye 4", "C) Seviye 5", "D) Seviye 6"], correct: 2 },
    { text: "Şerit Takip Sistemi (LKA) temel olarak ne işe yarar?", options: ["A) Aracı şeritte tutar", "B) Hızı artırır", "C) Yakıt tasarrufu sağlar", "D) Silecekleri açar"], correct: 0 },
    { text: "Araçların çevresiyle haberleştiği 'V2X' sisteminin açılımı nedir?", options: ["A) Velocity 2 X", "B) Vehicle to Everything", "C) Value to X", "D) Vision to X"], correct: 1 },
    { text: "Otonom aracın önünde hiçbir engel yokken aniden fren yapması hatasına ne ad verilir?", options: ["A) Panic Stop", "B) Phantom Braking", "C) Ghost Stop", "D) Sudden Halt"], correct: 1 },
    { text: "Görüntü işleme ve nesne tanıma (object detection) için en sık kullanılan yapay zeka mimarisi hangisidir?", options: ["A) RNN", "B) LSTM", "C) CNN (Evrişimli Sinir Ağları)", "D) GAN"], correct: 2 },
    { text: "Araçlarda haritalama ve lokalizasyon için kullanılan SLAM algoritmasının açılımı nedir?", options: ["A) Simultaneous Localization and Mapping", "B) Simple Location and Movement", "C) Secure Location and Mapping", "D) System Level Auto Movement"], correct: 0 },
    { text: "Otonom araç simülasyonları geliştirmek için yaygın olarak kullanılan popüler açık kaynaklı platform hangisidir?", options: ["A) CARLA", "B) Unity ML", "C) Unreal Engine", "D) Gazebo"], correct: 0 }
];

let currentLevelIndex = 0;
let enemyMaxHp = 6;
let enemyHp = 6;

let playerMaxHp = 6;
let playerHp = 6;

const playerHpFill = document.getElementById('player-hp-fill');
const playerSprite = document.getElementById('player-sprite');
const PLAYER_SPRITE_NORMAL = "/public/anakarakter.png";
const PLAYER_SPRITE_WIN = "/public/anakarakterkazanınca.png";

function setPlayerSprite(src) {
    playerSprite.src = src;
}

// UI Elements
const hpFill = document.getElementById('enemy-hp-fill');
const dialogueText = document.getElementById('dialogue-text');
const optionsGrid = document.getElementById('options-grid');
const sprite = document.getElementById('enemy-sprite');

// SPRITES (Public klasöründe yer almakta)
const SPRITE_NORMAL = "/public/DEOS CAR NORMAL.png";
const SPRITE_ANGRY = "/public/DEOS CAR SİNİRLİ.png";
const SPRITE_HAPPY = "/public/DEOS CAR MUTLU.png";

// Oyunun Başlatılması
setTimeout(() => {
    typeWriterEffect("Vahşi DEOS CAR belirdi!", () => {
        setTimeout(showNextQuestion, 2000);
    });
}, 1000);

let isTyping = false;
let typeInterval;

function typeWriterEffect(text, callback) {
    if (typeInterval) clearInterval(typeInterval);
    dialogueText.innerHTML = "";
    optionsGrid.style.display = 'none';
    dialogueText.style.display = 'block';

    let i = 0;
    isTyping = true;
    typeInterval = setInterval(() => {
        dialogueText.innerHTML += text.charAt(i);
        i++;
        if (i >= text.length) {
            clearInterval(typeInterval);
            isTyping = false;
            if (callback) callback();
        }
    }, 80); // Daktilo hızı yavaşlatıldı (30'dan 80'e çıkarıldı)
}

function showNextQuestion() {
    if (enemyHp <= 0) {
        winGame();
        return;
    }
    if (playerHp <= 0) {
        loseGame();
        return;
    }
    if (currentLevelIndex >= questions.length) {
        // Eğer sorular bittiğinde ölmediysek de kazanalım veya özel durum yapalım. Şimdilik winGame diyelim.
        winGame();
        return;
    }

    const q = questions[currentLevelIndex];
    typeWriterEffect(q.text, () => {
        // Şıkları göster (soruyu gizleme)
        optionsGrid.style.display = 'grid';

        for (let i = 0; i < 4; i++) {
            const btn = document.getElementById(`btn-${i}`);
            btn.innerText = q.options[i];
            btn.disabled = false;
        }
    });
}

function selectAnswer(index) {
    if (isTyping) return;

    // Butonları kilitle
    for (let i = 0; i < 4; i++) {
        document.getElementById(`btn-${i}`).disabled = true;
    }

    const q = questions[currentLevelIndex];
    if (index === q.correct) {
        // DOĞRU CEVAP - Arabaya vuruyoruz
        optionsGrid.style.display = 'none';
        dialogueText.innerHTML = "Doğru Cevap! Rakibe hasar verdin!";

        takeEnemyDamage(1);
        setPlayerSprite(PLAYER_SPRITE_WIN); // 3 seconds win sprite

        setTimeout(() => {
            currentLevelIndex++;
            setPlayerSprite(PLAYER_SPRITE_NORMAL);
            showNextQuestion();
        }, 3000);
    } else {
        // YANLIŞ CEVAP - Bize vuruyorlar
        optionsGrid.style.display = 'none';
        dialogueText.innerHTML = "Yanlış Cevap! Hasar aldın...";

        takePlayerDamage(1);
        setSprite(SPRITE_HAPPY); // Araba mutlu oluyor bizi vurduğu için

        setTimeout(() => {
            if (enemyHp > 0) setSprite(SPRITE_NORMAL);
            currentLevelIndex++;
            showNextQuestion();
        }, 3000);
    }
}

function takeEnemyDamage(amount) {
    enemyHp -= amount;
    if (enemyHp < 0) enemyHp = 0;

    // Can Barı Güncellemesi
    const percent = (enemyHp / enemyMaxHp) * 100;
    hpFill.style.width = percent + '%';

    // Yüzdeye Göre Renkler
    if (percent <= 20) {
        hpFill.className = 'hp-bar-fill hp-red';
    } else if (percent <= 50) {
        hpFill.className = 'hp-bar-fill hp-yellow';
    } else {
        hpFill.className = 'hp-bar-fill';
    }

    // Animasyon ve SİNİRLİ sprite geçişi
    setSprite(SPRITE_ANGRY);
    sprite.classList.add('damage-anim');

    setTimeout(() => {
        sprite.classList.remove('damage-anim');
        if (enemyHp > 0) {
            setSprite(SPRITE_NORMAL);
        } else {
            // Ölüm Efekti
            sprite.style.filter = 'drop-shadow(0 0 15px red) grayscale(100%)';
            sprite.style.transform = 'translateY(80px) scaleY(0.1)';
            sprite.style.opacity = '0';
            sprite.style.transition = 'all 1.5s cubic-bezier(0.5, 0, 1, 1)';
        }
    }, 500); // Hasar animasyon süresi beklemesi
}

function takePlayerDamage(amount) {
    playerHp -= amount;
    if (playerHp < 0) playerHp = 0;

    // Can Barı Güncellemesi
    const percent = (playerHp / playerMaxHp) * 100;
    playerHpFill.style.width = percent + '%';

    if (percent <= 20) {
        playerHpFill.className = 'hp-bar-fill hp-red';
    } else if (percent <= 50) {
        playerHpFill.className = 'hp-bar-fill hp-yellow';
    } else {
        playerHpFill.className = 'hp-bar-fill';
    }

    // Ekran Titremesi (Hasar alıyoruz)
    const battleScene = document.getElementById('battle-scene');
    battleScene.classList.add('damage-anim');
    setTimeout(() => {
        battleScene.classList.remove('damage-anim');
    }, 500);
}

function winGame() {
    typeWriterEffect("Rakip DEOS CAR bayıldı! SAVAŞI KAZANDIN!", () => {
        setTimeout(() => {
            window.location.href = '/'; // Lobiye dön
        }, 4000);
    });
}

function loseGame() {
    typeWriterEffect("Canın tükendi... Savaşı Kaybettin.", () => {
        setTimeout(() => {
            window.location.href = '/'; // Lobiye dön
        }, 4000);
    });
}

function setSprite(src) {
    sprite.src = src;
}
