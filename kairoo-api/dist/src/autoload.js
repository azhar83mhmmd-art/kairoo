"use strict";
/*
 * Kairoo API | sylvatica.my.id
 * © Dandy
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initAutoLoad = exports.loadRouter = exports.buildConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const logger_1 = require("./logger");
const registry_1 = require("./registry");
const registeredRoutes = new Set();
let app;
let config;
const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']; // metode
const readJson = (filePath) => JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
/*
 * buildConfig sekarang mengambil settings & endpoints dari registry statis
 * (src/registry.ts) yang di-import langsung, BUKAN dari fs.readFileSync /
 * fs.readdirSync saat runtime. Ini memastikan config.json dan setiap
 * src/endpoints/*.json selalu ikut ter-bundle & ter-deploy ke Vercel,
 * karena `import` statis dilacak oleh bundler saat build — tidak seperti
 * pembacaan file dinamis yang sebelumnya sering gagal di lingkungan
 * serverless (lihat komentar panjang di src/registry.ts).
 *
 * `configPath`/`cwd` masih diterima supaya index.ts tidak perlu diubah
 * signature-nya, dan supaya `settings` tetap bisa dioverride dari file
 * config.json lokal (mis. saat development, tanpa perlu rebuild) kalau
 * memang ditemukan di disk.
 */
const buildConfig = (configPath, cwd) => {
    let data = registry_1.baseConfig;
    if (configPath && fs_1.default.existsSync(configPath)) {
        try {
            data = { ...registry_1.baseConfig, ...readJson(configPath) };
        }
        catch {
            data = registry_1.baseConfig;
        }
    }
    data = { ...data };
    data.tags = { ...registry_1.endpointsRegistry, ...(data.tags || {}) };
    console.log(`[i] Loaded endpoints from static registry: ${Object.keys(registry_1.endpointsRegistry)
        .map((name) => `${name} (${registry_1.endpointsRegistry[name].length} routes)`)
        .join(', ')}`);
    return data;
};
exports.buildConfig = buildConfig;
const getRouteHandler = (category, filename) => {
    return registry_1.routerRegistry[category]?.[filename] || null;
};
const getRouteKey = (route) => `${String(route.method).toLowerCase()}:${route.endpoint}`;
const registerRoute = (route, category, creator, targetApp) => {
    const method = String(route.method || '').toLowerCase();
    const routeKey = getRouteKey(route);
    if (registeredRoutes.has(routeKey))
        return;
    if (!methods.includes(method)) {
        console.error(`[!] Unsupported method: ${route.method} ${route.endpoint}`);
        return;
    }
    if (!route.endpoint || !route.filename) {
        console.error('[!] Invalid route configuration:', route);
        return;
    }
    const handler = getRouteHandler(category, route.filename);
    if (typeof handler !== 'function') {
        console.error(`[!] Handler not found in registry: ${category}/${route.filename}`);
        return;
    }
    try {
        const routeHandler = async (req, res, next) => {
            (0, logger_1.logRouterRequest)(req, res);
            const oldJson = res.json.bind(res);
            res.json = (body) => {
                if (body && typeof body === 'object' && !Array.isArray(body)) {
                    return oldJson({ creator, ...body });
                }
                return oldJson(body);
            };
            try {
                await handler(req, res, next);
            }
            catch (error) {
                next(error);
            }
        };
        targetApp[method](route.endpoint, routeHandler);
        registeredRoutes.add(routeKey);
        console.log(`[+] Loaded: ${route.method} ${route.endpoint} -> ${category}/${route.filename}`);
    }
    catch (error) {
        console.error(`[!] Failed to load ${route.endpoint}:`, error);
    }
};
const loadRouter = (targetApp, targetConfig) => {
    app = targetApp;
    config = targetConfig;
    if (!config.tags) {
        console.error('[!] tags not found in config.json');
        return;
    }
    const creator = config.settings?.creator || '';
    for (const category of Object.keys(config.tags)) {
        const routes = config.tags[category];
        if (!Array.isArray(routes))
            continue;
        for (const route of routes) {
            registerRoute(route, category, creator, targetApp);
        }
    }
};
exports.loadRouter = loadRouter;
const reloadRouter = () => {
    if (!app || !config)
        return;
    (0, exports.loadRouter)(app, config);
};
const initAutoLoad = (targetApp, targetConfig, configPath) => {
    app = targetApp;
    config = targetConfig;
    console.log('[✓] Auto Load Activated');
    /*
     * fs.watch untuk hot-reload HANYA berguna & aman di lingkungan lokal
     * (Termux/VPS) yang mendukung inotify dan filesystem read-write.
     * Di Vercel (serverless, read-only, tanpa inotify) ini langsung
     * di-skip, dan sekarang juga tidak lagi relevan untuk memuat
     * endpoint karena endpoint selalu berasal dari registry statis yang
     * sudah ter-bundle sejak build time.
     */
    if (process.env.VERCEL) {
        return;
    }
    if (configPath && fs_1.default.existsSync(configPath)) {
        try {
            fs_1.default.watch(configPath, (event, filename) => {
                if (event !== 'change' || !filename)
                    return;
                try {
                    config = (0, exports.buildConfig)(configPath, process.cwd());
                    reloadRouter();
                    console.log('[✓] Config reloaded');
                }
                catch (error) {
                    console.error('[!] Failed to reload config:', error);
                }
            });
        }
        catch (error) {
            console.warn('[!] fs.watch tidak didukung di environment ini, hot-reload config dimatikan:', error);
        }
    }
};
exports.initAutoLoad = initAutoLoad;
