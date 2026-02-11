const express = require('express');
const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend Chatbot PPDB Aktif');
});

app.post('/webhook', (req, res) => {
  console.log(req.body);
  res.json({ reply: "Pesan diterima" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server berjalan');
});
