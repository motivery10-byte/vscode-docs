import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Conexão Firebase
import serviceAccount from "./firebaseConfig.js";
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ⚙️ Rotas básicas
app.get("/", (req, res) => {
  res.send("⚡ Crypto Thor v2.1 is online!");
});

// 🚀 Rota de análise IA
app.post("/analyze", async (req, res) => {
  const { symbol } = req.body;
  try {
    // 1️⃣ Puxar dados da Binance
    const response = await axios.get(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=50`
    );
    const candles = response.data.map(c => ({
      open: c[1],
      high: c[2],
      low: c[3],
      close: c[4],
    }));

    // 2️⃣ Enviar para Gemini IA
    const geminiResponse = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent",
      {
        contents: [
          {
            parts: [
              {
                text: `Analyze these crypto candles for ${symbol}: ${JSON.stringify(
                  candles
                )}. Give a short summary of the trend and potential next move.`,
              },
            ],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    const aiText =
      geminiResponse.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No analysis available.";

    // 3️⃣ Salvar no Firebase
    await db.collection("analyses").add({
      symbol,
      analysis: aiText,
      date: new Date().toISOString(),
    });

    res.json({ symbol, analysis: aiText });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// 🧭 Inicializa servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`⚡ Server running on port ${PORT}`));
