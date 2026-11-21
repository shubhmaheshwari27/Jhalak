import { SPEC_PROMPT, promptApproachA, promptApproachB } from "./prompts";

export type Img = { buffer: Buffer; mime: string };
export type Provider = "openai" | "gemini";
export type Approach = "A" | "B";

const env = (k: string, fallback?: string) => {
  const v = process.env[k] || fallback;
  if (!v) throw new Error(`${k} is not set`);
  return v;
};

const toDataUrl = (img: Img) => `data:${img.mime};base64,${img.buffer.toString("base64")}`;

function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model did not return JSON: " + text.slice(0, 200));
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function readError(res: Response, who: string): Promise<never> {
  const body = await res.text();
  let msg = body;
  try {
    const j = JSON.parse(body);
    msg = j?.error?.message ?? body;
  } catch {}
  throw new Error(`${who} ${res.status}: ${msg.slice(0, 500)}`);
}

/* ---------------- Step A: describe the saree ---------------- */

export async function describeSaree(saree: Img): Promise<unknown> {
  const provider = (process.env.SPEC_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "gemini")) as Provider;
  return provider === "gemini" ? describeWithGemini(saree) : describeWithOpenAI(saree);
}

async function describeWithOpenAI(saree: Img) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env("OPENAI_TEXT_MODEL", "gpt-5.6"),
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: SPEC_PROMPT },
            { type: "input_image", image_url: toDataUrl(saree), detail: "high" },
          ],
        },
      ],
    }),
  });
  if (!res.ok) await readError(res, "OpenAI");
  const data = await res.json();
  let text: string = data.output_text ?? "";
  if (!text) {
    for (const item of data.output ?? []) {
      for (const c of item.content ?? []) if (c.type === "output_text") text += c.text;
    }
  }
  return extractJson(text);
}

async function describeWithGemini(saree: Img) {
  const model = env("GEMINI_TEXT_MODEL", "gemini-3.5-flash");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: SPEC_PROMPT },
              { inline_data: { mime_type: saree.mime, data: saree.buffer.toString("base64") } },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) await readError(res, "Gemini");
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  return extractJson(text);
}

/* ---------------- Step B: generate the try-on ---------------- */

export async function generateTryOn(opts: {
  provider: Provider;
  approach: Approach;
  person: Img;
  saree: Img;
  spec: unknown;
}): Promise<Img> {
  const { provider, approach, person, saree, spec } = opts;
  if (approach === "A" && !spec) throw new Error("This saree has no AI description yet (needed for Approach A)");
  const prompt = approach === "A" ? promptApproachA(spec) : promptApproachB();
  const images = approach === "A" ? [person] : [person, saree];
  return provider === "openai" ? openaiImage(prompt, images) : geminiImage(prompt, images);
}

async function openaiImage(prompt: string, images: Img[]): Promise<Img> {
  const form = new FormData();
  form.append("model", env("OPENAI_IMAGE_MODEL", "gpt-image-2.5-sunburst"));
  form.append("prompt", prompt);
  form.append("size", "1024x1536");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "medium");
  images.forEach((img, i) => {
    const ext = img.mime.includes("png") ? "png" : img.mime.includes("webp") ? "webp" : "jpg";
    form.append("image[]", new Blob([new Uint8Array(img.buffer)], { type: img.mime }), `image${i + 1}.${ext}`);
  });
  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("OPENAI_API_KEY")}` },
    body: form,
  });
  if (!res.ok) await readError(res, "OpenAI");
  const data = await res.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image");
  return { buffer: Buffer.from(b64, "base64"), mime: "image/png" };
}

async function geminiImage(prompt: string, images: Img[]): Promise<Img> {
  const model = env("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");
  const parts: unknown[] = [{ text: prompt }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: img.mime, data: img.buffer.toString("base64") } });
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "2:3" },
        },
      }),
    }
  );
  if (!res.ok) await readError(res, "Gemini");
  const data = await res.json();
  const outParts = data.candidates?.[0]?.content?.parts ?? [];
  for (const p of outParts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      return {
        buffer: Buffer.from(inline.data, "base64"),
        mime: inline.mimeType ?? inline.mime_type ?? "image/png",
      };
    }
  }
  const text = outParts.map((p: { text?: string }) => p.text ?? "").join(" ").trim();
  const reason = data.candidates?.[0]?.finishReason ?? data.promptFeedback?.blockReason;
  throw new Error(`Gemini returned no image${reason ? ` (${reason})` : ""}${text ? ": " + text.slice(0, 300) : ""}`);
}
