"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = twoButtonsHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
const BG_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/Two-Buttons.jpg';
async function twoButtonsHandler(req, res) {
    const teks1 = String(req.query.teks1 ?? req.body?.teks1 ?? '').trim();
    const teks2 = String(req.query.teks2 ?? req.body?.teks2 ?? '').trim();
    const teks3 = String(req.query.teks3 ?? req.body?.teks3 ?? '').trim();
    if (!teks1 || !teks2 || !teks3) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'teks1', 'teks2', dan 'teks3' diperlukan."
        });
    }
    await (0, _canvas_1.ensureFont)();
    const width = 600;
    const height = 908;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    await (0, _canvas_1.loadBackground)(ctx, width, height, BG_URL);
    // [text, x, y, w, h, ukuran awal font, pakai outline putih (teks besar bawah)]
    const zones = [
        [teks1, 69, 108, 168, 54, 60, false],
        [teks2, 275, 76, 146, 43, 50, false],
        [teks3, 28, 796, 542, 66, 60, true]
    ];
    for (const [text, x, y, w, h, start, outline] of zones) {
        const f = (0, _canvas_1.fitFont)(ctx, text, w, h, start, 14);
        ctx.font = `700 ${f.size}px ${_canvas_1.FONT_FAMILY}`;
        ctx.fillStyle = outline ? '#ffffff' : '#111111';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        f.lines.forEach((line, i) => {
            const ly = y + h / 2 + (i - (f.lines.length - 1) / 2) * f.size * 1.1;
            if (outline) {
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 6;
                ctx.strokeText(line, x + w / 2, ly);
            }
            ctx.fillText(line, x + w / 2, ly);
        });
    }
    return (0, _canvas_1.sendPng)(res, canvas);
}
