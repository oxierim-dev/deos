// Canvas renderer için global değişkenler
let canvas;
let ctx;
let canvasWidth = 800;
let canvasHeight = 400;
let lanes = 4;
let laneHeight;
let cars = [];
let flyingProjectiles = [];
let backgroundOffset = 0;
let particles = [];

// Araba görseli
const carImage = new Image();
carImage.src = '/car_optimized.png';

carImage.onload = () => {
    console.log("Araba resmi başarıyla yüklendi.");
};
carImage.onerror = () => {
    console.error("Araba resmi yüklenemedi! Dosya yolunu kontrol edin.");
};

// Araba çizimi (Image)
function drawPixelCar(ctx, x, y, color, team = 1) {
    ctx.save();
    ctx.translate(x, y);
    if (team === 2) {
        // Yönü sola çevir
        ctx.scale(-1, 1);
        ctx.drawImage(carImage, -80, -7.5, 100, 45);
    } else {
        ctx.drawImage(carImage, -20, -7.5, 100, 45);
    }
    ctx.restore();
}

// Canvas'ı başlat
function initRaceCanvas() {
    canvas = document.getElementById('raceCanvas');
    if (!canvas) {
        console.error('Canvas elementi bulunamadı!');
        return;
    }

    ctx = canvas.getContext('2d');

    // Canvas boyutlarını ayarla
    const rect = canvas.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    // Şerit yüksekliğini hesapla (4 kişi için 2 yan, 2 alt satır)
    laneHeight = canvasHeight / 2; 

    // Arabaları başlat
    initCars();

    // Animasyon döngüsünü başlat
    requestAnimationFrame(animate);
}

function initCars() {
    cars = [];
    // Renkleri sabitleyelim ki oyuncular karışmasın
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];

    // Slot 1: Takım 1 Player 1
    // Slot 2: Takım 2 Player 1
    // Slot 3: Takım 1 Player 2
    // Slot 4: Takım 2 Player 2
    cars.push({ id: null, name: '', team: 1, x: 100, y: laneHeight / 2, color: colors[0], bobOffset: 0, hp: 100, shieldActive: false });
    cars.push({ id: null, name: '', team: 2, x: canvasWidth - 100, y: laneHeight / 2, color: colors[1], bobOffset: 0, hp: 100, shieldActive: false });
    cars.push({ id: null, name: '', team: 1, x: 100, y: (laneHeight / 2) + laneHeight, color: colors[2], bobOffset: 0, hp: 100, shieldActive: false });
    cars.push({ id: null, name: '', team: 2, x: canvasWidth - 100, y: (laneHeight / 2) + laneHeight, color: colors[3], bobOffset: 0, hp: 100, shieldActive: false });
}

function updateCanvasPositions(data) {
    if (!data) return;

    const serverPlayers = data.players || [];
    flyingProjectiles = data.projectiles || [];

    // Arka plan paralaks efekti (yavaşça hareket etsin atmosferik)
    backgroundOffset -= 0.5;
    if (backgroundOffset <= -canvasWidth) backgroundOffset = 0;

    serverPlayers.forEach((player) => {
        // Rengine göre doğru arabayı bul
        const carIndex = cars.findIndex(c => c.color === player.color);

        if (carIndex !== -1) {
            cars[carIndex].id = player.id;
            cars[carIndex].name = player.name || `Player ${player.id.substr(0, 4)}`;
            cars[carIndex].hp = player.hp;
            cars[carIndex].team = player.team;
            cars[carIndex].shieldActive = player.shieldActive;

            // Araba sallanma efekti (Motor çalışıyor hissi)
            if (player.hp > 0) {
                cars[carIndex].bobOffset = Math.sin(Date.now() / 100) * 2;
            } else {
                cars[carIndex].bobOffset = 0;
            }
        }
    });
}

function animate() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground();
    drawArenaLines();
    drawCars();
    drawProjectiles();
    drawParticles();

    requestAnimationFrame(animate);
}

function drawBackground() {
    // Gökyüzü / Siber Punk Arena Arka Planı
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#1a001a'); // Mor/Siyah
    gradient.addColorStop(1, '#001a33'); // Koyu lacivert
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid (Neon Çizgiler Kafesi)
    ctx.save();
    ctx.translate(backgroundOffset, 0);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let j = 0; j < 2; j++) {
        let offsetX = j * canvasWidth;
        for (let i = 0; i < 20; i++) {
            const x = i * 40;
            ctx.beginPath();
            ctx.moveTo(x + offsetX, 0);
            ctx.lineTo(x + offsetX, canvasHeight);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawArenaLines() {
    // Zemini çiz (Arena tabanı)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Orta çizgi (VS Hattı)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawCars() {
    cars.forEach((car) => {
        if (car.id && car.hp > 0) {
            // İsim etiketi
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(`${car.name} (${car.hp})`, car.x, car.y - 35 + car.bobOffset);

            // Kalkan (Shield) Çizimi
            if (car.shieldActive) {
                ctx.save();
                ctx.beginPath();
                ctx.arc(car.x + (car.team === 1 ? 30 : 0), car.y + car.bobOffset + 15, 60, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ffff';
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }

            // Arabayı çiz
            drawPixelCar(ctx, car.x, car.y + car.bobOffset, car.color, car.team);
            
            // Çizim sırasında hafif duman (Sağlam motor egzozu)
            if (Math.random() > 0.4) {
                particles.push({
                    x: car.x + (car.team === 1 ? -10 : 30),
                    y: car.y + 20 + car.bobOffset,
                    vx: car.team === 1 ? -Math.random()*2 : Math.random()*2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 0.5,
                    color: '#888'
                });
            }

        } else if (car.id && car.hp <= 0) {
            // Ölü (Yok edilmiş kaza halinde araç)
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 14px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(`ELENDİ`, car.x, car.y - 30);
            
            // Yoğun siyah duman
            if(Math.random() > 0.5) {
                 particles.push({
                    x: car.x + (Math.random() - 0.5) * 40,
                    y: car.y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -Math.random() * 3,
                    life: 1.5,
                    color: '#333'
                });
            }
        }
    });
}

function drawProjectiles() {
    flyingProjectiles.forEach(p => {
        const startX = p.team === 1 ? 160 : canvasWidth - 160;
        const endX = p.team === 1 ? canvasWidth - 100 : 100;
        const currentX = startX + ((endX - startX) * (p.progress / 100));
        
        // Atan arabayı bul (Y eksenini ayarlamak için)
        const ownerCar = cars.find(c => c.id === p.ownerId);
        const y = ownerCar ? ownerCar.y + 15 : canvasHeight / 2;

        ctx.save();
        if (p.type === 'missile') {
            // Füze Çizimi
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff5555';
            ctx.shadowBlur = 15;
            ctx.fillRect(currentX - 15, y - 8, 30, 16);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(currentX + (p.team === 1 ? 10 : -15), y - 4, 10, 8); // Füze başlığı
            
            // Füze ateşi dumanı
            particles.push({
                x: currentX + (p.team === 1 ? -20 : 20),
                y: y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 1.0,
                color: '#ffaa00'
            });
        } else {
            // Lazer / Mermi Çizimi
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.fillRect(currentX - 10, y - 2, 20, 4);
        }
        ctx.restore();
    });
}

function drawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        
        ctx.beginPath();
        if (isFinite(p.x) && isFinite(p.y)) {
            ctx.arc(p.x, p.y, Math.random() * 4 + 2, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }
}

// Global fonksiyonlar
window.initRaceCanvas = initRaceCanvas;
window.updateCanvasPositions = updateCanvasPositions;