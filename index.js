require('dotenv').config();
const express = require('express');
const dialogflow = require('@google-cloud/dialogflow');
const uuid = require('uuid');

const app = express();
app.use(express.json());

const projectId = process.env.PROJECT_ID;

const sessionClient = new dialogflow.SessionsClient({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS)
});

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
    confidence: result.intentDetectionConfidence
  };
}

app.get('/', (req, res) => {
  res.send('Backend Chatbot PPDB Aktif');
});

app.post('/webhook', async (req, res) => {
  try {
    const userMessage = req.body.message;
    const sender = req.body.sender || uuid.v4();

    const df = await detectIntent(userMessage, sender);

    console.log({
      user: sender,
      message: userMessage,
      intent: df.intent,
      confidence: df.confidence
    });

    res.json({
      reply: df.reply
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Server berjalan');
});
