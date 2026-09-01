"use strict";
/*
 * Kairoo API | sylvatica.my.id
 * © Dandy
 *
 * REGISTRY STATIS — inti dari perbaikan "docs endpoint tidak muncul di Vercel".
 *
 * Kenapa ini dibutuhkan:
 * Sebelumnya semua router (router/**\/*.ts) dimuat lewat require(filePath)
 * dengan `filePath` dihitung saat runtime (lihat autoload.ts versi lama),
 * dan config.json / src/endpoints/*.json dibaca lewat fs.readFileSync ke
 * beberapa kandidat path. Kedua pola ini disebut "dynamic require" /
 * "dynamic fs access" — bundler Vercel (@vercel/nft) tidak bisa melacak
 * file mana saja yang benar-benar dipakai, karena path-nya baru diketahui
 * saat kode berjalan, bukan saat build. Walaupun sudah ditambal dengan
 * vercel.json > functions > includeFiles, hasilnya tetap tidak konsisten:
 * di lokal (`node dist/index.js`) semua endpoint termuat sempurna, tapi di
 * Vercel Serverless Function beberapa/semua file router & JSON endpoint
 * TIDAK ikut ter-deploy, sehingga config.tags kosong dan halaman /docs
 * cuma menampilkan animasi terminal tanpa daftar endpoint apa pun (persis
 * seperti di screenshot: "Server running on ..." muncul tapi baris
 * "[+] GET ..." tidak pernah tampil).
 *
 * Solusinya: ganti SEMUA require/fs dinamis untuk data endpoint dengan
 * `import` statis biasa. Import statis dianalisis oleh TypeScript/bundler
 * saat build, jadi setiap file di bawah ini DIJAMIN ikut ter-bundle ke
 * dist/ dan ikut ter-deploy ke Vercel — tidak bergantung lagi pada
 * includeFiles, fs.existsSync, ataupun struktur folder saat runtime.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseConfig = exports.endpointsRegistry = exports.routerRegistry = void 0;
const config_json_1 = __importDefault(require("./config.json"));
const ai_json_1 = __importDefault(require("./endpoints/ai.json"));
const download_json_1 = __importDefault(require("./endpoints/download.json"));
const maker_json_1 = __importDefault(require("./endpoints/maker.json"));
const random_json_1 = __importDefault(require("./endpoints/random.json"));
const search_json_1 = __importDefault(require("./endpoints/search.json"));
const tools_json_1 = __importDefault(require("./endpoints/tools.json"));
const kuroneko_1 = __importDefault(require("../router/ai/kuroneko"));
const facebook_1 = __importDefault(require("../router/download/facebook"));
const aio_1 = __importDefault(require("../router/download/aio"));
const brat_1 = __importDefault(require("../router/maker/brat"));
const bratvid_1 = __importDefault(require("../router/maker/bratvid"));
const iqc_1 = __importDefault(require("../router/maker/iqc"));
const drake_1 = __importDefault(require("../router/maker/drake"));
const twobuttons_1 = __importDefault(require("../router/maker/twobuttons"));
const beautiful_1 = __importDefault(require("../router/maker/beautiful"));
const quoteanime_1 = __importDefault(require("../router/maker/quoteanime"));
const timpa_1 = __importDefault(require("../router/maker/timpa"));
const jarvis_1 = __importDefault(require("../router/maker/jarvis"));
const qcwa_1 = __importDefault(require("../router/maker/qcwa"));
const igqc_1 = __importDefault(require("../router/maker/igqc"));
const kalender_1 = __importDefault(require("../router/maker/kalender"));
const blue_archive_1 = __importDefault(require("../router/random/blue_archive"));
const yts_1 = __importDefault(require("../router/search/yts"));
const pinterest_1 = __importDefault(require("../router/search/pinterest"));
const shorturl_1 = __importDefault(require("../router/tools/shorturl"));
const nikcheck_1 = __importDefault(require("../router/tools/nikcheck"));
/*
 * routerRegistry[category][filename] -> handler
 * Kalau menambah endpoint baru di masa depan: tambahkan import di atas,
 * lalu daftarkan di sini DAN di endpointsRegistry di bawah. Ini sengaja
 * eksplisit (bukan otomatis dari folder) supaya bundler selalu tahu
 * persis file mana yang dipakai.
 */
exports.routerRegistry = {
    ai: {
        kuroneko: kuroneko_1.default
    },
    download: {
        facebook: facebook_1.default,
        aio: aio_1.default
    },
    maker: {
        brat: brat_1.default,
        bratvid: bratvid_1.default,
        iqc: iqc_1.default,
        drake: drake_1.default,
        twobuttons: twobuttons_1.default,
        beautiful: beautiful_1.default,
        quoteanime: quoteanime_1.default,
        timpa: timpa_1.default,
        jarvis: jarvis_1.default,
        qcwa: qcwa_1.default,
        igqc: igqc_1.default,
        kalender: kalender_1.default
    },
    random: {
        blue_archive: blue_archive_1.default
    },
    search: {
        yts: yts_1.default,
        pinterest: pinterest_1.default
    },
    tools: {
        shorturl: shorturl_1.default,
        nikcheck: nikcheck_1.default
    }
};
exports.endpointsRegistry = {
    ai: ai_json_1.default,
    download: download_json_1.default,
    maker: maker_json_1.default,
    random: random_json_1.default,
    search: search_json_1.default,
    tools: tools_json_1.default
};
exports.baseConfig = config_json_1.default;
