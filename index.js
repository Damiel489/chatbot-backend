const express = require("express");
const dialogflow = require("@google-cloud/dialogflow");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Ambil credentials dari environment variable
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

const sessionClient = new dialogflow.SessionsClient({
  credentials: credentials,
});

app.get("/", (req, res) => {
  res.send("Backend Chatbot PPDB Aktif");
});

app.post("/webhook", async (req, res) => {
  try {
    const { sender, message } = req.body;

    const sessionId = sender || uuidv4();
    const sessionPath = sessionClient.projectAgentSessionPath(
      process.env.PROJECT_ID,
      sessionId
    );

    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: "id",
        },
      },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;

    res.json({
      reply: result.fulfillmentText,
      intent: result.intent.displayName,
      confidence: result.intentDetectionConfidence,
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Terjadi kesalahan pada server" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Server berjalan");
});
