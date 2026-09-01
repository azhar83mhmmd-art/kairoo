"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawTextWithEmojis = drawTextWithEmojis;
exports.measureTextWithEmojis = measureTextWithEmojis;
exports.wrapTextWithEmojis = wrapTextWithEmojis;
const axios_1 = __importDefault(require("axios"));
const canvas_1 = require("@napi-rs/canvas");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
/*
 * Helper bersama untuk menggambar emoji bergaya Apple di atas canvas
 * (dipakai oleh endpoint yang meniru tampilan chat WhatsApp/Instagram).
 * Peta emoji (JSON berisi PNG base64 per-emoji) di-cache di os.tmpdir()
 * supaya kompatibel dengan lingkungan serverless (read-only fs kecuali
 * /tmp).
 */
const EMOJI_JSON_URL = 'https://media.githubusercontent.com/media/Ditzzx-vibecoder/entahlah/main/emoji-apple.json';
const EMOJI_DIR = path_1.default.join(os_1.default.tmpdir(), 'kairoo-emoji');
const EMOJI_JSON_PATH = path_1.default.join(EMOJI_DIR, 'emoji-apple.json');
const EMOJI_REGEX = /(\p{Emoji_Modifier_Base}\p{Emoji_Modifier}|\p{Emoji_Presentation}\uFE0F?|\p{Emoji}\uFE0F|[\u{1F1E0}-\u{1F1FF}]{2}|\p{Extended_Pictographic}\uFE0F?)/gu;
let emojiMap = null;
const emojiImageCache = new Map();
function emojiToUnicode(emoji) {
    return [...emoji]
        .map((c) => c.codePointAt(0).toString(16).padStart(4, '0'))
        .join('-');
}
async function loadEmojiMap() {
    if (emojiMap)
        return emojiMap;
    if (!fs_1.default.existsSync(EMOJI_JSON_PATH) || fs_1.default.statSync(EMOJI_JSON_PATH).size === 0) {
        fs_1.default.mkdirSync(EMOJI_DIR, { recursive: true });
        const response = await axios_1.default.get(EMOJI_JSON_URL, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        fs_1.default.writeFileSync(EMOJI_JSON_PATH, Buffer.from(response.data));
    }
    emojiMap = JSON.parse(fs_1.default.readFileSync(EMOJI_JSON_PATH, 'utf-8'));
    return emojiMap;
}
async function getEmojiImage(emoji) {
    if (emojiImageCache.has(emoji))
        return emojiImageCache.get(emoji);
    try {
        const map = await loadEmojiMap();
        const base = emojiToUnicode(emoji);
        const variants = [
            base,
            base.replace(/-fe0f/gi, ''),
            `${base.replace(/-fe0f/gi, '')}-fe0f`,
            base.toUpperCase(),
            base.replace(/-fe0f/gi, '').toUpperCase(),
            `${base.replace(/-fe0f/gi, '').toUpperCase()}-FE0F`
        ];
        let b64 = null;
        for (const v of variants) {
            if (map[v]) {
                b64 = map[v];
                break;
            }
        }
        if (!b64) {
            emojiImageCache.set(emoji, null);
            return null;
        }
        const img = await (0, canvas_1.loadImage)(Buffer.from(b64, 'base64'));
        emojiImageCache.set(emoji, img);
        return img;
    }
    catch {
        // Peta emoji gagal diambil (mis. offline) — fallback ke ctx.fillText biasa,
        // jangan sampai membuat seluruh endpoint gagal.
        emojiImageCache.set(emoji, null);
        return null;
    }
}
/*
 * PENTING: panggil dengan ctx.textBaseline = 'middle' supaya posisi
 * vertikal emoji (gambar) sejajar dengan teks di sekitarnya.
 */
async function drawTextWithEmojis(ctx, text, x, y, fontSize) {
    const parts = text.split(EMOJI_REGEX);
    let currentX = x;
    for (const part of parts) {
        if (!part)
            continue;
        EMOJI_REGEX.lastIndex = 0;
        if (EMOJI_REGEX.test(part)) {
            const size = fontSize * 1.05;
            const img = await getEmojiImage(part);
            if (img) {
                ctx.drawImage(img, currentX, y - size / 2, size, size);
                currentX += size;
            }
            else {
                ctx.fillText(part, currentX, y);
                currentX += ctx.measureText(part).width;
            }
        }
        else {
            ctx.fillText(part, currentX, y);
            currentX += ctx.measureText(part).width;
        }
        EMOJI_REGEX.lastIndex = 0;
    }
}
async function measureTextWithEmojis(ctx, text, fontSize) {
    const parts = text.split(EMOJI_REGEX);
    let width = 0;
    for (const part of parts) {
        if (!part)
            continue;
        EMOJI_REGEX.lastIndex = 0;
        if (EMOJI_REGEX.test(part)) {
            width += fontSize * 1.05;
        }
        else {
            width += ctx.measureText(part).width;
        }
        EMOJI_REGEX.lastIndex = 0;
    }
    return width;
}
async function wrapTextWithEmojis(ctx, text, maxWidth, fontSize) {
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const w = await measureTextWithEmojis(ctx, test, fontSize);
        if (w > maxWidth && current) {
            lines.push(current);
            current = word;
        }
        else {
            current = test;
        }
    }
    if (current)
        lines.push(current);
    return lines;
}
