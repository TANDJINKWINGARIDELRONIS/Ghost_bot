const fs   = require('fs');
const path = require('path');
const isOwnerOrSudo = require('../../lib/isOwner');

const configPath = path.join(__dirname, '../../data/autoStatus.json');

if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify({ 
        enabled   : false, 
        reactOn   : false,
        downloadOn: false
    }));
}

function getRealJid(msg) {
    return (
        msg.key?.remoteJidAlt ||
        msg.key?.participantAlt ||
        msg.key?.participant ||
        msg.key?.remoteJid
    );
}

// ─────────────────────────────────────────────
//  ⚙️  COMMANDE #autostatus
// ─────────────────────────────────────────────

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner  = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       👁️  *AUTO STATUS*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `🚫 *Accès refusé*\n` +
                    `Cette commande est réservée au propriétaire.`
            }, { quoted: msg });
            return;
        }

        let config = JSON.parse(fs.readFileSync(configPath));

        // ── Affichage du menu ───────────────────────────────────
        if (!args || args.length === 0) {
            const statusEmoji = config.enabled    ? '✅' : '❌';
            const reactEmoji  = config.reactOn    ? '✅' : '❌';
            const dlEmoji     = config.downloadOn ? '✅' : '❌';
            const statusLabel = config.enabled    ? 'Activé'    : 'Désactivé';
            const reactLabel  = config.reactOn    ? 'Activé'    : 'Désactivé';
            const dlLabel     = config.downloadOn ? 'Activé'    : 'Désactivé';

            await sock.sendMessage(chatId, { 
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       👁️  *AUTO STATUS*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `📊 *État actuel :*\n` +
                    `  ${statusEmoji} Vue automatique  : *${statusLabel}*\n` +
                    `  ${reactEmoji} Réactions        : *${reactLabel}*\n` +
                    `  ${dlEmoji} Téléchargement   : *${dlLabel}*\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📖 *Commandes disponibles :*\n\n` +
                    `  \`#autostatus on\`            → Activer la vue\n` +
                    `  \`#autostatus off\`           → Désactiver la vue\n` +
                    `  \`#autostatus react on\`      → Activer les réactions\n` +
                    `  \`#autostatus react off\`     → Désactiver les réactions\n` +
                    `  \`#autostatus download on\`   → Activer le download\n` +
                    `  \`#autostatus download off\`  → Désactiver le download`
            }, { quoted: msg });
            return;
        }

        const command = args[0].toLowerCase();
        
        // ── Vue auto on/off ─────────────────────────────────────
        if (command === 'on') {
            config.enabled = true;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       👁️  *AUTO STATUS*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `✅ *Vue automatique activée !*\n\n` +
                    `Le bot consultera désormais automatiquement\n` +
                    `tous les statuts de tes contacts. 👀`
            }, { quoted: msg });

        } else if (command === 'off') {
            config.enabled = false;
            fs.writeFileSync(configPath, JSON.stringify(config));
            await sock.sendMessage(chatId, { 
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       👁️  *AUTO STATUS*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `❌ *Vue automatique désactivée !*\n\n` +
                    `Le bot ne consultera plus les statuts\n` +
                    `automatiquement.`
            }, { quoted: msg });

        // ── Réactions on/off ────────────────────────────────────
        } else if (command === 'react') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       💚  *RÉACTIONS STATUTS*     ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `⚠️ *Argument manquant*\n\n` +
                        `📖 Usage : \`#autostatus react on/off\``
                }, { quoted: msg });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();

            if (reactCommand === 'on') {
                config.reactOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       💚  *RÉACTIONS STATUTS*     ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `✅ *Réactions activées !*\n\n` +
                        `Le bot réagira désormais avec 💚\n` +
                        `aux mises à jour de statut.`
                }, { quoted: msg });

            } else if (reactCommand === 'off') {
                config.reactOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       💚  *RÉACTIONS STATUTS*     ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `❌ *Réactions désactivées !*\n\n` +
                        `Le bot ne réagira plus aux\n` +
                        `mises à jour de statut.`
                }, { quoted: msg });

            } else {
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       💚  *RÉACTIONS STATUTS*     ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `⚠️ *Argument invalide :* \`${args[1]}\`\n\n` +
                        `📖 Usage : \`#autostatus react on/off\``
                }, { quoted: msg });
            }

        // ── Download on/off ─────────────────────────────────────
        } else if (command === 'download') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       📥  *DOWNLOAD STATUTS*      ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `⚠️ *Argument manquant*\n\n` +
                        `📖 Usage : \`#autostatus download on/off\``
                }, { quoted: msg });
                return;
            }

            const dlCommand = args[1].toLowerCase();

            if (dlCommand === 'on') {
                config.downloadOn = true;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       📥  *DOWNLOAD STATUTS*      ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `✅ *Téléchargement activé !*\n\n` +
                        `Les médias des statuts seront\n` +
                        `sauvegardés automatiquement. 💾\n\n` +
                        `📁 Dossier : \`/statuses\``
                }, { quoted: msg });

            } else if (dlCommand === 'off') {
                config.downloadOn = false;
                fs.writeFileSync(configPath, JSON.stringify(config));
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       📥  *DOWNLOAD STATUTS*      ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `❌ *Téléchargement désactivé !*\n\n` +
                        `Les statuts ne seront plus\n` +
                        `sauvegardés automatiquement.`
                }, { quoted: msg });

            } else {
                await sock.sendMessage(chatId, { 
                    text:
                        `╔══════════════════════════════════╗\n` +
                        `║       📥  *DOWNLOAD STATUTS*      ║\n` +
                        `╚══════════════════════════════════╝\n\n` +
                        `⚠️ *Argument invalide :* \`${args[1]}\`\n\n` +
                        `📖 Usage : \`#autostatus download on/off\``
                }, { quoted: msg });
            }

        // ── Commande inconnue ───────────────────────────────────
        } else {
            await sock.sendMessage(chatId, { 
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       👁️  *AUTO STATUS*           ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `⚠️ *Commande invalide :* \`${args[0]}\`\n\n` +
                    `📖 *Commandes disponibles :*\n\n` +
                    `  \`#autostatus on\`            → Activer la vue\n` +
                    `  \`#autostatus off\`           → Désactiver la vue\n` +
                    `  \`#autostatus react on\`      → Activer les réactions\n` +
                    `  \`#autostatus react off\`     → Désactiver les réactions\n` +
                    `  \`#autostatus download on\`   → Activer le download\n` +
                    `  \`#autostatus download off\`  → Désactiver le download`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('Erreur dans la commande autostatus :', error);
        await sock.sendMessage(chatId, { 
            text:
                `╔══════════════════════════════════╗\n` +
                `║       👁️  *AUTO STATUS*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❌ *Erreur système*\n\n` +
                `📋 ${error.message}`
        }, { quoted: msg });
    }
}

// ─────────────────────────────────────────────
//  🔍  VÉRIFICATIONS CONFIG
// ─────────────────────────────────────────────

function isAutoStatusEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath)).enabled ?? false;
    } catch {
        return false;
    }
}

function isStatusReactionEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath)).reactOn ?? false;
    } catch {
        return false;
    }
}

function isStatusDownloadEnabled() {
    try {
        return JSON.parse(fs.readFileSync(configPath)).downloadOn ?? false;
    } catch {
        return false;
    }
}

// ─────────────────────────────────────────────
//  💚  RÉACTION AU STATUT
// ─────────────────────────────────────────────

async function reactToStatus(sock, statusKey) {
    try {
        if (!isStatusReactionEnabled()) return;

        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid : 'status@broadcast',
                        id        : statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe    : false
                    },
                    text: '💚'
                }
            },
            {
                messageId    : statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
    } catch (error) {
        console.error('❌ Erreur lors de la réaction au statut :', error.message);
    }
}

// ─────────────────────────────────────────────
//  📥  TÉLÉCHARGEMENT MÉDIA DE STATUT
// ─────────────────────────────────────────────

async function downloadStatusMedia(sock, msg) {
    try {
        // ✅ Guard — téléchargement désactivé
        if (!isStatusDownloadEnabled()) return;

        const { downloadMediaMessage } = require('@whiskeysockets/baileys');

        const msgContent = msg.message;
        if (!msgContent) return;

        const mediaType =
            msgContent.imageMessage   ? 'image'   :
            msgContent.videoMessage   ? 'video'   :
            msgContent.audioMessage   ? 'audio'   :
            msgContent.stickerMessage ? 'sticker' : null;

        if (!mediaType) return;

        const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: sock.logger }
        );

        const folder = path.join(__dirname, '../../statuses');
        if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

        const ext =
            mediaType === 'image'   ? 'jpg'  :
            mediaType === 'video'   ? 'mp4'  :
            mediaType === 'audio'   ? 'mp3'  :
            mediaType === 'sticker' ? 'webp' : 'bin';

        const filePath = path.join(folder, `${msg.key.id}.${ext}`);
        fs.writeFileSync(filePath, buffer);

        const sender  = (msg.key.participant || msg.key.remoteJid || '').split('@')[0];
        const sizeKb  = (buffer.length / 1024).toFixed(1);
        const sizeMb  = (buffer.length / (1024 * 1024)).toFixed(2);
        const sizeStr = buffer.length > 1024 * 1024 ? `${sizeMb} Mo` : `${sizeKb} Ko`;

        const typeEmoji =
            mediaType === 'image'   ? '🖼️' :
            mediaType === 'video'   ? '🎬' :
            mediaType === 'audio'   ? '🎵' :
            mediaType === 'sticker' ? '🎭' : '📄';

        console.log(`📥 [STATUS] ${typeEmoji} ${mediaType} | @${sender} | ${sizeStr}`);

        const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        await sock.sendMessage(ownerJid, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       📥  *STATUS TÉLÉCHARGÉ*     ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `👤 *Auteur :*   @${sender}\n` +
                `${typeEmoji} *Type :*     ${mediaType}\n` +
                `📦 *Taille :*   ${sizeStr}\n` +
                `🕐 *Heure :*    ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✅ Fichier sauvegardé dans /statuses`
        });

    } catch (err) {
        console.error('❌ [STATUS] Erreur téléchargement :', err.message);
    }
}

