"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = timpaHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
const BG_URL = 'https://raw.githubusercontent.com/ryyntwx/allimagerin/refs/heads/main/IMG-20260710-WA1772.jpg';
async function timpaHandler(req, res) {
    const username = String(req.query.username ?? req.body?.username ?? '').trim();
    const text = String(req.query.text ?? req.body?.text ?? '').trim();
    if (!username || !text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'username' dan 'text' diperlukan."
        });
    }
    await (0, _canvas_1.ensureFont)();
    const width = 735;
    const height = 735;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    await (0, _canvas_1.loadBackground)(ctx, width, height, BG_URL);
    const f = (0, _canvas_1.fitFont)(ctx, text, 520, 170, 36, 12);
    ctx.fillStyle = '#262626';
    ctx.font = `700 ${f.size}px ${_canvas_1.FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lh = f.size * 1.2;
    f.lines.forEach((line, i) => ctx.fillText(line, 430, 365 - ((f.lines.length - 1) * lh) / 2 + i * lh));
    ctx.font = `700 22px ${_canvas_1.FONT_FAMILY}`;
    ctx.fillText(`~ ${username.replace(/^~\s*/, '')}`, 430, 600);
    return (0, _canvas_1.sendPng)(res, canvas);
}
