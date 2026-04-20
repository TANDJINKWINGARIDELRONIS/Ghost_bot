// ╔══════════════════════════════════════════════════════════════╗
// ║              🔊  TTS COMMAND  🔊                             ║
// ║     Texte → Audio avec choix de voix & multi-langues        ║
// ║     Usage : #tts <texte>                                     ║
// ║             #tts -m <texte>   → voix masculine              ║
// ║             #tts -f <texte>   → voix féminine               ║
// ║             #tts -l en <texte> → langue anglaise            ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const gTTS   = require('gtts');
const fs     = require('fs');
const path   = require('path');
const { exec } = require('child_process');
const util   = require('util');

const execAsync = util.promisify(exec);

// ─────────────────────────────────────────────
//  🌍  LANGUES SUPPORTÉES
// ─────────────────────────────────────────────

const LANGUAGES = {
    fr: 'fr',  es: 'es',  en: 'en',  de: 'de',
    it: 'it',  pt: 'pt',  ar: 'ar',  zh: 'zh',
    ja: 'ja',  ko: 'ko',  ru: 'ru',  hi: 'hi',
    nl: 'nl',  pl: 'pl',  tr: 'tr',  sv: 'sv',
};

const LANG_NAMES = {
    fr: 'Français', es: 'Espagnol', en: 'Anglais',  de: 'Allemand',
    it: 'Italien',  pt: 'Portugais', ar: 'Arabe',   zh: 'Chinois',
    ja: 'Japonais', ko: 'Coréen',   ru: 'Russe',    hi: 'Hindi',
    nl: 'Néerlandais', pl: 'Polonais', tr: 'Turc',  sv: 'Suédois',
};

// ─────────────────────────────────────────────
//  🎚️  PROFILS DE VOIX (pitch ffmpeg)
//  gTTS génère une voix féminine par défaut.
//  On utilise asetrate + atempo pour simuler
//  une voix masculine (pitch plus grave).
// ─────────────────────────────────────────────

const VOICE_PROFILES = {
    female: {
        label  : '👩 Féminine',
        // Voix originale de gTTS — pas de traitement
        filter : null
    },
    male: {
        label  : '👨 Masculine',
        // Réduit le pitch de ~20% pour simuler une voix grave
        // asetrate=38000 abaisse la fréquence, atempo compense la durée
        filter : 'asetrate=38000,atempo=1.25'
    }
};

// ─────────────────────────────────────────────
//  🔧  UTILITAIRE : PARSE DES ARGUMENTS
// ─────────────────────────────────────────────

/**
 * Parse les flags depuis le texte de commande.
 * Exemples :
 *   "#tts Bonjour"            → { voice: 'female', lang: 'fr', text: 'Bonjour' }
 *   "#tts -m Salut"           → { voice: 'male',   lang: 'fr', text: 'Salut' }
 *   "#tts -f -l en Hello"     → { voice: 'female', lang: 'en', text: 'Hello' }
 */
function parseArgs(rawText) {
    let voice = 'female'; // défaut
    let lang  = 'fr';     // défaut
    let text  = rawText.trim();

    // Détection voix
    if (/^-m\b/i.test(text)) {
        voice = 'male';
        text  = text.replace(/^-m\s*/i, '').trim();
    } else if (/^-f\b/i.test(text)) {
        voice = 'female';
        text  = text.replace(/^-f\s*/i, '').trim();
    }

    // Détection langue : -l <code>
    const langMatch = text.match(/^-l\s+([a-z]{2})\s+/i);
    if (langMatch) {
        const requestedLang = langMatch[1].toLowerCase();
        if (LANGUAGES[requestedLang]) {
            lang = requestedLang;
        }
        text = text.replace(langMatch[0], '').trim();
    }

    return { voice, lang, text };
}

// ─────────────────────────────────────────────
//  🎵  GÉNÉRATION AUDIO AVEC gTTS
// ─────────────────────────────────────────────

/**
 * Génère un fichier mp3 via gTTS (callback → Promise).
 */
