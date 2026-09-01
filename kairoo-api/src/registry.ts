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

import type { Request, Response, NextFunction } from 'express';

import configJson from './config.json';

import aiEndpoints from './endpoints/ai.json';
import downloadEndpoints from './endpoints/download.json';
import makerEndpoints from './endpoints/maker.json';
import randomEndpoints from './endpoints/random.json';
import searchEndpoints from './endpoints/search.json';
import toolsEndpoints from './endpoints/tools.json';

import kuronekoHandler from '../router/ai/kuroneko';

import facebookHandler from '../router/download/facebook';
import aioHandler from '../router/download/aio';

import bratHandler from '../router/maker/brat';
import bratvidHandler from '../router/maker/bratvid';
import iqcHandler from '../router/maker/iqc';
import drakeHandler from '../router/maker/drake';
import twobuttonsHandler from '../router/maker/twobuttons';
import beautifulHandler from '../router/maker/beautiful';
import quoteanimeHandler from '../router/maker/quoteanime';
import timpaHandler from '../router/maker/timpa';
import jarvisHandler from '../router/maker/jarvis';
import qcwaHandler from '../router/maker/qcwa';
import igqcHandler from '../router/maker/igqc';
import kalenderHandler from '../router/maker/kalender';

import blueArchiveHandler from '../router/random/blue_archive';

import ytsHandler from '../router/search/yts';
import pinterestHandler from '../router/search/pinterest';

import shorturlHandler from '../router/tools/shorturl';
import nikcheckHandler from '../router/tools/nikcheck';

export type RouteHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => any;

/*
 * routerRegistry[category][filename] -> handler
 * Kalau menambah endpoint baru di masa depan: tambahkan import di atas,
 * lalu daftarkan di sini DAN di endpointsRegistry di bawah. Ini sengaja
 * eksplisit (bukan otomatis dari folder) supaya bundler selalu tahu
 * persis file mana yang dipakai.
 */
export const routerRegistry: Record<string, Record<string, RouteHandler>> = {
    ai: {
        kuroneko: kuronekoHandler
    },
    download: {
        facebook: facebookHandler,
        aio: aioHandler
    },
    maker: {
        brat: bratHandler,
        bratvid: bratvidHandler as unknown as RouteHandler,
        iqc: iqcHandler,
        drake: drakeHandler,
        twobuttons: twobuttonsHandler,
        beautiful: beautifulHandler,
        quoteanime: quoteanimeHandler,
        timpa: timpaHandler,
        jarvis: jarvisHandler,
        qcwa: qcwaHandler,
        igqc: igqcHandler,
        kalender: kalenderHandler
    },
    random: {
        blue_archive: blueArchiveHandler
    },
    search: {
        yts: ytsHandler,
        pinterest: pinterestHandler
    },
    tools: {
        shorturl: shorturlHandler,
        nikcheck: nikcheckHandler
    }
};

export const endpointsRegistry: Record<string, any[]> = {
    ai: aiEndpoints as any[],
    download: downloadEndpoints as any[],
    maker: makerEndpoints as any[],
    random: randomEndpoints as any[],
    search: searchEndpoints as any[],
    tools: toolsEndpoints as any[]
};

export const baseConfig: any = configJson;
