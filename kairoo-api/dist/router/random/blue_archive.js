"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = blueArchiveHandler;
const axios_1 = __importDefault(require("axios"));
const gistURL = 'https://gist.githubusercontent.com/siputzx/e985e0566c0529df3a2289fd64047d21/raw/1568d9d26ee25dbe82fb0bdf51b5c88727e3f602/bluearchive.json';
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
async function blueArchiveHandler(req, res) {
    try {
        const { data: images } = await axios_1.default.get(gistURL, {
            headers: {
                'User-Agent': userAgent
            }
        });
        if (!Array.isArray(images) || images.length === 0) {
            throw new Error('Tidak ada URL gambar yang ditemukan di dalam database.');
        }
        const randomURL = images[Math.floor(Math.random() * images.length)];
        if (typeof randomURL !== 'string' ||
            !/^https?:\/\//i.test(randomURL)) {
            throw new Error('URL gambar tidak valid.');
        }
        const response = await axios_1.default.get(randomURL, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': userAgent
            }
        });
        const buffer = Buffer.from(response.data);
        if (!buffer.length) {
            throw new Error('Gambar yang diterima kosong.');
        }
        const contentType = response.headers['content-type'] ||
            'image/jpeg';
        res.set({
            'Content-Type': contentType,
            'Content-Length': buffer.length.toString(),
            'Cache-Control': 'no-cache'
        });
        return res.send(buffer);
    }
    catch (error) {
        const message = error instanceof Error
            ? error.message
            : 'Internal Server Error';
        return res.status(500).json({
            status: false,
            message
        });
    }
}
