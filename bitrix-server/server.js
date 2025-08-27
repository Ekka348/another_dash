const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

let lastPayload = null;

app.post('/bitrix-webhook', (req, res) => {
  lastPayload = req.body;
  console.log('Webhook received:', lastPayload);
  res.sendStatus(200);
});

app.get('/data', (req, res) => {
  res.json(lastPayload || { status: 'waiting for Bitrix webhook' });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
