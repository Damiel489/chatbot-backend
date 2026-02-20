require('dotenv').config();
const express = require('express');
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// ============================
// Dialogflow Config
// ============================
const projectId = process.env.PROJECT_ID;

const sessionClient = new dialogflow.SessionsClient({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
});

// ============================
// Supabase Config
// ============================
const supabase = createClient(
  process.env.https://rlnyofcslojmnfzlswhz.supabase.co,
  process.env.sb_publishable_gKVzzTO5sfloRoMYxVoZzw_6A7qxk8W
);

// ============================
// Detect Intent Function
// ============================
async function detectIntent(text, sessionId) {
  const sessionPath = sessionClient.projectAgentSessionPath(
    projectId,
    sessionId
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: text,
        languageCode: 'id'
      }
    }
  };

  const responses = await sessionClient.detectIntent(request);
  const result = responses[0].queryResult;

  return {
    reply: result.fulfillmentText,
    intent: result.intent.displayName,
    confidence: result.intentDetectionConfidence,
    parameters: result.parameters
  };
}

// ============================
// Test Route
// ============================
app.get('/', (req, res) => {
  res.send('Backend Chatbot PPDB Aktif');
});

// ============================
// Webhook Utama
// ============================
app.post('/webhook', async (req, res) => {
  try {

    // ======================
    // Ambil pesan user
    // ======================
    const userMessage = req.body.message;
    const sender = req.body.sender || uuid.v4();

    if (!userMessage) {
      return res.json({ reply: "Pesan kosong." });
    }

    // ======================
    // Kirim ke Dialogflow
    // ======================
    const df = await detectIntent(userMessage, sender);

    console.log({
      user: sender,
      message: userMessage,
      intent: df.intent,
      confidence: df.confidence,
      parameters: df.parameters
    });

    // ======================
    // 1. Simpan Log Chat
    // ======================
    await supabase.from('log_chat').insert([
      {
        nomor_wa: sender,
        pesan: userMessage,
        intent: df.intent,
        confidence: df.confidence
      }
    ]);

    // ======================
    // 2. Simpan Calon Siswa Berdasarkan Intent
    // ======================

    // Saat user menyatakan minat daftar
    if (df.intent === "daftar_minat") {
      await supabase.from('calon_siswa').upsert([
        {
          nomor_wa: sender,
          status: 'minat'
        }
      ], { onConflict: 'nomor_wa' });
    }

    // Saat user mengisi nama orang tua
    if (df.intent === "isi_nama_orang_tua") {
      await supabase.from('calon_siswa').upsert([
        {
          nomor_wa: sender,
          nama_orang_tua: df.parameters.nama,
          status: 'isi_data'
        }
      ], { onConflict: 'nomor_wa' });
    }

    // Saat user mengisi nama siswa
    if (df.intent === "isi_nama_siswa") {
      await supabase.from('calon_siswa').upsert([
        {
          nomor_wa: sender,
          nama_siswa: df.parameters.nama_siswa,
          status: 'isi_data'
        }
      ], { onConflict: 'nomor_wa' });
    }

    // Saat user memilih jenjang
    if (df.intent === "pilih_jenjang") {
      await supabase.from('calon_siswa').upsert([
        {
          nomor_wa: sender,
          jenjang: df.parameters.jenjang,
          status: 'isi_data'
        }
      ], { onConflict: 'nomor_wa' });
    }

    // ======================
    // 3. Kirim Balasan ke User
    // ======================
    res.json({
      reply: df.reply
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Terjadi kesalahan di server");
  }
});

// ============================
// Jalankan Server
// ============================
app.listen(process.env.PORT || 3000, () => {
  console.log('Server berjalan');
});