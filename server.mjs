import express from "express";

const app = express();

app.use(express.json({ limit: "30kb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "اكتب رسالة أولًا." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error("❌ خطأ: لم يتم إيجاد GROQ_API_KEY في متغيرات البيئة بـ Render!");
      return res.status(500).json({ error: "مفتاح API غير معرف في Render." });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item => ["user", "assistant"].includes(item.role) && typeof item.content === "string")
          .slice(-20)
          .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }))
      : [];

    const systemPrompt = `
You are a smart, friendly, and engaging AI chat companion on a fan club website dedicated to Gglo (غلو).
- You MUST ALWAYS respond in natural, authentic Saudi Arabic dialect (اللهجة السعودية).
- Talk in a friendly, warm, and casual Saudi style.
- Praise Gglo using creative and sweet expressions.
- Keep answers concise and fun.
`;

    console.log("جارٍ إرسال الطلب إلى Groq...");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt.trim() },
          ...safeHistory,
          { role: "user", content: message.trim().slice(0, 2000) }
        ]
      })
    });

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("❌ خطأ من Groq:", JSON.stringify(data));
      const detail = data.error?.message || "خطأ غير معروف";
      return res.status(500).json({ error: `Groq: ${detail}` });
    }

    const reply = data.choices?.[0]?.message?.content || "لم يتم استلام رد.";
    console.log("✅ تم استلام الرد بنجاح!");

    res.json({ reply });

  } catch (error) {
    console.error("❌ خطأ في السيرفر:", error);
    res.status(500).json({ error: `Server Error: ${error.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log("فحص المفتاح عند التشغيل:", process.env.GROQ_API_KEY ? "المفتاح متوفر ✅" : "المفتاح مفقود ❌");
});
