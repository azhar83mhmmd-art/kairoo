"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = bratHandler;
const axios_1 = __importDefault(require("axios"));
async function bratHandler(req, res) {
    const text = String(req.query.text || req.body.text || '').trim();
    if (!text) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'text' diperlukan."
        });
    }
    const url = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(text)}`;
    const response = await axios_1.default.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            Referer: 'https://brat.siputzx.my.id/',
            Connection: 'keep-alive'
        }
    });
    res.set('Content-Type', 'image/png');
    return res.send(response.data);
}
