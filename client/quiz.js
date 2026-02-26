// quiz.js

// 10 Soruluk Havuz. Şu anki geçici sorularda bilerek hepsinin cevabı 'A' ayarlandı (index 0)
const questions = [
    { text: "DEOS Car'ın 2026 modeli hangi renk?", options: ["A) Kırmızı", "B) Mavi", "C) Siyah", "D) Beyaz"], correct: 0 },
    { text: "Lobi'de hazır olmak için kaç saniyeniz var?", options: ["A) 20 Saniye", "B) 10 Saniye", "C) 30 Saniye", "D) 60 Saniye"], correct: 0 },
    { text: "Kalkan yeteneği arabayı ne kadar korur?", options: ["A) 3 Saniye", "B) Sonsuza dek", "C) 1 Saniye", "D) 5 Saniye"], correct: 0 },
    { text: "Oyunun ana ekseninde ne vardır?", options: ["A) Araç Savaşı", "B) Çiftçilik", "C) Bulmaca", "D) Simülasyon"], correct: 0 },
    { text: "Oyunda bir takımdaki maksimum oyuncu sayısı kaçtır?", options: ["A) 2 Oyuncu", "B) 4 Oyuncu", "C) 8 Oyuncu", "D) 1 Oyuncu"], correct: 0 },
    { text: "Soruları doğru bilirsek ne olur?", options: ["A) Hasar veririz", "B) Oyun Çöker", "C) Şarkı Çalar", "D) Benzin Artar"], correct: 0 },
    { text: "Siperler oyun ilerledikçe ne hale gelebilir?", options: ["A) Yıkılabilir", "B) Büyürler", "C) Tırmanılır", "D) Sağlık verir"], correct: 0 },
    { text: "Hangi yetenek duvarları tekte yıkar?", options: ["A) Wall Breaker", "B) Heal", "C) Triple Shot", "D) Shield"], correct: 0 },
    { text: "Zemin üzerinde arabalarla nasıl hareket edilir?", options: ["A) WASD / Ok Tuşları", "B) Mouse ile", "C) Çizerek", "D) Sesle"], correct: 0 },
    { text: "DEOS Car'ın gücü tasarımından mı gelir?", options: ["A) Evet kesinlikle", "B) Hayır falandır", "C) Belki", "D) Yok artık"], correct: 0 }
];

let currentLevelIndex = 0;
let enemyMaxHp = 100;
let enemyHp = 100;

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
    }, 30); // Daktilo hızı
}

function showNextQuestion() {
    if (currentLevelIndex >= questions.length || enemyHp <= 0) {
        winGame();
        return;
    }

    const q = questions[currentLevelIndex];
    typeWriterEffect(q.text, () => {
        // Şıkları göster
        dialogueText.style.display = 'none';
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
        // DOĞRU CEVAP
        dialogueText.style.display = 'block';
        optionsGrid.style.display = 'none';
        dialogueText.innerHTML = "Etkili bir vuruş!";
        
        takeDamage(10); // 10 Soru * 10 = 100 Can
        
        setTimeout(() => {
            currentLevelIndex++;
            showNextQuestion();
        }, 2200);
    } else {
        // YANLIŞ CEVAP
        dialogueText.style.display = 'block';
        optionsGrid.style.display = 'none';
        dialogueText.innerHTML = "Bu vuruş hiç etkili olmadı...";
        
        // Alay etme hali - Mutlu Surat
        setSprite(SPRITE_HAPPY);
        
        setTimeout(() => {
            if (enemyHp > 0) setSprite(SPRITE_NORMAL);
            showNextQuestion();
        }, 2500);
    }
}

function takeDamage(amount) {
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

function winGame() {
    typeWriterEffect("Rakip DEOS CAR bayıldı! SAVAŞI KAZANDIN!", () => {
        setTimeout(() => {
            window.location.href = '/'; // Lobiye dön
        }, 4000);
    });
}

function setSprite(src) {
    sprite.src = src;
}
