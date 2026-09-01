"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ytsHandler;
const axios_1 = __importDefault(require("axios"));
async function ytsHandler(req, res) {
    const query = String(req.query.q || req.query.query || '').trim();
    if (!query) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'q' diperlukan."
        });
    }
    const { data } = await axios_1.default.get('https://www.youtube.com/results', {
        params: { search_query: query },
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        }
    });
    const match = data.match(/var ytInitialData = (.*?);<\/script>/s);
    if (!match) {
        throw new Error('Gagal parsing data Youtube');
    }
    const youtubeData = JSON.parse(match[1]);
    const contents = youtubeData.contents
        ?.twoColumnSearchResultsRenderer
        ?.primaryContents
        ?.sectionListRenderer
        ?.contents;
    if (!contents) {
        throw new Error('Konten tidak ditemukan');
    }
    const section = contents.find((item) => item.itemSectionRenderer)?.itemSectionRenderer?.contents;
    if (!section) {
        throw new Error('Section tidak ditemukan');
    }
    const results = section
        .filter((item) => item.videoRenderer?.lengthText)
        .map((item) => {
        const video = item.videoRenderer;
        return {
            title: video.title?.runs?.[0]?.text || 'No Title',
            thumbnail: video.thumbnail?.thumbnails?.slice(-1)[0]?.url || '',
            duration: video.lengthText?.simpleText || '0:00',
            uploaded: video.publishedTimeText?.simpleText || '',
            views: video.viewCountText?.simpleText || '0 views',
            url: `https://youtu.be/${video.videoId}`,
            videoId: video.videoId
        };
    });
    return res.json({
        status: true,
        result: results
    });
}
