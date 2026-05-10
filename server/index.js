const express = require('express');
const path = require('path');

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../client')));
app.use('/public', express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/quiz.html'));
});

app.listen(PORT, () => {
  console.log(`DEOS Trivia Quiz sunucusu ${PORT} portunda başlatıldı!`);
});