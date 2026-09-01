"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Kairoo API | sylvatica.my.id
 * © Dandy
 */
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const rateLimit_1 = require("./src/middleware/rateLimit");
const errorHandler_1 = require("./src/middleware/errorHandler");
const autoload_1 = require("./src/autoload");
const app = (0, express_1.default)();
/*
 * PORT hanya relevan untuk menjalankan server lokal (Termux/VPS) lewat
 * app.listen(). Vercel Serverless Functions TIDAK menyediakan/menggunakan
 * PORT sama sekali — proses tidak boleh crash hanya karena variable ini
 * tidak ada. Default 3000 dipakai untuk kebutuhan lokal saja.
 */
const port = Number(process.env.PORT) || 3000;
const recentRequests = [];
app.set('trust proxy', true);
const configPaths = [
    path_1.default.join(__dirname, 'src', 'config.json'),
    path_1.default.join(__dirname, '..', 'src', 'config.json'),
    path_1.default.join(process.cwd(), 'src', 'config.json'),
    path_1.default.join(process.cwd(), 'dist', 'src', 'config.json'),
    '/var/task/src/config.json'
];
/*
 * Bug sebelumnya: kalau config.json tidak ketemu di salah satu kandidat
 * path (mis. gara-gara langkah "copy-assets" saat build tidak
 * ke-include dengan benar di bundle Vercel), fungsi ini memanggil
 * process.exit(1). Di lingkungan serverless, process.exit() dipanggil
 * saat module di-load pertama kali (cold start) — ini MEMATIKAN seluruh
 * proses Lambda/Vercel Function sebelum request apa pun sempat
 * ditangani, sehingga SETIAP endpoint (termasuk "/") langsung crash
 * dengan FUNCTION_INVOCATION_FAILED. Sekarang function ini hanya
 * mengembalikan null kalau tidak ketemu, dan pemanggilnya memakai
 * fallback config supaya aplikasi tetap bisa boot & melayani request
 * (walau endpoint dinamis dari config.tags tidak ter-load).
 */
const findConfig = () => {
    for (const file of configPaths) {
        if (fs_1.default.existsSync(file))
            return file;
    }
    return null;
};
/*
 * buildConfig sekarang SELALU berhasil menghasilkan config lengkap
 * (settings + tags) walaupun configPath null/tidak ketemu, karena
 * settings & endpoints dasarnya berasal dari src/registry.ts yang
 * di-import statis (ikut ter-bundle ke Vercel, tidak bergantung pada
 * file config.json ditemukan di disk saat runtime). configPath di sini
 * hanya dipakai sebagai override opsional (mis. edit config.json lokal
 * tanpa rebuild).
 */
const configPath = findConfig();
let config;
try {
    config = (0, autoload_1.buildConfig)(configPath ?? '', process.cwd());
}
catch (error) {
    console.error('[✗] Failed to build config, endpoints may be incomplete:', error);
    config = { settings: { creator: 'Kairoo' }, tags: {} };
}
/*
 * Resolusi folder 'public' & 'src' yang aman untuk semua environment:
 * - lokal via `ts-node index.ts` (cwd = root project)
 * - lokal via `node dist/index.js` (cwd = root project, __dirname = dist)
 * - Vercel Serverless Function (cwd tidak selalu sama dengan root project)
 */
const findDir = (name) => {
    const candidates = [
        path_1.default.join(__dirname, name),
        path_1.default.join(__dirname, '..', name),
        path_1.default.join(process.cwd(), name),
        path_1.default.join(process.cwd(), 'dist', name)
    ];
    for (const dir of candidates) {
        if (fs_1.default.existsSync(dir))
            return dir;
    }
    // fallback: pertahankan perilaku lama walau folder belum ditemukan
    return path_1.default.join(process.cwd(), name);
};
const publicCandidates = [
    path_1.default.join(process.cwd(), 'public'),
    path_1.default.join(__dirname, '..', 'public'),
    path_1.default.join(__dirname, 'public'),
    path_1.default.join(process.cwd(), 'dist', 'public')
];
const publicDir = publicCandidates.find((dir) => fs_1.default.existsSync(dir)) || path_1.default.join(process.cwd(), 'public');
const srcDir = findDir('src');
const formatBytes = (bytes) => {
    if (bytes === 0)
        return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};
