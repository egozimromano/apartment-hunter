// Google Gemini REST client
// Free tier: https://aistudio.google.com/app/apikey

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = "gemini-2.5-flash";

export async function gemini(prompt: string, systemPrompt?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048, responseMimeType: "application/json" },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  // Retry up to 3 times with exponential backoff on 429/503
  let lastErr: any;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/${MODEL}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 429 || res.status === 503) {
        const err = await res.text();
        lastErr = new Error(`Gemini error ${res.status}: ${err}`);
        // Wait 2^attempt seconds (1s, 2s, 4s)
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error ${res.status}: ${err}`);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty Gemini response");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt === 2) break;
    }
  }
  throw lastErr;
}

export async function geminiJSON<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
  const raw = await gemini(prompt, systemPrompt);
  let clean = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}
