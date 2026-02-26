// Canvas renderer için global değişkenler
let canvas;
let ctx;
let canvasWidth = 800;
let canvasHeight = 400;
let cars = [];
let flyingProjectiles = [];
let mapObstacles = [];
let mapPowerups = [];
let particles = [];

// Canvas'ı başlat
function initRaceCanvas() {
    canvas = document.getElementById('raceCanvas');
    if (!canvas) {
        console.error('Canvas elementi bulunamadı!');
        return;
    }

    ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;

    // Sadece referans için boş arabalar (sunucudan dolacak)
    cars = []; 
    
    requestAnimationFrame(animate);
}

// Procedural Top-Down Araba Çizimi
function drawTopDownCar(ctx, x, y, color, team = 1, hp = 100) {
    ctx.save();
    ctx.translate(x, y);
    
    // Yönlendirme
    if (team === 2) {
        ctx.scale(-1, 1);
    }
    
    const w = 60;
    const h = 30;

    // Hasar Efekti (Rengini karartma)
    ctx.globalAlpha = hp > 0 ? 1.0 : 0.5;

    // Tekerlekler (Siyah küçük rectler)
    ctx.fillStyle = '#111';
    ctx.fillRect(-5, -h/2 - 2, 12, 6); // Sol üst
    ctx.fillRect(w - 15, -h/2 - 2, 12, 6); // Sağ üst
    ctx.fillRect(-5, h/2 - 4, 12, 6); // Sol alt
    ctx.fillRect(w - 15, h/2 - 4, 12, 6); // Sağ alt

    // Araç Şasisi (Gövde)
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 5;
    ctx.fillRect(0, -h/2, w, h);

    // Cam / Ön Panel
    ctx.fillStyle = '#88ccff';
    ctx.shadowBlur = 0;
    ctx.fillRect(w - 20, -h/2 + 4, 10, h - 8);

    // Arka Işıklar (Egzoz tarafı kırmızı stop)
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(0, -h/2 + 2, 4, 6);
    ctx.fillRect(0, h/2 - 8, 4, 6);

    ctx.restore();
}

function updateCanvasPositions(data) {
    if (!data) return;

    const serverPlayers = data.players || [];
    flyingProjectiles = data.projectiles || [];
    mapObstacles = data.obstacles || [];
    mapPowerups = data.powerups || [];

    // Sunucudan gelen oyuncu listesini yerel listeye eşle
    serverPlayers.forEach((sp) => {
        let localCar = cars.find(c => c.id === sp.id);
        if (!localCar) {
            localCar = { id: sp.id, color: sp.color };
            cars.push(localCar);
        }
        
        localCar.name = sp.name;
        localCar.hp = sp.hp;
        localCar.team = sp.team;
        localCar.powerup = sp.powerup;
        localCar.x = sp.x;
        localCar.y = sp.y;
    });

    // Temizlik: Sunucuda olmayan oyuncuları sil
    cars = cars.filter(c => serverPlayers.some(sp => sp.id === c.id));
}

function animate() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground();
    drawPowerups();
    drawObstacles();
    drawCars();
    drawProjectiles();
    drawParticles();

    requestAnimationFrame(animate);
}

function drawBackground() {
    // Top-down arena zemini (Asfalt / Beton)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid çizgileri
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for(let i=0; i<canvasWidth; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvasHeight); ctx.stroke();
    }
    for(let j=0; j<canvasHeight; j+=40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(canvasWidth, j); ctx.stroke();
    }

    // Orta çizgi (Ateşkes Hattı)
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawObstacles() {
    mapObstacles.forEach(obs => {
        if (obs.hp <= 0) return; // Yıkılmış duvarı çizme
        
        ctx.save();
        ctx.translate(obs.x, obs.y);
        
        // Beton Blok
        ctx.fillStyle = '#555';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 10;
        ctx.fillRect(0, 0, obs.width, obs.height);
        
        // Çatlak / Hasar Göstergesi
        if (obs.hp < 50) {
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(obs.width/2, obs.height/2);
            ctx.lineTo(obs.width, 0);
            ctx.stroke();
        }

        ctx.restore();
    });
}

