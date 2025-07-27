const express = require('express');
const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Minimal test server working' });
});

app.listen(PORT, () => {
  console.log(`Minimal test server running on port ${PORT}`);
});