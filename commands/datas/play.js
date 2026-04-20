// ╔══════════════════════════════════════════════════════════════╗
// ║              🎵  MUSIC COMMAND  🎵                           ║
// ║     Téléchargement audio YouTube via yt-dlp                  ║
// ║     Usage : #play <titre> [low|medium|high|max]              ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

process.env.YTDL_NO_UPDATE = '1';
require('dns').setDefaultResultOrder('ipv4first');

const { spawn } = require('child_process');
const yts  = require('yt-search');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ─────────────────────────────────────────────
//  📁  CACHE — évite de re-télécharger
// ─────────────────────────────────────────────

const CACHE_DIR = path.join(__dirname, '../../cache/music');
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
//  🍪  COOKIES YOUTUBE (optionnel)
//  Si tu as une variable YT_COOKIES dans api.env
// ─────────────────────────────────────────────

const COOKIES_PATH = path.join(os.tmpdir(), 'yt-cookies.txt');

function loadCookies() {
    try {
        const envPath = path.join(process.cwd(), 'api.env');
        if (!fs.existsSync(envPath)) return false;
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            if (line.trim().startsWith('YT_COOKIES=')) {
                const cookies = line.trim().split('=').slice(1).join('=').trim();
                if (cookies) {
                    fs.writeFileSync(COOKIES_PATH, cookies);
                    return true;
                }
            }
        }
        return false;
    } catch {
        return false;
    }
}

const HAS_COOKIES = loadCookies();

// ─────────────────────────────────────────────
//  🎚️  QUALITÉ AUDIO
// ─────────────────────────────────────────────

function getAudioQuality(arg) {
    switch (arg?.toLowerCase()) {
        case '64':
        case 'low':    return { bitrate: '64k',  label: '64 kbps',  emoji: '🔈' };
        case '192':
        case 'high':   return { bitrate: '192k', label: '192 kbps', emoji: '🔊' };
        case '320':
        case 'max':    return { bitrate: '320k', label: '320 kbps', emoji: '🎶' };
        case '128':
        case 'medium':
        default:       return { bitrate: '128k', label: '128 kbps', emoji: '🔉' };
    }
}

const QUALITY_KEYS = ['low', 'medium', 'high', 'max', '64', '128', '192', '320'];

// ─────────────────────────────────────────────
//  🕐  FORMATAGE DURÉE
// ─────────────────────────────────────────────

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
}

// ─────────────────────────────────────────────
//  📦  TAILLE FICHIER
// ─────────────────────────────────────────────

