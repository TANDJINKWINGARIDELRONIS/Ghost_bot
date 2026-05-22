'use strict';

// ╔══════════════════════════════════════════════════════════════════╗
// ║       ⚡ GHOST COMMANDS — commands/datas/download.js            ║
// ║   Handler téléchargement : #play #ytmp3 #ytmp4 #tiktok #ig     ║
// ╚══════════════════════════════════════════════════════════════════╝

const GhostDownloader = require('../../lib/download.js');

const downloader = new GhostDownloader();

// Nettoyage automatique toutes les heures
setInterval(() => {
    downloader.cleanupOldDownloads();
}, 3_600_000);

// ─────────────────────────────────────────────
//  🛠️  UTILITAIRES INTERNES
// ─────────────────────────────────────────────

/** Réaction emoji sur un message */
async function react(sock, msg, emoji) {
    try {
        await sock.sendMessage(msg.key.remoteJid, {
            react: { text: emoji, key: msg.key },
        });
    } catch { /* non bloquant */ }
}

/** Vérifie si une URL est YouTube */
function isYouTubeUrl(url) {
    return url && (url.includes('youtube.com') || url.includes('youtu.be'));
}

/** Vérifie si une URL est TikTok */
function isTikTokUrl(url) {
    return url && (url.includes('tiktok.com') || url.includes('vm.tiktok.com'));
}

/** Vérifie si une URL est Instagram */
function isInstagramUrl(url) {
    return url && url.includes('instagram.com');
}

// ─────────────────────────────────────────────
//  🤖  HANDLER PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Gestionnaire des commandes de téléchargement.
 * À appeler depuis main.js dans le switch.
 *
 * @param {object} sock          - Socket Baileys
 * @param {object} msg           - Message WhatsApp
 * @param {string} currentPrefix - Préfixe actif (ex: '#')
 * @returns {Promise<boolean>}   - true si commande traitée
 */
