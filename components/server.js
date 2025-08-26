const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 8080;

// Раздаём статику из корня репозитория
app.use(express.static(path.join(__dirname, '..')));

// Все остальные GET-запросы отправляют index.html из корня
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
