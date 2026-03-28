const express = require('express');
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== CONFIG =====
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ===== ROOT =====
app.get('/', (req, res) => {
  res.send('Chatbot backend aktif');
});

// ===== WEBHOOK =====
app.post('/webhook', async (req, res) => {
  try {
    console.log('Incoming:', req.body);

    const raw = (req.body.message || req.body.text || '').toString();
    const message = raw.toLowerCase().trim();
    const sender = req.body.sender;

    if (!message || !sender) {
      return res.sendStatus(200);
    }

    let response = '';
    let source = '';

    // ===== RULE CHECK =====
    const { data: triggers, error: errTrig } = await supabase
      .from('trigger')
      .select('*');

    if (errTrig) console.error('Trigger error:', errTrig);

    const found = triggers?.find(t =>
      message.includes((t.keyword || '').toLowerCase())
    );

    if (found) {
      const { data: responses, error: errResp } = await supabase
        .from('response')
        .select('*')
        .eq('intent_id', found.intent_id);

      if (errResp) console.error('Response error:', errResp);

      if (responses && responses.length > 0) {
        const i = Math.floor(Math.random() * responses.length);
        response = responses[i].text;
        source = 'rule';
      }
    }

    // ===== AI FALLBACK =====
    if (!response) {
      response = await getGeminiResponse(message);
      source = 'ai';
    }

    // ===== LOG =====
    await supabase.from('log_chat').insert([
      {
        user_message: message,
        bot_response: response,
        source
      }
    ]);

    // ===== SEND WA =====
    await sendFonnte(sender, response);

    return res.sendStatus(200);

  } catch (err) {
    console.error('Webhook error:', err);
    return res.sendStatus(500);
  }
});

// ===== SEND FONNTE =====
async function sendFonnte(target, message) {
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': FONNTE_TOKEN
      },
      body: new URLSearchParams({
        target,
        message
      })
    });
  } catch (err) {
    console.error('Fonnte error:', err);
  }
}

// ===== GEMINI =====
async function getGeminiResponse(userMessage) {
  try {
    const prompt = `
Kamu adalah chatbot PPDB sekolah.
Jawab singkat, jelas, dan relevan:
"${userMessage}"
`;

    const result = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await result.json();

    return data?.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Maaf, saya belum bisa menjawab itu.';

  } catch (err) {
    console.error('Gemini error:', err);
    return 'Terjadi kesalahan pada sistem.';
  }
}

// ===== START =====
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});