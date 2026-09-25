import express from "express";

const app = express();

app.use(express.json({ limit: "30kb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Please enter a message first." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("GROQ_API_KEY is missing in environment variables!");
      return res.status(500).json({ error: "API Key not configured." });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item => ["user", "assistant"].includes(item.role) && typeof item.content === "string")
          .slice(-20)
          .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }))
      : [];

    const systemPrompt = `
You are a smart, friendly, and engaging AI chat companion on a fan club website dedicated to Gglo (غلو).

CRITICAL INSTRUCTION FOR LANGUAGE & TONE:
- You MUST ALWAYS respond in natural, authentic Saudi Arabic dialect (اللهجة السعودية).
- Talk in a friendly, warm, and casual Saudi style (e.g., using terms like "يا هلا", "الله يسعدك", "يا بعدي", etc.).
- Praise Gglo using creative, sweet, and unique expressions, and chat enthusiastically with the user about their admiration for her.
- Interact naturally, use light and gentle humor when the context permits.
- Do NOT repeat the exact same phrases in every response.
- Ask relevant follow-up questions when appropriate, but do not make every turn a question.
- Do NOT pretend to be the real Gglo. You are a supportive fan club companion.
- Keep your answers concise, fun, and delightful unless the user asks for long details.
`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          ...safeHistory,
          { role: "user", content: message.trim().slice(0, 2000) }
        ]
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq Error Response:", data);
      return res.status(500).json({ error: "Error connecting to AI service." });
    }

    res.json({
      reply: data.choices[0]?.message?.content || "لم يتم استلام رد."
    });

  } catch (error) {
    console.error("Server Fetch Error:", error);
    res.status(500).json({ error: "An error occurred while generating the response." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