function formatSize(bytes) {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

// ─────────────────────────────────────────────
//  ⬇️  TÉLÉCHARGEMENT VIA yt-dlp
// ─────────────────────────────────────────────

function downloadAudio(videoUrl, outputPath, quality) {
    return new Promise((resolve, reject) => {
        const args = [
            '-f', 'ba',
            '--extract-audio',
            '--audio-format', 'mp3',
            '--audio-quality', quality.bitrate,
            '--no-playlist',
            '--sleep-interval', '2',
            '--max-sleep-interval', '5',
            '--concurrent-fragments', '1',
            '--user-agent', 'com.google.android.youtube/19.09.37 (Linux; Android 14)',
            '--add-header', 'X-Youtube-Client-Name:3',
            '--add-header', 'X-Youtube-Client-Version:19.09.37',
            '-o', outputPath,
        ];

        // Ajoute les cookies si disponibles
        if (HAS_COOKIES && fs.existsSync(COOKIES_PATH)) {
            args.unshift('--cookies', COOKIES_PATH);
        }

        args.push(videoUrl);

        const yt = spawn('yt-dlp', args);

        yt.stderr.on('data', d => {
            const line = d.toString().trim();
            if (line) console.log('[yt-dlp]', line);
        });

        yt.on('close', code => {
            if (code === 0 && fs.existsSync(outputPath)) {
                resolve();
            } else {
                reject(new Error(`yt-dlp exited with code ${code}`));
            }
        });

        yt.on('error', reject);
    });
}

// ─────────────────────────────────────────────
//  🚀  COMMANDE PRINCIPALE
// ─────────────────────────────────────────────

async function playCommand(sock, chatId, message) {
    try {
        const text =
            message.message?.conversation?.trim() ||
            message.message?.extendedTextMessage?.text?.trim() ||
            '';

        const args = text.split(/\s+/).slice(1);

        if (!args.length) {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       🎵  *MUSIC DOWNLOADER*      ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `📖 *Usage :*\n` +
                    `  \`#play <titre>\`\n` +
                    `  \`#play <titre> [qualité]\`\n\n` +
                    `🎚️ *Qualités disponibles :*\n` +
                    `  🔈 \`low\`    → 64 kbps\n` +
                    `  🔉 \`medium\` → 128 kbps _(défaut)_\n` +
                    `  🔊 \`high\`   → 192 kbps\n` +
                    `  🎶 \`max\`    → 320 kbps\n\n` +
                    `💡 *Exemple :*\n` +
                    `  \`#play Afrobeat high\``
            }, { quoted: message });
        }

        // ── Détection de la qualité ─────────────────────────────
        const lastArg = args[args.length - 1].toLowerCase();
        const quality = getAudioQuality(lastArg);
        const query   = QUALITY_KEYS.includes(lastArg)
            ? args.slice(0, -1).join(' ')
            : args.join(' ');

        if (!query.trim()) {
            return sock.sendMessage(chatId, {
                text: '❌ *Titre manquant.* Précise une chanson à rechercher.'
            }, { quoted: message });
        }

        // ── Recherche YouTube ───────────────────────────────────
        const search = await yts(query);
        if (!search.videos?.length) {
            return sock.sendMessage(chatId, {
                text: `🔍 Aucun résultat pour *"${query}"*. Essaie un autre titre.`
            }, { quoted: message });
        }

        const video     = search.videos[0];
        const cacheFile = path.join(CACHE_DIR, `${video.videoId}-${quality.bitrate}.mp3`);

        // ── Message de confirmation ─────────────────────────────
        await sock.sendMessage(chatId, {
            image  : { url: video.thumbnail },
            caption:
                `╔══════════════════════════════════╗\n` +
                `║       🎵  *MUSIC DOWNLOADER*      ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🎵 *${video.title}*\n\n` +
                `👤 *Chaîne :*   ${video.author?.name || 'Inconnue'}\n` +
                `⏱️ *Durée :*    ${formatDuration(video.seconds)}\n` +
                `${quality.emoji} *Qualité :*  ${quality.label}\n` +
                `👁️ *Vues :*     ${video.views?.toLocaleString() || '—'}\n\n` +
                `⬇️ _Téléchargement en cours..._`
        }, { quoted: message });

        // ── Cache hit — fichier déjà téléchargé ─────────────────
        if (fs.existsSync(cacheFile)) {
            console.log(`✅ [MUSIC] Cache hit : ${video.videoId}`);
            const audio = fs.readFileSync(cacheFile);
            const size  = formatSize(audio.length);

            return sock.sendMessage(chatId, {
                audio   : audio,
                mimetype: 'audio/mpeg',
                fileName: `${video.title}.mp3`,
                caption :
                    `✅ *${video.title}*\n` +
                    `📦 Taille : ${size}  •  ${quality.emoji} ${quality.label}`
            }, { quoted: message });
        }

        // ── Téléchargement ──────────────────────────────────────
        const tmpFile = path.join(os.tmpdir(), `yt-${Date.now()}.mp3`);

        try {
            await downloadAudio(video.url, tmpFile, quality);
        } catch (dlErr) {
            console.error('❌ [MUSIC] yt-dlp error:', dlErr.message);
            return sock.sendMessage(chatId, {
                text:
                    `❌ *Échec du téléchargement*\n\n` +
                    `📋 Raison : ${dlErr.message}\n\n` +
                    `💡 Essaie avec un autre titre ou une qualité plus basse.`
            }, { quoted: message });
        }

        // ── Mise en cache & envoi ───────────────────────────────
        fs.renameSync(tmpFile, cacheFile);
        const audio = fs.readFileSync(cacheFile);
        const size  = formatSize(audio.length);

        await sock.sendMessage(chatId, {
            audio   : audio,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
        }, { quoted: message });

        // Confirmation finale
        await sock.sendMessage(chatId, {
            text:
                `✅ *Téléchargement terminé !*\n\n` +
                `🎵 *${video.title}*\n` +
                `📦 *Taille :*   ${size}\n` +
                `${quality.emoji} *Qualité :*  ${quality.label}\n` +
                `⏱️ *Durée :*    ${formatDuration(video.seconds)}`
        }, { quoted: message });

    } catch (err) {
        console.error('❌ [MUSIC] playCommand error:', err.message);
        await sock.sendMessage(chatId, {
            text:
                `⚠️ *Erreur système*\n\n` +
                `📋 ${err.message}\n\n` +
                `💡 Réessaie dans quelques instants.`
        }, { quoted: message });
    }
}

module.exports = playCommand;
