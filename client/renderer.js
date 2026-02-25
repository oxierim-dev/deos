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

// Araba görselleri için basit çizimler
const carSVGs = {
    red: `<svg width="60" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="50" height="20" fill="#FF0000" rx="5"/>
        <rect x="15" y="2" width="30" height="8" fill="#8B0000" rx="3"/>
        <circle cx="15" cy="25" r="4" fill="#333"/>
        <circle cx="45" cy="25" r="4" fill="#333"/>
        <rect x="20" y="8" width="20" height="10" fill="#87CEEB" opacity="0.7"/>
    </svg>`,
    blue: `<svg width="60" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="50" height="20" fill="#0000FF" rx="5"/>
        <rect x="15" y="2" width="30" height="8" fill="#00008B" rx="3"/>
        <circle cx="15" cy="25" r="4" fill="#333"/>
        <circle cx="45" cy="25" r="4" fill="#333"/>
        <rect x="20" y="8" width="20" height="10" fill="#87CEEB" opacity="0.7"/>
    </svg>`,
    green: `<svg width="60" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="50" height="20" fill="#00FF00" rx="5"/>
        <rect x="15" y="2" width="30" height="8" fill="#008B00" rx="3"/>
        <circle cx="15" cy="25" r="4" fill="#333"/>
        <circle cx="45" cy="25" r="4" fill="#333"/>
        <rect x="20" y="8" width="20" height="10" fill="#87CEEB" opacity="0.7"/>
    </svg>`,
    yellow: `<svg width="60" height="30" xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="50" height="20" fill="#FFFF00" rx="5"/>
        <rect x="15" y="2" width="30" height="8" fill="#DAA520" rx="3"/>
        <circle cx="15" cy="25" r="4" fill="#333"/>
        <circle cx="45" cy="25" r="4" fill="#333"/>
        <rect x="20" y="8" width="20" height="10" fill="#87CEEB" opacity="0.7"/>
    </svg>`
};

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
    animate();
}

function initCars() {
    cars = [];
    const colors = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00'];
    const colorNames = ['red', 'blue', 'green', 'yellow'];
    
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
            colorName: colorNames[i],
            speed: 0,
            wheelRotation: 0
        });
    }
}

function updateCanvasPositions(positions) {
    if (!positions || positions.length === 0) return;
    
    positions.forEach((player, index) => {
        if (index < cars.length) {
            cars[index].id = player.id;
            cars[index].position = player.position;
            cars[index].color = player.color;
            
            // Pozisyona göre X koordinatını güncelle
            const maxPosition = 1000;
            const progress = Math.min(player.position / maxPosition, 1);
            cars[index].x = 50 + (finishLineX - 100) * progress;
            
            // Tekerlek dönüşü
            cars[index].wheelRotation += progress * 10;
        }
    });
}

function drawBackground() {
    // Gökyüzü gradyanı
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Bulutlar
    drawClouds();
    
    // Pist arka planı
    ctx.fillStyle = '#696969';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Çim kenarları
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, 0, canvasWidth, 20);
    ctx.fillRect(0, canvasHeight - 20, canvasWidth, 20);
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Bulut 1
    drawCloud(100, 50, 40);
    drawCloud(300, 80, 30);
    drawCloud(500, 40, 35);
    drawCloud(700, 70, 25);
}

function drawCloud(x, y, size) {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.arc(x + size, y, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x - size, y, size * 0.8, 0, Math.PI * 2);
    ctx.arc(x + size/2, y - size/2, size * 0.7, 0, Math.PI * 2);
    ctx.fill();
}

function drawTrack() {
    // Şerit çizgileri
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([20, 20]);
    
    for (let i = 1; i < lanes; i++) {
        const y = i * laneHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    // Bitiş çizgisi
    drawFinishLine();
}

function drawFinishLine() {
    // Kareli bayrak deseni
    const squareSize = 10;
    const startY = 20;
    const endY = canvasHeight - 20;
    
    for (let y = startY; y < endY; y += squareSize) {
        for (let x = 0; x < 40; x += squareSize) {
            ctx.fillStyle = ((x / squareSize) + (y / squareSize)) % 2 === 0 ? '#000000' : '#FFFFFF';
            ctx.fillRect(finishLineX + x, y, squareSize, squareSize);
        }
    }
    
    // Bitiş çizgisi yazısı
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px Arial';
    ctx.save();
    ctx.translate(finishLineX + 20, canvasHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('FİNİŞ', -20, 5);
    ctx.restore();
}

function drawCars() {
    cars.forEach((car, index) => {
        if (car.id) {
            drawCar(car);
            
            // Oyuncu ismi
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(car.name, car.x + car.width / 2, car.y - 5);
            ctx.textAlign = 'left';
        }
    });
}

function drawCar(car) {
    // Basit araba çizimi
    ctx.fillStyle = car.color;
    
    // Araba gövdesi
    ctx.fillRect(car.x, car.y + 5, car.width - 10, car.height - 10);
    
    // Araba üstü
    ctx.fillRect(car.x + 10, car.y, car.width - 30, 8);
    
    // Cam
    ctx.fillStyle = 'rgba(135, 206, 235, 0.7)';
    ctx.fillRect(car.x + 15, car.y + 2, car.width - 35, 6);
    
    // Tekerlekler
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(car.x + 15, car.y + car.height - 5, 4, 0, Math.PI * 2);
    ctx.arc(car.x + car.width - 25, car.y + car.height - 5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Egzoz dumanı efekti
    if (car.speed > 0) {
        drawExhaustSmoke(car.x - 10, car.y + car.height / 2);
    }
}

function drawExhaustSmoke(x, y) {
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(x - i * 5, y + Math.random() * 10 - 5, 3 + i, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawSpeedEffects() {
    // Hız efektleri (hareket çizgileri)
    cars.forEach(car => {
        if (car.speed > 0 && car.x > 100) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            
            for (let i = 0; i < 5; i++) {
                ctx.beginPath();
                ctx.moveTo(car.x - 20 - i * 15, car.y + car.height / 2);
                ctx.lineTo(car.x - 30 - i * 15, car.y + car.height / 2);
                ctx.stroke();
            }
            
            ctx.setLineDash([]);
        }
    });
}

function animate() {
    // Canvas'ı temizle
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Arka planı çiz
    drawBackground();
    
    // Pist çizgilerini çiz
    drawTrack();
    
    // Arabaları çiz
    drawCars();
    
    // Hız efektlerini çiz
    drawSpeedEffects();
    
    // Animasyonu devam ettir
    requestAnimationFrame(animate);
}

// Global fonksiyonlar
window.initRaceCanvas = initRaceCanvas;
window.updateCanvasPositions = updateCanvasPositions;