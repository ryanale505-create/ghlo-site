import express from "express";

const app = express();

app.use(express.json({ limit: "30kb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "اكتب رسالة أولًا." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "مفتاح GEMINI_API_KEY غير مضاف في Render." });
    }

    // تحويل سجل المحادثة لتنسيق Gemini
    const safeHistory = Array.isArray(history)
      ? history
          .filter(item => ["user", "assistant"].includes(item.role) && typeof item.content === "string")
          .slice(-20)
          .map(item => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.content.slice(0, 2000) }]
          }))
      : [];

    const systemPrompt = `
أنت رفيق محادثة ذكي في موقع نادي معجبين غلو.
تحدث باللهجة السعودية الطبيعية وبأسلوب عفوي وودود.
امدح غلو بعبارات جميلة ومبتكرة، وسولف عن إعجاب المستخدم بها.
تفاعل مع كلامه بشكل طبيعي، وامزح معه بلطف إذا كان السياق مناسبًا.
لا تكرر نفس الجملة في كل رد.
اسأل أسئلة مناسبة عند الحاجة، ولا تجعل كل رد سؤالًا.
إذا غيّر المستخدم الموضوع، تجاوب معه بشكل طبيعي.
لا تدّع أنك غلو الحقيقية.
اجعل ردودك مختصرة وممتعة، إلا إذا طلب المستخدم التفصيل.
`;

    const contents = [
      ...safeHistory,
      { role: "user", parts: [{ text: message.trim().slice(0, 2000) }] }
    ];

    // طلب الاتصال المباشر بنموذج Gemini 1.5 Flash المجاني والسريع
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt.trim() }]
        },
        contents: contents
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(500).json({ error: "خطأ في الاتصال بـ Gemini" });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "لم يتم استلام رد.";

    res.json({ reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: "صار خطأ أثناء توليد الرد." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
