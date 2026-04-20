// ╔══════════════════════════════════════════════════════════════╗
// ║              🛡️  ANTIDELETE MODULE  🛡️                       ║
// ║         Détection & récupération des messages supprimés      ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

const fs   = require('fs');
const path = require('path');
const { tmpdir }                     = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile }                  = require('fs/promises');

// ─────────────────────────────────────────────
//  📦  CONSTANTES & INITIALISATION
// ─────────────────────────────────────────────

const messageStore   = new Map();
const CONFIG_PATH    = path.join(__dirname, '../../data/antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../../tmp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────
//  🧹  NETTOYAGE AUTOMATIQUE DU DOSSIER TMP
// ─────────────────────────────────────────────

const getFolderSizeInMB = (folderPath) => {
    try {
        return fs.readdirSync(folderPath).reduce((total, file) => {
            const fp = path.join(folderPath, file);
            return total + (fs.statSync(fp).isFile() ? fs.statSync(fp).size : 0);
        }, 0) / (1024 * 1024);
    } catch {
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        const sizeMB = getFolderSizeInMB(TEMP_MEDIA_DIR);
        if (sizeMB > 200) {
            fs.readdirSync(TEMP_MEDIA_DIR).forEach(file => {
                try { fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file)); } catch {}
            });
            console.log(`🧹 [ANTIDELETE] Tmp vidé (${sizeMB.toFixed(1)} Mo)`);
        }
    } catch (err) {
        console.error('❌ [ANTIDELETE] Erreur nettoyage:', err.message);
    }
};

setInterval(cleanTempFolderIfLarge, 60 * 1000);

// ─────────────────────────────────────────────
//  ⚙️  CONFIGURATION
//  destination      : 'inbox' | 'chat'
//  protectedNumbers : ['2376XXXXXXXX', ...]
// ─────────────────────────────────────────────

function loadConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return {
            enabled         : false,
            destination     : 'inbox',
            protectedNumbers: []
        };
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH));
        if (!data.destination)      data.destination       = 'inbox';
        if (!data.protectedNumbers) data.protectedNumbers  = [];
        return data;
    } catch {
        return { enabled: false, destination: 'inbox', protectedNumbers: [] };
    }
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {
        console.error('❌ [ANTIDELETE] Erreur sauvegarde:', err.message);
    }
}

// ─────────────────────────────────────────────
//  🔧  TÉLÉCHARGEMENT MÉDIA → BUFFER
// ─────────────────────────────────────────────

