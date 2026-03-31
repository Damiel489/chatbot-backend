const { GoogleGenerativeAI } = require("@google/generative-ai")

// 🔥 MASUKKAN API KEY DI SINI
const genAI = new GoogleGenerativeAI("AIzaSyB0QCmNIaNHYql_IDKvIeAItNH5tTuEklE")

async function parseText(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const result = await model.generateContent(text)
  const response = await result.response
  return response.text()
}

module.exports = { parseText }