const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};
const logRequest = (req, res) => {
    const ignoredPaths = [
        '/stats',
        '/stats/data',
        '/src',
        '/docs',
        '/config',
        '/favicon.ico',
        '/',
        '/landing'
    ];
    if (ignoredPaths.some((item) => req.path.startsWith(item))) {
        return;
    }
    const cleanUrl = req.originalUrl.replace(/(=)[^&]+/g, '$1');
    const url = `${req.protocol}://${req.get('host')}${cleanUrl}`;
    recentRequests.push(`[${req.method}] [${res.statusCode}] ${url}`);
    if (recentRequests.length > 50)
        recentRequests.shift();
};
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.on('finish', () => logRequest(req, res));
    next();
});
app.use(express_1.default.static(publicDir));
app.use('/src', express_1.default.static(srcDir));
app.use(rateLimit_1.rateLimit); // rate limiter
(0, autoload_1.loadRouter)(app, config); // endpoints router
app.get('/stats/data', (req, res) => {
    try {
        const totalMemory = os_1.default.totalmem();
        const freeMemory = os_1.default.freemem();
        const usedMemory = totalMemory - freeMemory;
        const cpus = os_1.default.cpus();
        return res.json({
            status: true,
            server: {
                platform: os_1.default.platform(),
                arch: os_1.default.arch(),
                hostname: os_1.default.hostname(),
                uptime: formatUptime(os_1.default.uptime()),
                node_version: process.version,
                memory: {
                    total: formatBytes(totalMemory),
                    used: formatBytes(usedMemory),
                    free: formatBytes(freeMemory),
                    percent: Math.round((usedMemory / totalMemory) * 100)
                },
                cpu: {
                    model: cpus[0]?.model || 'Unknown',
                    speed: `${cpus[0]?.speed || 0} MHz`,
                    cores: cpus.length,
                    load: os_1.default.loadavg()[0].toFixed(2)
                }
            },
            requests: recentRequests
        });
    }
    catch {
        return res.status(500).json({ status: false });
    }
});
app.get('/stats', (req, res) => {
    return res.sendFile(path_1.default.join(publicDir, 'stats', 'stats.html'));
});
app.get('/config', (req, res) => {
    try {
        return res.json({
            creator: config.settings.creator,
            ...config
        });
    }
    catch {
        return res.status(500).json({
            creator: config.settings.creator,
            error: 'Internal Server Error'
        });
    }
});
app.get('/', (req, res) => {
    const landingFile = path_1.default.join(publicDir, 'landing', 'landing.html');
    // Vercel/serverless: jangan biarkan API crash hanya karena asset landing
    // tidak ikut ter-bundle. Jika file ada, tetap tampilkan landing page;
    // jika tidak ada, kembalikan status API dalam JSON.
    if (fs_1.default.existsSync(landingFile)) {
        return res.sendFile(landingFile);
    }
    return res.status(200).json({
        status: true,
        creator: config.settings.creator,
        message: 'Kairoo API is running'
    });
});
app.get('/docs', (req, res) => {
    return res.sendFile(path_1.default.join(publicDir, 'docs', 'docs.html'));
});
app.use((req, res) => {
    if (req.accepts('html')) {
        const files = [
            path_1.default.join(publicDir, '404.html'),
            path_1.default.join(__dirname, 'public', '404.html')
        ];
        for (const file of files) {
            if (fs_1.default.existsSync(file)) {
                return res.status(404).sendFile(file);
            }
        }
    }
    return res.status(404).json({
        status: false,
        creator: config.settings.creator,
        message: 'Route not found'
    });
});
app.use(errorHandler_1.errorHandler);
(0, autoload_1.initAutoLoad)(app, config, configPath ?? '');
/*
 * app.listen() HANYA dijalankan kalau file ini adalah entry point yang
 * langsung dieksekusi (mis. `node dist/index.js` / `ts-node index.ts`
 * lokal atau di VPS/Termux). Kalau file ini di-require oleh file lain
 * (mis. wrapper serverless function Vercel), require.main !== module,
 * sehingga listener TIDAK dibuat — sesuai kebutuhan Vercel Serverless
 * Functions yang tidak memakai/menyediakan PORT sama sekali.
 */
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}
exports.default = app;
