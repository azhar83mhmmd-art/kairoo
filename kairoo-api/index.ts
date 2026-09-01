/*
 * Kairoo API | sylvatica.my.id
 * © Dandy
 */
import 'dotenv/config';
import express, {
    Request,
    Response,
    NextFunction
} from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { rateLimit } from './src/middleware/rateLimit';
import { errorHandler } from './src/middleware/errorHandler';
import {
    loadRouter,
    initAutoLoad,
    buildConfig
} from './src/autoload';

const app = express();
/*
 * PORT hanya relevan untuk menjalankan server lokal (Termux/VPS) lewat
 * app.listen(). Vercel Serverless Functions TIDAK menyediakan/menggunakan
 * PORT sama sekali — proses tidak boleh crash hanya karena variable ini
 * tidak ada. Default 3000 dipakai untuk kebutuhan lokal saja.
 */
const port = Number(process.env.PORT) || 3000;
const recentRequests: string[] = [];
app.set('trust proxy', true);
const configPaths = [
    path.join(__dirname, 'src', 'config.json'),
    path.join(__dirname, '..', 'src', 'config.json'),
    path.join(process.cwd(), 'src', 'config.json'),
    path.join(process.cwd(), 'dist', 'src', 'config.json'),
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
        if (fs.existsSync(file)) return file;
    }

    return null;
};

const FALLBACK_CONFIG = {
    settings: {
        creator: 'Kairoo',
        apiName: 'Kairoo',
        description: 'A free and reliable API service.',
        apiVersion: 'v1.0',
        visitors: '0',
        favicon: '/src/danzz.jpg',
        thumbnail: '/src/thumbnail.jpg',
        channelUrl: '',
        github: ''
    },
    tags: {}
};

const configPath = findConfig();

let config: any;
if (configPath) {
    try {
        config = buildConfig(configPath, process.cwd());
    } catch (error) {
        console.error('[✗] Failed to parse config.json, using fallback config:', error);
        config = FALLBACK_CONFIG;
    }
} else {
    console.error(
        '[✗] config.json not found in any known location — using fallback config. ' +
        'Endpoint dari src/endpoints/*.json tidak akan ter-load sampai ini diperbaiki.'
    );
    config = FALLBACK_CONFIG;
}

/*
 * Resolusi folder 'public' & 'src' yang aman untuk semua environment:
 * - lokal via `ts-node index.ts` (cwd = root project)
 * - lokal via `node dist/index.js` (cwd = root project, __dirname = dist)
 * - Vercel Serverless Function (cwd tidak selalu sama dengan root project)
 */
const findDir = (name: string) => {
    const candidates = [
        path.join(__dirname, name),
        path.join(__dirname, '..', name),
        path.join(process.cwd(), name),
        path.join(process.cwd(), 'dist', name)
    ];

    for (const dir of candidates) {
        if (fs.existsSync(dir)) return dir;
    }

    // fallback: pertahankan perilaku lama walau folder belum ditemukan
    return path.join(process.cwd(), name);
};

const publicDir = findDir('public');
const srcDir = findDir('src');

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
};

const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${days}d ${hours}h ${minutes}m ${secs}s`;
};

const logRequest = (req: Request, res: Response) => {
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

    if (recentRequests.length > 50) recentRequests.shift();
};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => logRequest(req, res));
    next();
});

app.use(express.static(publicDir));
app.use('/src', express.static(srcDir));

app.use(rateLimit); // rate limiter
loadRouter(app, config); // endpoints router

app.get('/stats/data', (req: Request, res: Response) => {
    try {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const cpus = os.cpus();
        return res.json({
            status: true,
            server: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                uptime: formatUptime(os.uptime()),
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
                    load: os.loadavg()[0].toFixed(2)
                }
            },
            requests: recentRequests
        });
    } catch {
        return res.status(500).json({ status: false });
    }
});

app.get('/stats', (req: Request, res: Response) => {
    return res.sendFile(
        path.join(publicDir, 'stats', 'stats.html')
    );
});

app.get('/config', (req: Request, res: Response) => {
    try {
        return res.json({
            creator: config.settings.creator,
            ...config
        });
    } catch {
        return res.status(500).json({
            creator: config.settings.creator,
            error: 'Internal Server Error'
        });
    }
});

app.get('/', (req: Request, res: Response) => {
    return res.sendFile(
        path.join(publicDir, 'landing', 'landing.html')
    );
});

app.get('/docs', (req: Request, res: Response) => {
    return res.sendFile(
        path.join(publicDir, 'docs', 'docs.html')
    );
});

app.use((req: Request, res: Response) => {
    if (req.accepts('html')) {
        const files = [
            path.join(publicDir, '404.html'),
            path.join(__dirname, 'public', '404.html')
        ];

        for (const file of files) {
            if (fs.existsSync(file)) {
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

app.use(errorHandler);
initAutoLoad(app, config, configPath ?? '');

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

export default app;