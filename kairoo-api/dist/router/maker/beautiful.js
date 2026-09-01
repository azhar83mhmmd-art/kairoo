"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = beautifulHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
const BG_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/2image.jpeg';
function drawCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale;
    const sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}
async function beautifulHandler(req, res) {
    const image1 = String(req.query.image1 ?? req.body?.image1 ?? '').trim();
    const image2 = String(req.query.image2 ?? req.body?.image2 ?? '').trim();
    if (!image1 || !image2) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'image1' dan 'image2' diperlukan."
        });
    }
    if (!/^https?:\/\//i.test(image1) || !/^https?:\/\//i.test(image2)) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'image1' dan 'image2' harus berupa URL http/https."
        });
    }
    const width = 1217;
    const height = 1280;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext('2d');
    await (0, _canvas_1.loadBackground)(ctx, width, height, BG_URL);
    let img1;
    let img2;
    try {
        img1 = await (0, _canvas_1.remoteImage)(image1);
    }
    catch {
        return res.status(400).json({ status: false, message: 'Gagal memuat gambar dari image1.' });
    }
    try {
        img2 = await (0, _canvas_1.remoteImage)(image2);
    }
    catch {
        return res.status(400).json({ status: false, message: 'Gagal memuat gambar dari image2.' });
    }
    drawCover(ctx, img1, 833, 61, 305, 344);
    drawCover(ctx, img2, 841, 719, 299, 348);
    return (0, _canvas_1.sendPng)(res, canvas);
}
