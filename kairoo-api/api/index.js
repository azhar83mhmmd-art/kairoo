/*
 * Entry point untuk Vercel Serverless Functions.
 *
 * Kenapa lewat sini, bukan langsung index.ts?
 * Beberapa bagian project (autoload.ts) me-require file router secara
 * dinamis berdasarkan path yang dihitung saat runtime (bukan `import`
 * statis). Bundler Vercel (@vercel/node / nft) tidak bisa melacak
 * require dinamis semacam itu, dan runtime Node di Vercel juga tidak
 * bisa langsung require file .ts tanpa ts-node. Karena itu Vercel
 * HARUS menjalankan hasil build (dist/**, JS biasa) — bukan source TS
 * mentah — supaya semua router ikut ter-bundle dan bisa di-require
 * saat runtime. Lihat vercel.json ("buildCommand" + "includeFiles").
 *
 * File ini TIDAK memanggil app.listen() — index.ts hanya listen kalau
 * dijalankan sebagai entry point langsung (lihat require.main check di
 * index.ts). Express app di-export apa adanya; @vercel/node bisa
 * memanggil Express app langsung sebagai request handler (req, res).
 */
module.exports = require('../dist/index.js').default;