async function downloadMediaAsBuffer(mediaMessage, mediaType) {
    const stream = await downloadContentFromMessage(mediaMessage, mediaType);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

// ─────────────────────────────────────────────
//  🛠️  COMMANDE #antidelete
// ─────────────────────────────────────────────

const isOwnerOrSudo = require('../../lib/isOwner');

async function handleAntideleteCommand(sock, chatId, message, match) {
    const senderId = message.key.participant || message.key.remoteJid;
    const isOwner  = await isOwnerOrSudo(senderId, sock, chatId);

    if (!message.key.fromMe && !isOwner) {
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🛡️  *ANTIDELETE*            ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🚫 *Accès refusé*\n` +
                `Cette commande est réservée au propriétaire.`
        }, { quoted: message });
    }

    const config = loadConfig();
    const args   = match?.trim().split(/\s+/) || [];
    const cmd    = args[0]?.toLowerCase();

    // ── Pas d'argument → menu ───────────────────────────────────
    if (!cmd) {
        const destLabel     = config.destination === 'chat'
            ? '💬 Dans le chat d\'origine'
            : '📩 Dans ma boîte inbox';
        const protectedList = config.protectedNumbers.length > 0
            ? config.protectedNumbers.map(n => `  • \`${n}\``).join('\n')
            : '  _Aucun numéro protégé_';

        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🛡️  *ANTIDELETE CONFIG*     ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `📊 *État actuel :*\n` +
                `  ${config.enabled ? '✅' : '❌'} Antidelete   : *${config.enabled ? 'Activé' : 'Désactivé'}*\n` +
                `  📍 Destination : *${destLabel}*\n\n` +
                `🔒 *Numéros protégés :*\n${protectedList}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `📖 *Commandes :*\n\n` +
                `  \`#antidelete on\`               → Activer\n` +
                `  \`#antidelete off\`              → Désactiver\n` +
                `  \`#antidelete dest inbox\`       → Recevoir dans ta boîte\n` +
                `  \`#antidelete dest chat\`        → Recevoir dans le chat\n` +
                `  \`#antidelete protect <num>\`    → Protéger un numéro\n` +
                `  \`#antidelete unprotect <num>\`  → Retirer la protection`
        }, { quoted: message });
    }

    // ── on / off ────────────────────────────────────────────────
    if (cmd === 'on' || cmd === 'off') {
        config.enabled = cmd === 'on';
        saveConfig(config);
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🛡️  *ANTIDELETE*            ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `${config.enabled ? '✅' : '❌'} *Antidelete ${config.enabled ? 'activé' : 'désactivé'} !*`
        }, { quoted: message });
    }

    // ── dest inbox / chat ───────────────────────────────────────
    if (cmd === 'dest') {
        const dest = args[1]?.toLowerCase();
        if (dest !== 'inbox' && dest !== 'chat') {
            return sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       🛡️  *ANTIDELETE*            ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `⚠️ *Destination invalide*\n\n` +
                    `📖 Usage :\n` +
                    `  \`#antidelete dest inbox\` → Dans ta boîte\n` +
                    `  \`#antidelete dest chat\`  → Dans le chat d'origine`
            }, { quoted: message });
        }
        config.destination = dest;
        saveConfig(config);
        const label = dest === 'chat'
            ? '💬 dans le chat d\'origine'
            : '📩 dans ta boîte inbox';
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🛡️  *ANTIDELETE*            ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `✅ *Destination mise à jour !*\n\n` +
                `📍 Les messages supprimés seront\n` +
                `   envoyés ${label}.`
        }, { quoted: message });
    }

    // ── protect <numéro> ────────────────────────────────────────
    if (cmd === 'protect') {
        const num = args[1]?.replace(/[^0-9]/g, '');
        if (!num) {
            return sock.sendMessage(chatId, {
                text:
                    `⚠️ *Usage :* \`#antidelete protect 2376XXXXXXXX\`\n` +
                    `_(Sans espaces ni +)_`
            }, { quoted: message });
        }
        if (config.protectedNumbers.includes(num)) {
            return sock.sendMessage(chatId, {
                text: `ℹ️ Le numéro \`${num}\` est déjà protégé.`
            }, { quoted: message });
        }
        config.protectedNumbers.push(num);
        saveConfig(config);
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🔒  *PROTECTION ACTIVÉE*    ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `✅ *Numéro protégé :* \`${num}\`\n\n` +
                `Les suppressions de ce contact\n` +
                `ne seront pas interceptées.`
        }, { quoted: message });
    }

    // ── unprotect <numéro> ──────────────────────────────────────
    if (cmd === 'unprotect') {
        const num = args[1]?.replace(/[^0-9]/g, '');
        if (!num) {
            return sock.sendMessage(chatId, {
                text: `⚠️ *Usage :* \`#antidelete unprotect 2376XXXXXXXX\``
            }, { quoted: message });
        }
        const idx = config.protectedNumbers.indexOf(num);
        if (idx === -1) {
            return sock.sendMessage(chatId, {
                text: `ℹ️ Le numéro \`${num}\` n'est pas dans la liste protégée.`
            }, { quoted: message });
        }
        config.protectedNumbers.splice(idx, 1);
        saveConfig(config);
        return sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🔓  *PROTECTION RETIRÉE*    ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `✅ *Numéro retiré :* \`${num}\``
        }, { quoted: message });
    }

    // ── Commande inconnue ───────────────────────────────────────
    return sock.sendMessage(chatId, {
        text:
            `⚠️ *Commande invalide :* \`${match}\`\n\n` +
            `Tape \`#antidelete\` pour voir les options.`
    }, { quoted: message });
}

