const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "learnlm-1.5-pro-experimental",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseModalities: [],
  responseMimeType: "text/plain",
};

const chatSession = model.startChat({
  generationConfig,
});

module.exports = { chatSession };
