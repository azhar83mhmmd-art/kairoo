"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = shortUrlHandler;
const axios_1 = __importDefault(require("axios"));
async function shortUrlHandler(req, res) {
    const url = String(req.query.url || req.body.url || '').trim();
    const alias = String(req.query.alias || req.body.alias || '').trim();
    if (!url) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'url' diperlukan."
        });
    }
    if (!url.startsWith('http')) {
        return res.status(400).json({
            status: false,
            message: 'URL harus diawali dengan http:// atau https://'
        });
    }
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}&alias=${encodeURIComponent(alias)}`;
    const response = await axios_1.default.get(apiUrl);
    if (response.data === 'Error') {
        return res.status(400).json({
            status: false,
            message: 'Custom Alias ini sudah dipakai orang lain. Coba nama lain.'
        });
    }
    return res.json({
        status: true,
        result: response.data
    });
}
