'use strict';

// ╔══════════════════════════════════════════════════════════════════╗
// ║          ⚡ GHOST ENGINE — lib/download.js                       ║
// ║   Système de téléchargement multi-plateforme                    ║
// ║   YouTube MP3/MP4 · TikTok · Instagram                         ║
// ╚══════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');

// Chargement optionnel (pas de crash si non installé)
let ytdl, yts;
try { ytdl = require('@distube/ytdl-core'); } catch { try { ytdl = require('ytdl-core'); } catch { ytdl = null; } }
try { yts = require('yt-search'); } catch { yts = null; }

// ─────────────────────────────────────────────
//  📁  DOSSIER TEMPORAIRE
// ─────────────────────────────────────────────

const TEMP_DIR = process.env.TMPDIR || path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─────────────────────────────────────────────
//  🔧  UTILITAIRES
// ─────────────────────────────────────────────

function getFileSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
    } catch {
        return '? MB';
    }
}

function streamToFile(stream, filePath) {
    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filePath);
        stream.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        stream.on('error', reject);
    });
}

function sanitizeFilename(name) {
    return (name || 'file').replace(/[^\w\s-]/gi, '').trim().substring(0, 80) || 'file';
}

function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─────────────────────────────────────────────
//  🧠  CLASSE PRINCIPALE
// ─────────────────────────────────────────────

class GhostDownloader {
    constructor() {
        this.activeDownloads = new Map();
        console.log('[GHOST_DL] ⚡ Système de téléchargement initialisé');
    }

    // ── 🔍 RECHERCHE YOUTUBE ──────────────────

    async searchYouTube(query) {
        if (!yts) throw new Error('Module yt-search non installé (npm i yt-search)');

        const results = await yts(query);
        if (!results.videos.length) throw new Error('Aucun résultat YouTube pour : ' + query);

        const video = results.videos[0];
        return {
            title: video.title,
            url: video.url,
            duration: video.timestamp,
            thumbnail: video.thumbnail,
            author: video.author?.name || 'Inconnu',
            views: video.views,
        };
    }

    // ── 🎵 YOUTUBE → MP3 ─────────────────────

    async downloadYTMP3(url) {
        if (!ytdl) throw new Error('Module ytdl-core non installé (npm i @distube/ytdl-core)');

        const id = genId();
        const info = await ytdl.getInfo(url);
        const title = sanitizeFilename(info.videoDetails.title);
        const outputPath = path.join(TEMP_DIR, `${id}_${title}.mp3`);

        this.activeDownloads.set(id, { status: 'downloading', type: 'mp3' });

        try {
            const stream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
            await streamToFile(stream, outputPath);
            this.activeDownloads.set(id, { status: 'complete', path: outputPath });

            return {
                path: outputPath,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                size: getFileSize(outputPath),
                id,
            };
        } catch (err) {
            this.activeDownloads.delete(id);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            throw err;
        }
    }

    // ── 🎬 YOUTUBE → MP4 ─────────────────────

    async downloadYTMP4(url, quality = '720p') {
        if (!ytdl) throw new Error('Module ytdl-core non installé (npm i @distube/ytdl-core)');

        const id = genId();
        const info = await ytdl.getInfo(url);
        const title = sanitizeFilename(info.videoDetails.title);
        const outputPath = path.join(TEMP_DIR, `${id}_${title}.mp4`);

        this.activeDownloads.set(id, { status: 'downloading', type: 'mp4' });

        try {
            const stream = ytdl(url, { quality: 'highest', filter: 'videoandaudio' });
            await streamToFile(stream, outputPath);
            this.activeDownloads.set(id, { status: 'complete', path: outputPath });

            return {
                path: outputPath,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                size: getFileSize(outputPath),
                quality,
                id,
            };
        } catch (err) {
            this.activeDownloads.delete(id);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            throw err;
        }
    }

    // ── 📱 TIKTOK ─────────────────────────────

