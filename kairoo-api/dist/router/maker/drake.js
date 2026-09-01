"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = drakeHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
/*
 * Bug sebelumnya: URL background 'https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg'
 * bukan URL gambar langsung (Imgflip menyajikan template di domain i.imgflip.com),
 * jadi selalu gagal diambil. Sudah diganti ke URL gambar aslinya.
 */
const BG_URL = 'https://i.imgflip.com/30b1gx.jpg';
async function drakeHandler(req, res) {
    const teks1 = String(req.query.teks1 ?? req.body?.teks1 ?? '').trim();
    const teks2 = String(req.query.teks2 ?? req.body?.teks2 ?? '').trim();
    if (!teks1 || !teks2) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'teks1' dan 'teks2' diperlukan."
        });
    }
    await (0, _canvas_1.ensureFont)();
    const width = 1200;
    const height = 1200;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    await (0, _canvas_1.loadBackground)(ctx, width, height, BG_URL);
    const zones = [
        [teks1, 615, 22, 571, 564],
        [teks2, 615, 623, 571, 561]
    ];
    for (const [text, x, y, w, h] of zones) {
        const f = (0, _canvas_1.fitFont)(ctx, text, w, h, 110, 20);
        ctx.font = `700 ${f.size}px ${_canvas_1.FONT_FAMILY}`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lh = f.size * 1.2;
        const sy = y + h / 2 - ((f.lines.length - 1) * lh) / 2;
        f.lines.forEach((line, i) => ctx.fillText(line, x + w / 2, sy + i * lh));
    }
    return (0, _canvas_1.sendPng)(res, canvas);
}