// ─────────────────────────────────────────────
//  💾  STOCKAGE DES MESSAGES ENTRANTS
// ─────────────────────────────────────────────

async function storeMessage(sock, message) {
    try {
        const config = loadConfig();
        if (!config.enabled)  return;
        if (!message.key?.id) return;

        const messageId = message.key.id;

        // ✅ FIX — sender correct selon direction du message
        // fromMe = true  → message envoyé par moi à quelqu'un
        // fromMe = false → message reçu de quelqu'un
        const fromMe = message.key.fromMe || false;
        const sender = fromMe
            ? (message.key.remoteJid)                           // destinataire
            : (message.key.participant || message.key.remoteJid); // expéditeur réel

        // ── Ignore messages du proprio et numéros protégés ───────
        const ownerNum  = sock.user?.id?.split(':')[0] || '';
        const senderNum = sender.split('@')[0].replace(/[^0-9]/g, '');

        // ✅ FIX — ne pas bloquer le stockage des messages envoyés par owner
        // On stocke TOUS les messages, mais on marquera fromMe pour l'affichage
        if (!fromMe && (senderNum === ownerNum || config.protectedNumbers.includes(senderNum))) return;

        let content    = '';
        let mediaType  = '';
        let mediaPath  = '';
        let isViewOnce = false;

        const viewOnceContainer =
            message.message?.viewOnceMessageV2?.message ||
            message.message?.viewOnceMessage?.message;

        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content   = viewOnceContainer.imageMessage.caption || '';
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                const buf = await downloadMediaAsBuffer(viewOnceContainer.imageMessage, 'image');
                await writeFile(mediaPath, buf);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content   = viewOnceContainer.videoMessage.caption || '';
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                const buf = await downloadMediaAsBuffer(viewOnceContainer.videoMessage, 'video');
                await writeFile(mediaPath, buf);
                isViewOnce = true;
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content   = message.message.imageMessage.caption || '';
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            const buf = await downloadMediaAsBuffer(message.message.imageMessage, 'image');
            await writeFile(mediaPath, buf);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            const buf = await downloadMediaAsBuffer(message.message.stickerMessage, 'sticker');
            await writeFile(mediaPath, buf);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content   = message.message.videoMessage.caption || '';
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            const buf = await downloadMediaAsBuffer(message.message.videoMessage, 'video');
            await writeFile(mediaPath, buf);
        } else if (message.message?.audioMessage) {
            mediaType  = 'audio';
            const mime = message.message.audioMessage.mimetype || '';
            const ext  = mime.includes('ogg') ? 'ogg' : 'mp3';
            mediaPath  = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
            const buf  = await downloadMediaAsBuffer(message.message.audioMessage, 'audio');
            await writeFile(mediaPath, buf);
        }

        // ✅ FIX — on stocke fromMe pour l'affichage correct
        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            fromMe,
            chatId   : message.key.remoteJid,
            group    : message.key.remoteJid.endsWith('@g.us') ? message.key.remoteJid : null,
            timestamp: new Date().toISOString()
        });

        // ── Anti-ViewOnce ─────────────────────────────────────────
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const ownerJid   = sock.user.id.split(':')[0] + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const opts = {
                    caption : `👁️ *Anti-ViewOnce — ${mediaType}*\n📤 De : @${senderName}`,
                    mentions: [sender]
                };
                if (mediaType === 'image') {
                    await sock.sendMessage(ownerJid, { image: { url: mediaPath }, ...opts });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(ownerJid, { video: { url: mediaPath }, ...opts });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) {
                console.error('⚠️ [ANTIDELETE] ViewOnce error:', e.message);
            }
        }

    } catch (err) {
        console.error('❌ [ANTIDELETE] storeMessage error:', err.message);
    }
}

// ─────────────────────────────────────────────
//  🗑️  GESTION DES SUPPRESSIONS
// ─────────────────────────────────────────────

