"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = jarvisHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
const BG_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/jarvismeme.png';
async function jarvisHandler(req, res) {
    const text = String(req.query.text ?? req.body?.text ?? '').trim();
    if (!text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' diperlukan."
        });
    }
    await (0, _canvas_1.ensureFont)();
    const width = 735;
    const height = 678;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    await (0, _canvas_1.loadBackground)(ctx, width, height, BG_URL);
    const f = (0, _canvas_1.fitFont)(ctx, text, 695, 237, 100, 18);
    ctx.font = `700 ${f.size}px ${_canvas_1.FONT_FAMILY}`;
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = f.size * 1.2;
    const sy = 3 + 237 / 2 - ((f.lines.length - 1) * lh) / 2;
    f.lines.forEach((line, i) => ctx.fillText(line, 367.5, sy + i * lh));
    return (0, _canvas_1.sendPng)(res, canvas);
}
