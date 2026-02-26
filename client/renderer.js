// Canvas renderer için global değişkenler
let canvas;
let ctx;
let canvasWidth = 800;
let canvasHeight = 400;
let trackLength = 1000;
let lanes = 4;
let laneHeight;
let cars = [];
let finishLineX;
let backgroundOffset = 0;
let trackOffset = 0;
let particles = [];

// Araba görseli
const carImage = new Image();
carImage.src = 'car_optimized.png';

// Araba çizimi (Image)
function drawPixelCar(ctx, x, y, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    // Arabayı yeni boyutuyla çiziyoruz (Genişlik: 100, Yükseklik: 45)
    ctx.drawImage(carImage, -20, -7.5, 100, 45);
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

    // Şerit yüksekliğini hesapla
    laneHeight = canvasHeight / lanes;

    // Bitiş çizgisi pozisyonu
    finishLineX = canvasWidth - 80;

    // Arabaları başlat
    initCars();

    // Animasyon döngüsünü başlat
    requestAnimationFrame(animate);
}

function initCars() {
    cars = [];
    // Renkleri sabitleyelim ki oyuncular karışmasın
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];

    for (let i = 0; i < lanes; i++) {
        cars.push({
            id: null,
            name: '',
            x: 50,
            y: (i * laneHeight) + (laneHeight / 2) - 15,
            width: 60,
            height: 30,
            position: 0,
            color: colors[i],
            speed: 0,
            bobOffset: 0
        });
    }
}

function updateCanvasPositions(positions) {
    if (!positions || positions.length === 0) return;

    // Hız efekti için track offset güncelle
    // En hızlı arabanın hızına göre arka planı hareket ettir
    // Ancak burada basitçe sürekli bir hareket verelim
    trackOffset -= 2;
    backgroundOffset -= 0.5;

    if (trackOffset <= -40) trackOffset = 0;
    if (backgroundOffset <= -canvasWidth) backgroundOffset = 0;

    positions.forEach((player) => {
        // Rengine göre doğru arabayı bul
        const carIndex = cars.findIndex(c => c.color === player.color);

        if (carIndex !== -1) {
            cars[carIndex].id = player.id;
            cars[carIndex].name = player.name || `Player ${player.id.substr(0, 4)}`; // İsim yoksa ID kullan
            cars[carIndex].position = player.position;

            // Pozisyona göre X koordinatını güncelle (0-1000 arası)
            // Ekranın %10'undan başlayıp %90'ına kadar gitsin
            const maxPosition = 1000;
            const screenStart = 50;
            const screenEnd = canvasWidth - 100;
            const progress = Math.min(player.position / maxPosition, 1);

            // Hedef X pozisyonu
            const targetX = screenStart + (screenEnd - screenStart) * progress;

            // Yumuşak geçiş (Interpolation)
            cars[carIndex].x += (targetX - cars[carIndex].x) * 0.1;

            // Araba sallanma efekti (Motor çalışıyor hissi)
            cars[carIndex].bobOffset = Math.sin(Date.now() / 100) * 2;

            // Egzoz partikülü ekle (hız hissini artırmak için)
            if (Math.random() > 0.2) {
                particles.push({
                    x: cars[carIndex].x - 10,
                    y: cars[carIndex].y + 20 + cars[carIndex].bobOffset,
                    vx: -Math.random() * 5 - 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1.0,
                    color: cars[carIndex].color
                });
            }
        }
    });
}

function animate() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground();
    drawTrack();
    drawParticles();
    drawCars();

    requestAnimationFrame(animate);
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
        ctx.arc(p.x, p.y, Math.random() * 4 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawBackground() {
    // Gökyüzü (Sabit)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#0a0a2a'); // Gece mavisi
    gradient.addColorStop(1, '#2a2a40');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Uzak Şehir Silüeti (Paralaks - Yavaş Hareket)
    ctx.save();
    ctx.fillStyle = '#111';
    ctx.translate(backgroundOffset, 0);

    // Şehir silüetini iki kez çiz (döngüsel olması için)
    for (let j = 0; j < 2; j++) {
        let offsetX = j * canvasWidth;
        for (let i = 0; i < 20; i++) {
            const h = 50 + Math.random() * 100;
            const w = 40 + Math.random() * 40;
            const x = i * 60;
            ctx.fillRect(x + offsetX, canvasHeight - h, w, h);

            // Pencere ışıkları
            ctx.fillStyle = '#FFFF00';
            if (Math.random() > 0.5) {
                ctx.fillRect(x + offsetX + 10, canvasHeight - h + 10, 5, 5);
            }
            ctx.fillStyle = '#111';
        }
    }
    ctx.restore();
}

function drawTrack() {
    // Pist Zemini
    ctx.fillStyle = '#222'; // Koyu asfalt
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Şerit Çizgileri (Hareketli)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    ctx.lineDashOffset = -trackOffset; // Hareket efekti

    for (let i = 1; i < lanes; i++) {
        const y = i * laneHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }

    ctx.setLineDash([]);

    // Bitiş Çizgisi (Eğer birisi yaklaştıysa çiz)
    // Basitlik için her zaman çiziyoruz ama konumu sabit
    drawFinishLine();
}

function drawFinishLine() {
    const squareSize = 10;
    const startY = 0;
    const endY = canvasHeight;
    const finishX = canvasWidth - 80;

    for (let y = startY; y < endY; y += squareSize) {
        for (let x = 0; x < 20; x += squareSize) {
            ctx.fillStyle = ((x / squareSize) + (y / squareSize)) % 2 === 0 ? '#000000' : '#FFFFFF';
            ctx.fillRect(finishX + x, y, squareSize, squareSize);
        }
    }

    // Bitiş yazısı
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 20px Orbitron';
    ctx.save();
    ctx.translate(finishX + 35, canvasHeight / 2);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('FINISH', -30, 0);
    ctx.restore();
}

function drawCars() {
    cars.forEach((car) => {
        if (car.id) {
            // İsim etiketi
            ctx.fillStyle = '#FFF';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(car.name, car.x + 30, car.y - 10 + car.bobOffset);

            // Arabayı çiz
            drawPixelCar(ctx, car.x, car.y + car.bobOffset, car.color);
        }
    });
}

// Global fonksiyonlar
window.initRaceCanvas = initRaceCanvas;
window.updateCanvasPositions = updateCanvasPositions;