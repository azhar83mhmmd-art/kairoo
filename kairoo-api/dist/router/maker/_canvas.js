"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FONT_FAMILY = void 0;
exports.ensureRemoteFile = ensureRemoteFile;
exports.ensureRemoteFont = ensureRemoteFont;
exports.ensureFont = ensureFont;
exports.remoteImage = remoteImage;
exports.drawFallbackBg = drawFallbackBg;
exports.loadBackground = loadBackground;
exports.sendPng = sendPng;
exports.wrap = wrap;
exports.fitFont = fitFont;
const canvas_1 = require("@napi-rs/canvas");
const axios_1 = __importDefault(require("axios"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
/*
 * Cache generik untuk asset (font/gambar) dari URL pihak ketiga, dipakai
 * oleh endpoint maker yang butuh font/background sendiri (qcwa, igqc,
 * kalender, dst). Sama-sama disimpan di os.tmpdir() supaya aman di
 * lingkungan serverless (read-only kecuali /tmp).
 */
const REMOTE_ASSET_DIR = path_1.default.join(os_1.default.tmpdir(), 'kairoo-assets');
async function ensureRemoteFile(url, filename) {
    const dest = path_1.default.join(REMOTE_ASSET_DIR, filename);
    if (fs_1.default.existsSync(dest) && fs_1.default.statSync(dest).size > 0)
        return dest;
    fs_1.default.mkdirSync(REMOTE_ASSET_DIR, { recursive: true });
    const response = await axios_1.default.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    fs_1.default.writeFileSync(dest, Buffer.from(response.data));
    return dest;
}
const registeredRemoteFonts = new Set();
async function ensureRemoteFont(url, family, filename) {
    if (registeredRemoteFonts.has(family))
        return;
    if (canvas_1.GlobalFonts.families.some((f) => f.family === family)) {
        registeredRemoteFonts.add(family);
        return;
    }
    const file = await ensureRemoteFile(url, filename);
    canvas_1.GlobalFonts.registerFromPath(file, family);
    registeredRemoteFonts.add(family);
}
/*
 * Helper bersama untuk semua endpoint maker berbasis canvas.
 *
 * PENTING: @napi-rs/canvas TIDAK punya font "Arial" bawaan seperti
 * browser. Font apa pun yang dipakai lewat ctx.font harus di-register
 * lebih dulu lewat GlobalFonts.registerFromPath(), kalau tidak teks
 * gagal digambar. ensureFont() di bawah menangani ini sekali saja
 * (di-cache di os.tmpdir() supaya kompatibel dengan lingkungan
 * serverless yang filesystem-nya read-only kecuali /tmp).
 */
const FONT_URL = 'https://raw.githubusercontent.com/Ditzzx-vibecoder/Assets/main/Font/ARIALN.ttf';
const FONT_DIR = path_1.default.join(os_1.default.tmpdir(), 'kairoo-canvas-fonts');
const FONT_PATH = path_1.default.join(FONT_DIR, 'ARIALN.ttf');
exports.FONT_FAMILY = 'KairooSans';
let fontReady = null;
function ensureFont() {
    if (fontReady)
        return fontReady;
    fontReady = (async () => {
        if (canvas_1.GlobalFonts.families.some((f) => f.family === exports.FONT_FAMILY))
            return;
        if (!fs_1.default.existsSync(FONT_PATH) || fs_1.default.statSync(FONT_PATH).size === 0) {
            fs_1.default.mkdirSync(FONT_DIR, { recursive: true });
            const response = await axios_1.default.get(FONT_URL, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            fs_1.default.writeFileSync(FONT_PATH, Buffer.from(response.data));
        }
        canvas_1.GlobalFonts.registerFromPath(FONT_PATH, exports.FONT_FAMILY);
    })();
    return fontReady;
}
async function remoteImage(url) {
    const response = await axios_1.default.get(url, {
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return (0, canvas_1.loadImage)(Buffer.from(response.data));
}
/*
 * Background polos sebagai fallback saat asset dari pihak ketiga
 * gagal diambil (404, timeout, host down, dsb) — supaya endpoint
 * tetap mengembalikan gambar, bukan error 500.
 */
function drawFallbackBg(ctx, w, h) {
    ctx.fillStyle = '#1c1c1e';
    ctx.fillRect(0, 0, w, h);
}
async function loadBackground(ctx, w, h, url) {
    try {
        const img = await remoteImage(url);
        ctx.drawImage(img, 0, 0, w, h);
        return true;
    }
    catch {
        drawFallbackBg(ctx, w, h);
        return false;
    }
}
function sendPng(res, canvas) {
    res.set('Content-Type', 'image/png');
    return res.send(canvas.toBuffer('image/png'));
}
function wrap(ctx, text, maxWidth, font) {
    ctx.font = font;
    const lines = [];
    for (const para of text.split('\n')) {
        let line = '';
        for (const word of para.split(/\s+/)) {
            const test = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(test).width > maxWidth) {
                lines.push(line);
                line = word;
            }
            else {
                line = test;
            }
        }
        if (line)
            lines.push(line);
    }
    return lines.length ? lines : [''];
}
function fitFont(ctx, text, maxWidth, maxHeight, start = 80, min = 18, family = exports.FONT_FAMILY) {
    let size = start;
    while (size > min) {
        const lines = wrap(ctx, text, maxWidth, `700 ${size}px ${family}`);
        if (lines.length * size * 1.2 <= maxHeight)
            return { size, lines };
        size -= 2;
    }
    return { size: min, lines: wrap(ctx, text, maxWidth, `700 ${min}px ${family}`) };
}
