# DEOS RACING SIMULATOR - Deploy Talimatları

## 🚀 Render.com'a Deploy Etme

### 1. Render.com Hesabı Oluştur
1. [Render.com](https://render.com)'a git
2. Ücretsiz hesap oluştur (GitHub ile bağlanabilirsin)

### 2. GitHub'a Push Et
```bash
git init
git add .
git commit -m "DEOS Racing Simulator - Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/deos-racing-simulator.git
git push -u origin main
```

### 3. Render'da Web Service Oluştur
1. Render dashboard'a git
2. "New Web Service" tıkla
3. GitHub reposunu bağla
4. Aşağıdaki ayarları yap:

**Auto Deploy Settings:**
- **Name:** deos-racing-simulator
- **Environment:** Node
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Instance Type:** Free

**Environment Variables:**
```
NODE_ENV=production
PORT=3000
```

### 4. Deploy Et!
- "Create Web Service" tıkla
- 2-3 dakika içinde deploy tamamlanacak
- URL'yi al ve test et!

## 🔗 Alternatif: Manual Deploy

### GitHub ile Connect:
1. GitHub repo'sunu oluştur
2. Render'da "Connect Repository" seç
3. render.yaml dosyası otomatik configürasyonu yapar

## ✅ Deploy Sonrası Test

1. **URL:** `https://your-app-name.onrender.com`
2. **4 farklı tarayıcı sekmesi aç** 
3. **"YARIŞA KATIL" butonuna tıkla**
4. **4 oyuncu dolunca hazır ol**
5. **Tıkla ve yarış!**

## 📱 Mobil Test
- Telefonundan tarayıcı aç
- URL'yi aç
- TIKLA butonuna hızlıca tıkla!

## 🎮 Pro Features (Ücretli)
- Custom domain ekleme
- SSL sertifikası (otomatik)
- Daha hızlı sunucular
- Analytics

## 🔧 Sorun Giderme

### Socket.IO Bağlantı Hatası:
```javascript
// server/index.js'de CORS ayarlarını kontrol et
const io = socketIo(server, {
  cors: {
    origin: "*", // Güvenliğe göre sınırla
    methods: ["GET", "POST"]
  }
});
```

### WebSocket Connection Failed:
- Render'da WebSocket desteği vardır
- Free tier'da 1000 saat/ay limit vardır
- Uykuya geçme sorunu yaşarsan ping servisi ekle

## 🎯 Başarılı Deploy İçin İpuçları

1. **GitHub repo'su public yap** (ücretsiz için)
2. **package.json'ı kontrol et** - tüm dependencies listed
3. **Environment variables ekle** - PORT ve NODE_ENV
4. **Health check path** - "/" olarak ayarla
5. **Auto deploy enable** - GitHub push'larında otomatik güncelle

## 🏁 Sonuç
5 dakika içinde gerçek multiplayer yarış oyunun internette olacak!

**Hazır mısın? Şimdi deploy et ve arkadaşlarını davet et!** 🏎️💨