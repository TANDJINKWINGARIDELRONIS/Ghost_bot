// commands/pp.js
const log = require('../logger')(module);

async function viewPhotoCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');

        let targetJid = null;

        // 🔎 Détermination de la cible (logique stable)
        if (isGroup) {
            // Si on répond à un message
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                targetJid = message.message.extendedTextMessage.contextInfo.participant;
            }
            // Si on mentionne quelqu’un
            else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            }
            // Sinon l’auteur du message
            else {
                targetJid = message.key.participant;
            }
        } else {
            // En privé → l’utilisateur lui-même
            targetJid = chatId;
        }

        if (!targetJid) {
            await sock.sendMessage(
                chatId,
                { text: '⚠️ Impossible de déterminer la personne.' },
                { quoted: message }
            );
            return;
        }

        // 🛡️ Protection du propriétaire
        const OWNER_PN = "237682441127";
        const OWNER_LID = "250865332039895";

        const cleanTarget = targetJid.split(':')[0].split('@')[0];
        if (cleanTarget === OWNER_PN || cleanTarget === OWNER_LID) {
            await sock.sendMessage(
                chatId,
                { text: '🛡️ La photo de profil du propriétaire est protégée.' },
                { quoted: message }
            );
            return;
        }

        // 📸 Récupération de la photo de profil (pleine résolution)
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);

        if (!ppUrl) {
            await sock.sendMessage(
                chatId,
                { text: "⚠️ Cette personne n'a pas de photo de profil." },
                { quoted: message }
            );
            return;
        }

        // 📤 Envoi de la photo
        await sock.sendMessage(
            chatId,
            {
                image: { url: ppUrl },
                caption: `📸 Photo de profil de @${cleanTarget}`,
                mentions: [targetJid]
            },
            { quoted: message }
        );

        log.info(`[PP] Photo de profil envoyée pour ${targetJid}`);

    } catch (error) {
        log.error('[PP] Erreur :', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ Une erreur est survenue lors de la récupération de la photo de profil.' },
            { quoted: message }
        );
    }
}

module.exports = viewPhotoCommand;
