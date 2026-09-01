"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = facebookHandler;
const axios_1 = __importDefault(require("axios"));
const qs_1 = __importDefault(require("qs"));
const cheerio = __importStar(require("cheerio"));
async function getFdownTokens() {
    const { data } = await axios_1.default.get('https://fdown.net', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
            'Accept-Language': 'id-ID',
            'Upgrade-Insecure-Requests': '1',
        }
    });
    const $ = cheerio.load(data);
    return {
        token_v: $('input[name="token_v"]').val(),
        token_c: $('input[name="token_c"]').val(),
        token_h: $('input[name="token_h"]').val()
    };
}
async function facebookDl(url) {
    try {
        const tokens = await getFdownTokens();
        const postData = qs_1.default.stringify({
            'URLz': url,
            'token_v': tokens.token_v,
            'token_c': tokens.token_c,
            'token_h': tokens.token_h
        });
        const { data } = await axios_1.default.post('https://fdown.net/download.php', postData, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Android 10; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8',
                'Content-Type': 'application/x-www-form-urlencoded',
                'accept-language': 'id-ID',
                'referer': 'https://fdown.net/',
            }
        });
        const $ = cheerio.load(data);
        if ($('.alert-danger').length > 0) {
            throw new Error("Video is private or URL is invalid");
        }
        const title = $('.lib-row.lib-header').text().trim() || "Facebook Video";
        const description = $('.lib-row.lib-desc').text().trim() || "No Description";
        const sdLink = $('#sdlink').attr('href');
        const hdLink = $('#hdlink').attr('href');
        if (!sdLink && !hdLink) {
            throw new Error("No download links found");
        }
        return {
            title,
            description,
            sd: sdLink || "",
            hd: hdLink || ""
        };
    }
    catch (e) {
        throw new Error(e.message || "Failed to download Facebook video");
    }
}
async function facebookHandler(req, res) {
    const url = (req.query.url || req.body.url);
    if (!url)
        return res.status(400).json({ status: false, message: "URL required" });
    try {
        const result = await facebookDl(url);
        res.json({ status: true, data: result });
    }
    catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
}
