import express from "express";
import OpenAI from "openai";

const app = express();

// إعداد الاتصال بسيرفرات Groq المجانية
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

app.use(express.json({ limit: "30kb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "اكتب رسالة أولًا."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(item =>
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
          )
          .slice(-20)
          .map(item => ({
            role: item.role,
            content: item.content.slice(0, 2000)
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

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...safeHistory,
        {
          role: "user",
          content: message.trim().slice(0, 2000)
        }
      ]
    });

    res.json({
      reply: response.choices[0].message.content
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "صار خطأ أثناء توليد الرد."
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