async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant
                       || revocationMessage.key.participant
                       || revocationMessage.key.remoteJid;

        const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const ownerNum = sock.user.id.split(':')[0];

        // ✅ FIX — détection correcte si c'est l'owner qui supprime
        const deletedByNum      = deletedBy.split('@')[0].replace(/[^0-9]/g, '');
        const isDeletedByOwner  =
            deletedBy.includes(sock.user.id) ||
            deletedBy === ownerJid           ||
            deletedByNum === ownerNum        ||
            config.protectedNumbers.includes(deletedByNum);

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender     = original.sender;
        const senderNum  = sender.split('@')[0].replace(/[^0-9]/g, '');
        const senderName = sender.split('@')[0];
        const fromMe     = original.fromMe || false;

        // ✅ FIX — si c'est un message que j'ai envoyé ET que je supprime → ignore
        if (isDeletedByOwner && fromMe) return;

        // ── Ignore si expéditeur protégé (message reçu) ──────────
        if (!fromMe && (senderNum === ownerNum || config.protectedNumbers.includes(senderNum))) return;

        const groupName = original.group
            ? (await sock.groupMetadata(original.group).catch(() => ({ subject: 'Groupe inconnu' }))).subject
            : '';

        const time = new Date().toLocaleString('fr-FR', {
            timeZone: 'Africa/Douala',
            hour12  : false,
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            day : '2-digit', month : '2-digit', year  : 'numeric'
        });

        // ── Destination : inbox ou chat d'origine ─────────────────
        const destination = config.destination === 'chat'
            ? original.chatId
            : ownerJid;

        // ✅ FIX — affichage correct selon qui a supprimé et direction
        const whoDeleted = isDeletedByOwner
            ? '👑 Toi (owner)'
            : `@${deletedBy.split('@')[0]}`;

        const direction = fromMe
            ? `📤 *Envoyé à    :*`
            : `📥 *Reçu de     :*`;

        // ── Rapport texte ─────────────────────────────────────────
        let text =
            `╔══════════════════════════════════╗\n` +
            `║   🔰  *ANTIDELETE RAPPORT*  🔰   ║\n` +
            `╚══════════════════════════════════╝\n\n` +
            `🗑️ *Supprimé par :* ${whoDeleted}\n` +
            `${direction} @${senderName}\n` +
            `📱 *Numéro       :* ${sender}\n` +
            `🕒 *Heure        :* ${time}\n`;

        if (groupName)        text += `👥 *Groupe       :* ${groupName}\n`;
        if (original.content) text += `\n💬 *Message supprimé :*\n${original.content}`;

        await sock.sendMessage(destination, {
            text,
            mentions: [deletedBy, sender]
        });

        // ── Envoi du média ────────────────────────────────────────
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaOptions = {
                caption  : `📎 *Média supprimé — ${original.mediaType}*\n👤 De : @${senderName}`,
                mentions : [sender]
            };

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(destination, {
                            image: { url: original.mediaPath }, ...mediaOptions
                        });
                        break;
                    case 'sticker':
                        await sock.sendMessage(destination, {
                            sticker: { url: original.mediaPath }
                        });
                        break;
                    case 'video':
                        await sock.sendMessage(destination, {
                            video: { url: original.mediaPath }, ...mediaOptions
                        });
                        break;
                    case 'audio':
                        await sock.sendMessage(destination, {
                            audio   : { url: original.mediaPath },
                            mimetype: 'audio/mpeg',
                            ptt     : false
                        });
                        break;
                    default:
                        console.warn(`⚠️ [ANTIDELETE] Type inconnu : ${original.mediaType}`);
                }
            } catch (err) {
                await sock.sendMessage(ownerJid, {
                    text: `⚠️ *Erreur envoi média :* ${err.message}`
                });
            }

            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('❌ [ANTIDELETE] handleMessageRevocation error:', err.message);
    }
}

// ─────────────────────────────────────────────
//  📤  EXPORTS
// ─────────────────────────────────────────────

module.exports = {
    handleAntideleteCommand,
    handleMessageRevocation,
    storeMessage
};
