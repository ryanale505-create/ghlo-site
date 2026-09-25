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
      console.error("GROQ_API_KEY is missing!");
      return res.status(500).json({ error: "API Key missing." });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item => ["user", "assistant"].includes(item.role) && typeof item.content === "string")
          .slice(-20)
          .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }))
      : [];

    const systemPrompt = `You are a smart, friendly AI chat companion on a fan club website dedicated to Gglo (غلو).
- Always respond in natural Saudi Arabic dialect.
- Be warm, friendly, and brief.
- Express fan support for Gglo.`;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...safeHistory,
          { role: "user", content: message.trim().slice(0, 2000) }
        ]
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq Error:", data);
      return res.status(500).json({ error: "Groq API error" });
    }

    const reply = data.choices?.[0]?.message?.content || "لم يتم استلام رد.";
    res.json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.json({ reply: "حدث خطأ في الاتصال، حاول مجدداً." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