function drawPowerups() {
    mapPowerups.forEach(pu => {
        ctx.save();
        ctx.translate(pu.x, pu.y);
        
        let bgColor = '#ffff00';
        let txt = '?';
        
        if (pu.type === 'heal') { bgColor = '#00ff00'; txt = '+'; }
        else if (pu.type === 'tripleshot') { bgColor = '#00ffff'; txt = '///'; }
        else if (pu.type === 'wallbreaker') { bgColor = '#ff0000'; txt = 'X'; }

        // Parlama efekti (Nefes Alma)
        let glow = Math.abs(Math.sin(Date.now() / 200)) * 15 + 5;
        ctx.shadowBlur = glow;
        ctx.shadowColor = bgColor;
        
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, pu.width, pu.height);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, pu.width/2, pu.height/2);
        
        ctx.restore();
    });
}

function drawCars() {
    cars.forEach((car) => {
        if (car.hp > 0) {
            // İsim ve Can etiketi
            ctx.fillStyle = '#FFF';
            ctx.font = 'bold 12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(`${car.name} (${car.hp})`, car.x + 30, car.y - 25);

            // Power-up Taşıma İkonu (Arabayı üzerinde ufak bir belirteç)
            if (car.powerup) {
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(car.x + 30, car.y - 12, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            drawTopDownCar(ctx, car.x, car.y, car.color, car.team, car.hp);
            
            // Hareket izi / Egzoz dumanı
            if (Math.random() > 0.6) {
                particles.push({
                    x: car.x + (car.team === 1 ? -5 : 65), // Aracın arka kısmı
                    y: car.y + 15, // Aracın ortası
                    vx: car.team === 1 ? -Math.random() - 1 : Math.random() + 1,
                    vy: (Math.random() - 0.5),
                    life: 0.5,
                    color: '#888'
                });
            }

        } else if (car.hp <= 0) {
            // Ölü Araç Enkazı Çizimi
            drawTopDownCar(ctx, car.x, car.y, '#333', car.team, 0);
            
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 14px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(`YOK EDİLDİ`, car.x + 30, car.y - 20);
            
            // Ateş / Duman
            if(Math.random() > 0.4) {
                 particles.push({
                    x: car.x + Math.random() * 60,
                    y: car.y + Math.random() * 30,
                    vx: (Math.random() - 0.5),
                    vy: -Math.random() * 2,
                    life: 1.0,
                    color: Math.random() > 0.5 ? '#ff5500' : '#444'
                });
            }
        }
    });
}

function drawProjectiles() {
    flyingProjectiles.forEach(p => {
        ctx.save();
        
        if (p.type === 'missile') {
            ctx.fillStyle = '#ff0000';
            ctx.shadowColor = '#ff5555';
            ctx.shadowBlur = 15;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            
            // Füze ateşi dumanı
            particles.push({
                x: p.x + (p.team === 1 ? -10 : p.width + 10),
                y: p.y + p.height/2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 2,
                life: 0.8,
                color: '#ffaa00'
            });
        } else if (p.type === 'wallbreaker') {
            ctx.fillStyle = '#ff8800';
            ctx.shadowColor = '#ffff00';
            ctx.shadowBlur = 20;
            ctx.fillRect(p.x, p.y, p.width, p.height);
            
            // Yıkıcı güç dumanı
            particles.push({
                x: p.x + p.width/2,
                y: p.y + p.height/2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 0.5,
                color: '#ffff00'
            });
        } else {
            // Normal Lazer Mermi
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 10;
            ctx.fillRect(p.x, p.y, p.width, p.height);
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
        ctx.shadowBlur = 5;
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