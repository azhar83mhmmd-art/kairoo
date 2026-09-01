/*
 * Kairoo API | sylvatica.my.id
 * © Dandy
 */
 
import { Application, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { logRouterRequest } from './logger';

const registeredRoutes = new Set<string>();
let app: Application;
let config: any;

const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']; // metode

const readJson = (filePath: string) => JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const getEndpoints = (cwd: string) => {
    const folder = path.join(cwd, 'src', 'endpoints');
    if (!fs.existsSync(folder)) return {};
    
    const endpoints: Record<string, any[]> = {};
    
    for (const file of fs.readdirSync(folder)) {
        if (!file.endsWith('.json')) continue;

        const name = file.replace('.json', '');
        const filePath = path.join(folder, file);

        try {
            const data = readJson(filePath);
            endpoints[name] = Array.isArray(data) ? data : data.endpoints || [];
            console.log(`[i] Loaded endpoints: ${name} (${endpoints[name].length} routes)`);
        } catch (error) {
            console.error(`[!] Failed to load ${file}:`, error);
        }
    }

    return endpoints;
};

export const buildConfig = (configPath: string, cwd: string) => {
    const data = readJson(configPath);
    data.tags = { ...(data.tags || {}), ...getEndpoints(cwd) };
    return data;
};

const getRouteFile = (category: string, filename: string) => {
    const folders = [
        path.join(__dirname, '..', 'router', category),
        path.join(process.cwd(), 'router', category),
        path.join(process.cwd(), 'dist', 'router', category)
    ];

    for (const folder of folders) {
        for (const extension of ['.ts', '.js']) {
            const filePath = path.join(folder, `${filename}${extension}`);
            if (fs.existsSync(filePath)) return filePath;
        }
    }

    return null;
};

const getRouteKey = (route: any) =>
    `${String(route.method).toLowerCase()}:${route.endpoint}`;

const registerRoute = (
    route: any,
    category: string,
    creator: string,
    targetApp: Application
) => {
    const method = String(route.method || '').toLowerCase();
    const routeKey = getRouteKey(route);

    if (registeredRoutes.has(routeKey)) return;

    if (!methods.includes(method)) {
        console.error(`[!] Unsupported method: ${route.method} ${route.endpoint}`);
        return;
    }

    if (!route.endpoint || !route.filename) {
        console.error('[!] Invalid route configuration:', route);
        return;
    }

    const filePath = getRouteFile(category, route.filename);

    if (!filePath) {
        console.error(`[!] File not found: router/${category}/${route.filename}`);
        return;
    }

    try {
        delete require.cache[require.resolve(filePath)];

        const routeModule = require(filePath);
        const handler = routeModule.default || routeModule;

        if (typeof handler !== 'function') {
            console.error(`[!] Invalid handler: ${filePath}`);
            return;
        }

        const routeHandler = async (req: Request, res: Response, next: NextFunction) => {
            logRouterRequest(req, res);

            const oldJson = res.json.bind(res);

            res.json = (body: any) => {
                if (body && typeof body === 'object' && !Array.isArray(body)) {
                    return oldJson({ creator, ...body });
                }

                return oldJson(body);
            };

            try {
                await handler(req, res, next);
            } catch (error) {
                next(error);
            }
        };

        (targetApp as any)[method](route.endpoint, routeHandler);
        registeredRoutes.add(routeKey);

        console.log(`[+] Loaded: ${route.method} ${route.endpoint} -> ${path.basename(filePath)}`);
    } catch (error) {
        console.error(`[!] Failed to load ${route.endpoint}:`, error);
    }
};

export const loadRouter = (targetApp: Application, targetConfig: any) => {
    app = targetApp;
    config = targetConfig;

    if (!config.tags) {
        console.error('[!] tags not found in config.json');
        return;
    }

    const creator = config.settings?.creator || '';

    for (const category of Object.keys(config.tags)) {
        const routes = config.tags[category];
        if (!Array.isArray(routes)) continue;

        for (const route of routes) {
            registerRoute(route, category, creator, targetApp);
        }
    }
};

const reloadRouter = () => {
    if (!app || !config) return;
    loadRouter(app, config);
};

export const initAutoLoad = (
    targetApp: Application,
    targetConfig: any,
    configPath: string
) => {
    app = targetApp;
    config = targetConfig;

    console.log('[✓] Auto Load Activated');

    /*
     * Bug sebelumnya: fs.watch() dipanggil tanpa syarat di sini, yang
     * berjalan SYNCHRONOUS di akhir index.ts. Di Vercel/AWS Lambda
     * (serverless) tidak ada dukungan inotify, jadi fs.watch() throw
     * "ENOSYS: function not implemented, watch" — dan karena ini
     * dipanggil di top-level module load, itu meng-crash SELURUH
     * aplikasi di setiap cold start, untuk semua endpoint.
     *
     * Hot-reload juga tidak berguna di serverless (tiap invocation bisa
     * dapat container baru), jadi langsung di-skip kalau terdeteksi
     * berjalan di Vercel. Selain itu tetap dibungkus try/catch sebagai
     * pengaman tambahan untuk environment lain yang juga read-only.
     */
    if (process.env.VERCEL) {
        return;
    }

    if (fs.existsSync(configPath)) {
        try {
            fs.watch(configPath, (event, filename) => {
                if (event !== 'change' || !filename) return;

                try {
                    const newConfig = readJson(configPath);

                    config = {
                        ...newConfig,
                        tags: {
                            ...(newConfig.tags || {}),
                            ...getEndpoints(process.cwd())
                        }
                    };

                    reloadRouter();
                    console.log('[✓] Config reloaded');
                } catch (error) {
                    console.error('[!] Failed to reload config:', error);
                }
            });
        } catch (error) {
            console.warn('[!] fs.watch tidak didukung di environment ini, hot-reload config dimatikan:', error);
        }
    }

    const endpointsFolder = path.join(process.cwd(), 'src', 'endpoints');

    if (fs.existsSync(endpointsFolder)) {
        try {
            fs.watch(endpointsFolder, (event, filename) => {
                if (event !== 'change' || !filename || !filename.endsWith('.json')) return;

                try {
                    config.tags = {
                        ...(config.tags || {}),
                        ...getEndpoints(process.cwd())
                    };

                    reloadRouter();
                    console.log(`[✓] Endpoint reloaded: ${filename}`);
                } catch (error) {
                    console.error('[!] Failed to reload endpoint:', error);
                }
            });
        } catch (error) {
            console.warn('[!] fs.watch tidak didukung di environment ini, hot-reload endpoint dimatikan:', error);
        }
    }
};