function generateTTS(text, lang, outputPath) {
    return new Promise((resolve, reject) => {
        const gtts = new gTTS(text, lang);
        gtts.save(outputPath, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
}

/**
 * Applique un filtre ffmpeg pour modifier le pitch (voix masculine).
 * Retourne le chemin du fichier traité.
 */
async function applyVoiceFilter(inputPath, filter) {
    const outputPath = inputPath.replace('.mp3', '_processed.mp3');
    await execAsync(
        `ffmpeg -y -i "${inputPath}" -af "${filter}" "${outputPath}"`
    );
    // Supprime le fichier original non filtré
    try { fs.unlinkSync(inputPath); } catch {}
    return outputPath;
}

// ─────────────────────────────────────────────
//  🚀  COMMANDE PRINCIPALE
// ─────────────────────────────────────────────

async function ttsCommand(sock, chatId, rawText, message) {

    // ── Aide si pas de texte ────────────────────────────────────
    if (!rawText || !rawText.trim()) {
        return sock.sendMessage(chatId, {
            text:
                `🔊 *TEXT TO SPEECH — AIDE*\n\n` +
                `📖 *Usage :*\n` +
                `  • \`#tts <texte>\`           → voix féminine FR\n` +
                `  • \`#tts -m <texte>\`        → voix masculine\n` +
                `  • \`#tts -f <texte>\`        → voix féminine\n` +
                `  • \`#tts -l en <texte>\`     → langue anglaise\n` +
                `  • \`#tts -m -l es <texte>\`  → masculin + espagnol\n\n` +
                `🌍 *Langues dispo :* ${Object.entries(LANG_NAMES).map(([k, v]) => `\`${k}\` ${v}`).join(' • ')}`
        }, { quoted: message });
    }

    // ── Parsing des arguments ───────────────────────────────────
    const { voice, lang, text } = parseArgs(rawText);

    if (!text) {
        return sock.sendMessage(chatId, {
            text: '❌ *Texte vide.* Écris quelque chose après les options !'
        }, { quoted: message });
    }

    if (text.length > 500) {
        return sock.sendMessage(chatId, {
            text: `❌ *Texte trop long* (${text.length}/500 caractères). Raccourcis ton message.`
        }, { quoted: message });
    }

    const profile  = VOICE_PROFILES[voice];
    const langName = LANG_NAMES[lang] || lang.toUpperCase();

    // Confirmation de génération
    await sock.sendMessage(chatId, {
        text:
            `🎙️ *Génération audio en cours...*\n\n` +
            `${profile.label}  •  🌍 ${langName}`
    }, { quoted: message });

    // ── Génération du fichier audio ─────────────────────────────
    const tmpPath = path.join(__dirname, '../..', 'assets', `tts-${Date.now()}.mp3`);

    try {
        await generateTTS(text, lang, tmpPath);

        // Applique le filtre vocal si nécessaire (voix masculine)
        let finalPath = tmpPath;
        if (profile.filter) {
            try {
                finalPath = await applyVoiceFilter(tmpPath, profile.filter);
            } catch (ffmpegErr) {
                // ffmpeg non disponible → on envoie quand même l'audio brut
                console.warn('⚠️ [TTS] ffmpeg indisponible, voix non modifiée:', ffmpegErr.message);
                finalPath = tmpPath;
            }
        }

        // Envoi du message audio
        await sock.sendMessage(chatId, {
            audio   : { url: finalPath },
            mimetype: 'audio/mpeg',
            ptt     : false   // false = fichier audio | true = note vocale
        }, { quoted: message });

    } catch (err) {
        console.error('❌ [TTS] Erreur génération:', err.message);
        await sock.sendMessage(chatId, {
            text: `❌ *Erreur lors de la génération audio.*\n📋 Détail : ${err.message}`
        }, { quoted: message });
    } finally {
        // Nettoyage des fichiers temporaires
        for (const p of [tmpPath, tmpPath.replace('.mp3', '_processed.mp3')]) {
            try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
        }
    }
}

module.exports = ttsCommand;