// ─────────────────────────────────────────────
//  🔄  HANDLER PRINCIPAL STATUTS
// ─────────────────────────────────────────────

async function handleStatusUpdate(sock, status) {
    try {
        if (!isAutoStatusEnabled()) return;

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    const participant = getRealJid(msg);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.sendReceipt('status@broadcast', participant, [msg.key.id], 'read');
                    await reactToStatus(sock, msg.key);
                    await downloadStatusMedia(sock, msg);
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        const participant = getRealJid(msg);
                        await sock.sendReceipt('status@broadcast', participant, [msg.key.id], 'read');
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                const participant = getRealJid(status);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await sock.sendReceipt('status@broadcast', participant, [status.key.id], 'read');
                await reactToStatus(sock, status.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                    const participant = getRealJid(status);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.sendReceipt('status@broadcast', participant, [status.key.id], 'read');
                } else {
                    throw err;
                }
            }
            return;
        }

        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                const participant = getRealJid(status.reaction);
                await new Promise(resolve => setTimeout(resolve, 2000));
                await sock.sendReceipt('status@broadcast', participant, [status.reaction.key.id], 'read');
                await reactToStatus(sock, status.reaction.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Limite de requêtes atteinte, attente avant réessai...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ Erreur dans la lecture automatique des statuts :', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate,
    downloadStatusMedia
};
