const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Раздаем статические файлы (JS, CSS, изображения)
app.use(express.static(path.join(__dirname)));

// Обрабатываем все GET-запросы, отправляя index.html
// Это необходимо для работы SPA-роутинга
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
