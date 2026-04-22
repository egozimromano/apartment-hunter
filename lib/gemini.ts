// Google Gemini REST client
// Free tier: https://aistudio.google.com/app/apikey

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
// Try models in order — fall back if one is overloaded
const MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"];

async function tryModel(model: string, body: any, key: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${API_BASE}/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 429 || res.status === 503) {
      // Wait and retry same model once
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      return null; // Let caller try next model
    }

    if (!res.ok) {
      const err = await res.text();
      console.error(`Gemini ${model} error ${res.status}: ${err}`);
      return null;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) return text;
    return null;
  }
  return null;
}

export async function gemini(prompt: string, systemPrompt?: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 8192, responseMimeType: "application/json" },
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  for (const model of MODELS) {
    const result = await tryModel(model, body, key);
    if (result) {
      console.log(`Gemini succeeded with model: ${model}`);
      return result;
    }
    console.log(`Gemini ${model} unavailable, trying next...`);
  }

  throw new Error("All Gemini models unavailable. Try again in a few minutes.");
}

export async function geminiJSON<T = any>(prompt: string, systemPrompt?: string): Promise<T> {
  const raw = await gemini(prompt, systemPrompt);
  let clean = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(clean);
}
