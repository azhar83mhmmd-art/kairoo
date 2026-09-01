"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = qcwaHandler;
const canvas_1 = require("@napi-rs/canvas");
const _canvas_1 = require("./_canvas");
const _emoji_1 = require("./_emoji");
/*
 * WA Quote — screenshot chat WhatsApp (mode gelap/terang), dipakai untuk
 * endpoint /api/maker/qcwa. Diadaptasi dari referensi qcwa.js, tapi
 * seluruh asset (font/background) di-cache lewat helper _canvas.ts yang
 * sudah aman untuk serverless (os.tmpdir()), bukan folder lokal.
 */
const FONT_MEDIUM_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Font/Inter-Medium.otf';
const FONT_REGULAR_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Font/interregular.ttf';
const BACKGROUND_DARK_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Image/hoh.jpeg';
const BACKGROUND_LIGHT_URL = 'https://cdn.jsdelivr.net/gh/Ditzzx-vibecoder/Assets@main/Font/sisis.jpeg';
const FONT_MEDIUM = 'QcwaInterMedium';
const FONT_REGULAR = 'QcwaInterRegular';
const THEMES = {
    dark: { bubble: '#242625', text: '#f1f3f5', phone: '#7a8285', time: '#aeb4b8' },
    light: { bubble: '#ffffff', text: '#2f3032', phone: '#767a7b', time: '#767a7b' }
};
const USERNAME_COLORS_DARK = [
    '#25d366', '#53bdeb', '#ffb02e', '#ff6b81', '#b197fc',
    '#63e6be', '#ffd43b', '#74c0fc', '#f783ac', '#69db7c'
];
const USERNAME_COLORS_LIGHT = [
    '#1fa855', '#1070e0', '#d97706', '#dc2626',
    '#9333ea', '#db2777', '#0d9488', '#b45309'
];
const backgroundCache = {};
async function loadBackgroundImage(mode) {
    if (backgroundCache[mode])
        return backgroundCache[mode];
    const url = mode === 'light' ? BACKGROUND_LIGHT_URL : BACKGROUND_DARK_URL;
    const img = await (0, _canvas_1.remoteImage)(url);
    backgroundCache[mode] = img;
    return img;
}
function randomUsernameColor(mode) {
    const colors = mode === 'light' ? USERNAME_COLORS_LIGHT : USERNAME_COLORS_DARK;
    return colors[Math.floor(Math.random() * colors.length)];
}
function drawBackgroundCover(ctx, img, canvasW, canvasH) {
    const imgAspect = img.width / img.height;
    const canvasAspect = canvasW / canvasH;
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (imgAspect > canvasAspect) {
        sw = img.height * canvasAspect;
        sx = (img.width - sw) / 2;
    }
    else {
        sh = img.width / canvasAspect;
        sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH);
}
function bubblePath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + 26);
    ctx.quadraticCurveTo(x - 4, y + 10, x - 18, y + 4);
    ctx.quadraticCurveTo(x - 22, y + 2, x - 20, y);
    ctx.quadraticCurveTo(x - 10, y, x + r, y);
    ctx.closePath();
}
function imageAreaPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function drawCircleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}
async function qcwaHandler(req, res) {
    const username = String(req.query.username ?? req.body?.username ?? '').trim();
    const phone = String(req.query.phone ?? req.body?.phone ?? '').trim();
    const tag = String(req.query.tag ?? req.body?.tag ?? '').trim();
    const fotoUrl = String(req.query.foto ?? req.body?.foto ?? '').trim();
    const text = String(req.query.text ?? req.body?.text ?? '').trim();
    const gambarUrl = String(req.query.gambar ?? req.body?.gambar ?? '').trim();
    const modeInput = String(req.query.mode ?? req.body?.mode ?? 'dark').trim().toLowerCase();
    const mode = modeInput === 'light' ? 'light' : 'dark';
    if (!username || !phone || !fotoUrl) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'username', 'phone', dan 'foto' diperlukan."
        });
    }
    if (!text && !gambarUrl) {
        return res.status(400).json({
            status: false,
            message: "Isi salah satu dari parameter 'text' atau 'gambar'."
        });
    }
    if (!/^https?:\/\//i.test(fotoUrl) || (gambarUrl && !/^https?:\/\//i.test(gambarUrl))) {
        return res.status(400).json({
            status: false,
            message: "Parameter 'foto' dan 'gambar' harus berupa URL http/https."
        });
    }
    try {
        await (0, _canvas_1.ensureRemoteFont)(FONT_MEDIUM_URL, FONT_MEDIUM, 'qcwa-inter-medium.otf');
        await (0, _canvas_1.ensureRemoteFont)(FONT_REGULAR_URL, FONT_REGULAR, 'qcwa-inter-regular.ttf');
        const theme = THEMES[mode];
        const hasImage = Boolean(gambarUrl);
        const hasCaption = Boolean(text);
        const hasTag = Boolean(tag);
        const width = 1024;
        const usernameSize = 31;
        const phoneSize = 29;
        const tagSize = 29;
        const textSize = 40;
        const timeSize = 29;
        const usernameFont = `${usernameSize}px ${FONT_MEDIUM}`;
        const phoneFont = `${phoneSize}px ${FONT_REGULAR}`;
        const tagFont = `${tagSize}px ${FONT_REGULAR}`;
        const textFont = `${textSize}px ${FONT_REGULAR}`;
        const timeFont = `${timeSize}px ${FONT_REGULAR}`;
        const bubbleX = 108;
        const bubbleY = 60;
        const bubbleRadius = 24;
        const paddingX = 38;
        const paddingRight = 36;
        const lineHeight = 56;
        const avatarSize = 72;
        const avatarX = 12;
        const avatarY = bubbleY;
        const time = new Date()
            .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
            .replace(':', '.');
        const measureCanvas = (0, canvas_1.createCanvas)(10, 10);
        const mctx = measureCanvas.getContext('2d');
        mctx.font = usernameFont;
        const usernameWidth = await (0, _emoji_1.measureTextWithEmojis)(mctx, username, usernameSize);
        mctx.font = phoneFont;
        const phoneWidth = await (0, _emoji_1.measureTextWithEmojis)(mctx, phone, phoneSize);
        mctx.font = tagFont;
        const tagWidth = hasTag ? await (0, _emoji_1.measureTextWithEmojis)(mctx, tag, tagSize) : 0;
        mctx.font = timeFont;
        const timeWidth = mctx.measureText(time).width;
        const headerGap = 40;
        const minHeaderWidth = usernameWidth + headerGap + phoneWidth + paddingX + paddingRight;
        const minTagWidth = hasTag ? tagWidth + paddingX + paddingRight : 0;
        const maxBubbleW = width - bubbleX - 24;
        const textRightLimit = bubbleX + maxBubbleW - paddingRight - 18;
        const contentX = bubbleX + paddingX - 5;
        const textMaxWidth = Math.max(260, textRightLimit - contentX);
        mctx.font = textFont;
        const lines = hasCaption ? await (0, _emoji_1.wrapTextWithEmojis)(mctx, text, textMaxWidth, textSize) : [];
        let bubbleWidth = maxBubbleW;
        if (!hasImage) {
            let maxLineWidth = 0;
            for (const line of lines) {
                const w = await (0, _emoji_1.measureTextWithEmojis)(mctx, line, textSize);
                if (w > maxLineWidth)
                    maxLineWidth = w;
            }
            let neededTextWidth = maxLineWidth + paddingX + paddingRight + 25;
            if (lines.length === 1)
                neededTextWidth += timeWidth + 15;
            bubbleWidth = Math.max(neededTextWidth, minHeaderWidth, minTagWidth);
            if (bubbleWidth > maxBubbleW)
                bubbleWidth = maxBubbleW;
        }
        const phoneX = bubbleX + bubbleWidth - phoneWidth - paddingRight;
        const timeX = bubbleX + bubbleWidth - 20;
        let avatar;
        try {
            avatar = await (0, _canvas_1.remoteImage)(fotoUrl);
        }
        catch {
            return res.status(400).json({ status: false, message: 'Gagal memuat gambar dari foto.' });
        }
        const background = await loadBackgroundImage(mode);
        let mainImage = null;
        const imageAreaX = bubbleX + 8;
        const imageAreaW = bubbleWidth - 16;
        let imageDrawH = 0;
        if (hasImage) {
            try {
                mainImage = await (0, _canvas_1.remoteImage)(gambarUrl);
            }
            catch {
                return res.status(400).json({ status: false, message: 'Gagal memuat gambar dari gambar.' });
            }
            const imgAspect = mainImage.width / mainImage.height;
            imageDrawH = Math.round(imageAreaW / imgAspect);
        }
        let headerY, tagY = 0, headerBlockH;
        if (hasTag) {
            headerY = bubbleY + 52;
            tagY = headerY + 43;
            headerBlockH = 130;
        }
        else {
            headerBlockH = 76;
            headerY = bubbleY + 34;
        }
        const imageBottomGap = hasImage ? (hasCaption ? 20 : 8) : 0;
        const imageBlockH = hasImage ? imageDrawH + imageBottomGap : 0;
        const textBlockH = lines.length * lineHeight;
        const timeRowH = !hasImage && hasCaption ? 26 : 0;
        const bottomPad = hasImage ? (hasCaption ? 20 : 8) : 0;
        const bubbleHeight = Math.max(100, headerBlockH + imageBlockH + textBlockH + timeRowH + bottomPad);
        const imageY = bubbleY + headerBlockH;
        const textStartY = hasImage
            ? imageY + imageDrawH + imageBottomGap + lineHeight / 2 - 6
            : bubbleY + headerBlockH + textSize / 2 + 2;
        const height = Math.round(bubbleY + bubbleHeight + 70);
        const canvas = (0, canvas_1.createCanvas)(width, height);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
        drawBackgroundCover(ctx, background, width, height);
        ctx.fillStyle = theme.bubble;
        bubblePath(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, bubbleRadius);
        ctx.fill();
        drawCircleImage(ctx, avatar, avatarX, avatarY, avatarSize);
        ctx.textAlign = 'left';
        ctx.textBaseline = hasTag ? 'alphabetic' : 'middle';
        ctx.font = usernameFont;
        ctx.fillStyle = randomUsernameColor(mode);
        await (0, _emoji_1.drawTextWithEmojis)(ctx, username, contentX, headerY, usernameSize);
        ctx.font = phoneFont;
        ctx.fillStyle = theme.phone;
        await (0, _emoji_1.drawTextWithEmojis)(ctx, phone, phoneX, headerY, phoneSize);
        if (hasTag) {
            ctx.textBaseline = 'alphabetic';
            ctx.font = tagFont;
            ctx.fillStyle = theme.phone;
            await (0, _emoji_1.drawTextWithEmojis)(ctx, tag, contentX, tagY, tagSize);
        }
        if (hasImage && mainImage) {
            ctx.save();
            imageAreaPath(ctx, imageAreaX, imageY, imageAreaW, imageDrawH, 20);
            ctx.clip();
            ctx.drawImage(mainImage, imageAreaX, imageY, imageAreaW, imageDrawH);
            ctx.restore();
        }
        ctx.font = textFont;
        ctx.fillStyle = theme.text;
        ctx.textBaseline = 'middle';
        for (let i = 0; i < lines.length; i++) {
            await (0, _emoji_1.drawTextWithEmojis)(ctx, lines[i], contentX, textStartY + i * lineHeight, textSize);
        }
        ctx.font = timeFont;
        ctx.textBaseline = 'alphabetic';
        if (hasImage && !hasCaption) {
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'right';
            const imgTimeX = imageAreaX + imageAreaW - 20;
            const imgTimeY = imageY + imageDrawH - 18;
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            ctx.fillText(time, imgTimeX, imgTimeY);
            ctx.restore();
        }
        else {
            ctx.fillStyle = theme.time;
            ctx.textAlign = 'right';
            const timeYOffset = !hasImage ? 13 : 16;
            const timeY = bubbleY + bubbleHeight - timeYOffset;
            ctx.fillText(time, timeX, timeY);
        }
        return (0, _canvas_1.sendPng)(res, canvas);
    }
    catch (error) {
        return res.status(500).json({
            status: false,
            message: error?.message || 'Gagal membuat gambar.'
        });
    }
}
