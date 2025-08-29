const express = require('express');
const path = require('path');
const app = express();

// Правильно получаем порт из переменных окружения Railway
const port = process.env.PORT || 8080; // ← 8080 вместо 3000

// Правильно обслуживаем статические файлы с MIME types
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Bitrix24 Dashboard is running',
    port: port,
    timestamp: new Date().toISOString()
  });
});

// Handle all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server на правильном порту
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`📍 Health check: http://localhost:${port}/health`);
  console.log(`📍 Main app: http://localhost:${port}`);
});