    async downloadTikTok(url) {
        // Essai API 1 : tikmate
        let videoUrl, title, author;

        try {
            const res = await axios.get(
                `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`,
                { timeout: 15_000 }
            );
            if (res.data?.videoUrl) {
                videoUrl = res.data.videoUrl;
                title = res.data.title || 'TikTok';
                author = res.data.author || 'Unknown';
            }
        } catch { /* fallback */ }

        // Fallback API 2 : tikwm
        if (!videoUrl) {
            try {
                const res = await axios.post(
                    'https://www.tikwm.com/api/',
                    new URLSearchParams({ url, hd: '1' }),
                    { timeout: 15_000 }
                );
                if (res.data?.data?.play) {
                    videoUrl = res.data.data.play;
                    title = res.data.data.title || 'TikTok';
                    author = res.data.data.author?.nickname || 'Unknown';
                }
            } catch { /* echec */ }
        }

        if (!videoUrl) throw new Error('Impossible de récupérer la vidéo TikTok (APIs indisponibles)');

        const id = genId();
        const outputPath = path.join(TEMP_DIR, `${id}_tiktok.mp4`);

        const videoRes = await axios({ method: 'get', url: videoUrl, responseType: 'stream', timeout: 30_000 });
        await streamToFile(videoRes.data, outputPath);

        return {
            path: outputPath,
            title,
            author,
            size: getFileSize(outputPath),
            id,
        };
    }

    // ── 📸 INSTAGRAM ──────────────────────────

    async downloadInstagram(url) {
        let mediaUrl, mediaType, mediaTitle;

        // API 1 : instavideosave
        try {
            const res = await axios.get(
                `https://api.instavideosave.net/api/v2/media?url=${encodeURIComponent(url)}`,
                { timeout: 15_000 }
            );
            if (res.data?.media?.[0]?.url) {
                mediaUrl = res.data.media[0].url;
                mediaType = res.data.media[0].type || 'video';
                mediaTitle = res.data.title || 'Instagram';
            }
        } catch { /* fallback */ }

        // Fallback API 2 : snapinsta
        if (!mediaUrl) {
            try {
                const res = await axios.post(
                    'https://snapinsta.app/action.php',
                    new URLSearchParams({ url }),
                    { timeout: 15_000 }
                );
                const match = res.data?.match?.(/href="(https:\/\/[^"]+\.mp4[^"]*)"/);
                if (match) { mediaUrl = match[1]; mediaType = 'video'; mediaTitle = 'Instagram'; }
            } catch { /* echec */ }
        }

        if (!mediaUrl) throw new Error('Impossible de récupérer le média Instagram (APIs indisponibles)');

        const id = genId();
        const ext = mediaType === 'video' ? 'mp4' : 'jpg';
        const outputPath = path.join(TEMP_DIR, `${id}_instagram.${ext}`);

        const mediaRes = await axios({ method: 'get', url: mediaUrl, responseType: 'stream', timeout: 30_000 });
        await streamToFile(mediaRes.data, outputPath);

        return {
            path: outputPath,
            title: mediaTitle,
            type: mediaType,
            size: getFileSize(outputPath),
            id,
        };
    }

    // ── 🧹 NETTOYAGE ──────────────────────────

    /**
     * Supprime les fichiers temporaires plus vieux que maxAge ms (défaut: 1h)
     */
    cleanupOldDownloads(maxAge = 3_600_000) {
        try {
            const files = fs.readdirSync(TEMP_DIR);
            let count = 0;

            for (const file of files) {
                const filePath = path.join(TEMP_DIR, file);
                try {
                    const stats = fs.statSync(filePath);
                    if (Date.now() - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                        count++;
                    }
                } catch { /* fichier déjà supprimé */ }
            }

            if (count > 0) console.log(`[GHOST_DL] 🧹 ${count} fichier(s) supprimé(s)`);
        } catch (err) {
            console.error('[GHOST_DL] Erreur nettoyage:', err.message);
        }
    }

    /**
     * Supprime un fichier temporaire spécifique après un délai.
     * @param {string} filePath
     * @param {number} delayMs  Délai en ms (défaut: 60s)
     */
    scheduleCleanup(filePath, delayMs = 60_000) {
        setTimeout(() => {
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch { /* non bloquant */ }
        }, delayMs);
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORT
// ─────────────────────────────────────────────

module.exports = GhostDownloader;