async function handleDownloadCommand(sock, msg, currentPrefix = '#') {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    const rawText =
        msg.message?.conversation?.trim() ||
        msg.message?.extendedTextMessage?.text?.trim() ||
        msg.message?.imageMessage?.caption?.trim() ||
        '';

    if (!rawText) return false;

    // Normalisation du préfixe → toujours '#' en interne
    let text = rawText;
    if (currentPrefix !== '#' && text.startsWith(currentPrefix)) {
        text = '#' + text.slice(currentPrefix.length);
    }
    const lower = text.toLowerCase();

    // ── #play <titre> ──────────────────────────────────────────────
    if (lower.startsWith('#play')) {
        const query = text.slice(5).trim();

        if (!query) {
            await sock.sendMessage(jid, {
                text:
                    `🎵 *GHOST PLAY*\n\n` +
                    `*Usage :* \`#play <titre ou artiste>\`\n` +
                    `*Exemple :* \`#play Never Gonna Give You Up\``,
            }, { quoted: msg });
            return true;
        }

        await react(sock, msg, '🔍');
        await sock.sendMessage(jid, {
            text: `🔍 *Recherche en cours...*\n_${query}_`,
        }, { quoted: msg });

        try {
            const result = await downloader.searchYouTube(query);
            await sock.sendMessage(jid, {
                text: `⬇️ *Téléchargement...*\n🎵 ${result.title}`,
            }, { quoted: msg });

            const download = await downloader.downloadYTMP3(result.url);

            await sock.sendMessage(jid, {
                audio: { url: download.path },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: result.title,
                        body: `🎵 ${result.author} | ⏱️ ${result.duration} | 👁️ ${result.views}`,
                        thumbnailUrl: result.thumbnail,
                        sourceUrl: result.url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: msg });

            downloader.scheduleCleanup(download.path, 60_000);
            console.log(`[GHOST_PLAY] ${sender} → ${result.title}`);

        } catch (error) {
            console.error('[GHOST_PLAY] Erreur:', error.message);
            await react(sock, msg, '❌');
            await sock.sendMessage(jid, {
                text: `❌ *Erreur #play*\n\n📋 ${error.message}`,
            }, { quoted: msg });
        }

        return true;
    }

    // ── #ytmp3 <url> ───────────────────────────────────────────────
    if (lower.startsWith('#ytmp3')) {
        const url = text.slice(6).trim();

        if (!url || !isYouTubeUrl(url)) {
            await sock.sendMessage(jid, {
                text:
                    `🎵 *YOUTUBE → MP3*\n\n` +
                    `*Usage :* \`#ytmp3 <url YouTube>\`\n` +
                    `*Exemple :* \`#ytmp3 https://youtube.com/watch?v=...\``,
            }, { quoted: msg });
            return true;
        }

        await react(sock, msg, '⬇️');
        await sock.sendMessage(jid, { text: '⬇️ *Téléchargement MP3 en cours...*' }, { quoted: msg });

        try {
            const download = await downloader.downloadYTMP3(url);

            await sock.sendMessage(jid, {
                audio: { url: download.path },
                mimetype: 'audio/mpeg',
                ptt: false,
                contextInfo: {
                    externalAdReply: {
                        title: download.title,
                        body: `⏱️ ${download.duration}s | 📦 ${download.size}`,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: msg });

            downloader.scheduleCleanup(download.path, 60_000);
            console.log(`[GHOST_YTMP3] ${sender} → ${download.title}`);

        } catch (error) {
            console.error('[GHOST_YTMP3] Erreur:', error.message);
            await react(sock, msg, '❌');
            await sock.sendMessage(jid, {
                text: `❌ *Erreur #ytmp3*\n\n📋 ${error.message}`,
            }, { quoted: msg });
        }

        return true;
    }

    // ── #ytmp4 <url> [qualité] ─────────────────────────────────────
    if (lower.startsWith('#ytmp4')) {
        const parts = text.slice(6).trim().split(/\s+/);
        const url = parts[0];
        const quality = parts[1] || '720p';

        if (!url || !isYouTubeUrl(url)) {
            await sock.sendMessage(jid, {
                text:
                    `🎬 *YOUTUBE → MP4*\n\n` +
                    `*Usage :* \`#ytmp4 <url YouTube> [qualité]\`\n` +
                    `*Exemple :* \`#ytmp4 https://youtube.com/watch?v=... 720p\`\n\n` +
                    `Qualités disponibles : \`360p\` \`480p\` \`720p\` \`1080p\``,
            }, { quoted: msg });
            return true;
        }

        await react(sock, msg, '⬇️');
        await sock.sendMessage(jid, {
            text: `⬇️ *Téléchargement MP4 (${quality}) en cours...*`,
        }, { quoted: msg });

        try {
            const download = await downloader.downloadYTMP4(url, quality);

            await sock.sendMessage(jid, {
                video: { url: download.path },
                caption: `🎬 *${download.title}*\n⏱️ ${download.duration}s | 📦 ${download.size} | 📐 ${quality}`,
                mimetype: 'video/mp4',
                contextInfo: {
                    externalAdReply: {
                        title: download.title,
                        sourceUrl: url,
                        mediaType: 1,
                        renderLargerThumbnail: true,
                    },
                },
            }, { quoted: msg });

            downloader.scheduleCleanup(download.path, 120_000);
            console.log(`[GHOST_YTMP4] ${sender} → ${download.title}`);

        } catch (error) {
            console.error('[GHOST_YTMP4] Erreur:', error.message);
            await react(sock, msg, '❌');
            await sock.sendMessage(jid, {
                text: `❌ *Erreur #ytmp4*\n\n📋 ${error.message}`,
            }, { quoted: msg });
        }

        return true;
    }

    // ── #tiktok <url> ──────────────────────────────────────────────
    if (lower.startsWith('#tiktok')) {
        const url = text.slice(7).trim();

        if (!url || !isTikTokUrl(url)) {
            await sock.sendMessage(jid, {
                text:
                    `📱 *TIKTOK DOWNLOADER*\n\n` +
                    `*Usage :* \`#tiktok <url TikTok>\`\n` +
                    `*Exemple :* \`#tiktok https://vm.tiktok.com/...\``,
            }, { quoted: msg });
            return true;
        }

        await react(sock, msg, '📱');
        await sock.sendMessage(jid, { text: '📱 *Téléchargement TikTok en cours...*' }, { quoted: msg });

        try {
            const download = await downloader.downloadTikTok(url);

            await sock.sendMessage(jid, {
                video: { url: download.path },
                caption: `📱 *${download.title}*\n👤 ${download.author} | 📦 ${download.size}`,
                mimetype: 'video/mp4',
            }, { quoted: msg });

            downloader.scheduleCleanup(download.path, 60_000);
            console.log(`[GHOST_TIKTOK] ${sender} → ${download.title}`);

        } catch (error) {
            console.error('[GHOST_TIKTOK] Erreur:', error.message);
            await react(sock, msg, '❌');
            await sock.sendMessage(jid, {
                text: `❌ *Erreur #tiktok*\n\n📋 ${error.message}`,
            }, { quoted: msg });
        }

        return true;
    }

    // ── #ig <url> ──────────────────────────────────────────────────
    if (lower.startsWith('#ig')) {
        const url = text.slice(3).trim();

        if (!url || !isInstagramUrl(url)) {
            await sock.sendMessage(jid, {
                text:
                    `📸 *INSTAGRAM DOWNLOADER*\n\n` +
                    `*Usage :* \`#ig <url Instagram>\`\n` +
                    `*Exemple :* \`#ig https://www.instagram.com/p/...\``,
            }, { quoted: msg });
            return true;
        }

        await react(sock, msg, '📸');
        await sock.sendMessage(jid, { text: '📸 *Téléchargement Instagram en cours...*' }, { quoted: msg });

        try {
            const download = await downloader.downloadInstagram(url);

            if (download.type === 'video') {
                await sock.sendMessage(jid, {
                    video: { url: download.path },
                    caption: `📸 *${download.title}*\n📦 ${download.size}`,
                    mimetype: 'video/mp4',
                }, { quoted: msg });
            } else {
                await sock.sendMessage(jid, {
                    image: { url: download.path },
                    caption: `📸 *${download.title}*\n📦 ${download.size}`,
                }, { quoted: msg });
            }

            downloader.scheduleCleanup(download.path, 60_000);
            console.log(`[GHOST_IG] ${sender} → ${download.title}`);

        } catch (error) {
            console.error('[GHOST_IG] Erreur:', error.message);
            await react(sock, msg, '❌');
            await sock.sendMessage(jid, {
                text: `❌ *Erreur #ig*\n\n📋 ${error.message}`,
            }, { quoted: msg });
        }

        return true;
    }

    return false;
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    handleDownloadCommand,
    downloader,
};