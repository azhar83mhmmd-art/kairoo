import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const BG_URL = "https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg";

function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number,
  maxLines = 6
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [""];

  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const test = line ? `${line} ${word}` : word;

    if (ctx.measureText(test).width <= maxWidth) {
      line = test;
      continue;
    }

    if (line) {
      lines.push(line);
      line = word;
    } else {
      // Satu kata terlalu panjang: potong berdasarkan karakter.
      let part = "";
      for (const char of word) {
        const testPart = part + char;
        if (ctx.measureText(testPart).width <= maxWidth) {
          part = testPart;
        } else {
          if (part) lines.push(part);
          part = char;
        }
      }
      line = part;
    }

    if (lines.length >= maxLines - 1) break;
  }

  if (line && lines.length < maxLines) lines.push(line);

  return lines.slice(0, maxLines);
}

function drawText(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  let fontSize = 110;
  let lines: string[] = [];

  while (fontSize >= 24) {
    ctx.font = `400 ${fontSize}px Arial, sans-serif`;
    lines = wrapText(ctx, text, width, 6);

    const lineHeight = Math.round(fontSize * 1.18);
    if (lines.length * lineHeight <= height) break;

    fontSize -= 4;
  }

  const lineHeight = Math.round(fontSize * 1.18);
  const totalHeight = lines.length * lineHeight;
  const startY = y + (height - totalHeight) / 2 + lineHeight / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.clip();

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `400 ${fontSize}px Arial, sans-serif`;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + width / 2, startY + i * lineHeight);
  }

  ctx.restore();
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      status: false,
      creator: "Danzz",
      message: "Method not allowed. Gunakan GET."
    });
  }

  const teks1 = String(req.query.teks1 ?? "").trim();
  const teks2 = String(req.query.teks2 ?? "").trim();

  if (!teks1 || !teks2) {
    return res.status(400).json({
      status: false,
      creator: "Danzz",
      message: "Parameter teks1 dan teks2 wajib diisi.",
      example: "/api/maker/drake?teks1=Halo&teks2=Kairoo"
    });
  }

  try {
    const bgResponse = await fetch(BG_URL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    if (!bgResponse.ok) {
      throw new Error(`Gagal mengambil gambar Drake (${bgResponse.status})`);
    }

    const bgBuffer = Buffer.from(await bgResponse.arrayBuffer());
    const bg = await loadImage(bgBuffer);

    const canvas = createCanvas(1200, 1200);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(bg, 0, 0, 1200, 1200);

    drawText(ctx, teks1, 615, 22, 571, 564);
    drawText(ctx, teks2, 615, 623, 571, 561);

    const png = await canvas.encode("png");

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", "inline; filename=\"drake.png\"");

    return res.status(200).send(png);
  } catch (error) {
    console.error("[DRake Maker]", error);

    return res.status(500).json({
      status: false,
      creator: "Danzz",
      message: "Gagal membuat gambar Drake.",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
