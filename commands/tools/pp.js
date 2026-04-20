// ╔══════════════════════════════════════════════════════════════╗
// ║              📸  PP COMMAND  📸                              ║
// ║              Affichage de photo de profil                    ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict';

// ✅ FIX — Suppression de l'import `require('../../logger')(module)`
//    qui plante si le module logger n'existe pas ou n'est pas une factory.
//    Remplacement par console.log/error natif.
const settings = require('../../settings');

// ─────────────────────────────────────────────
//  🛡️  NUMÉRO DU PROPRIÉTAIRE À PROTÉGER
// ─────────────────────────────────────────────

// ✅ FIX — Utilise settings.ownerNumber si disponible, sinon fallback
const OWNER_NUMBER = settings?.ownerNumber ?? '237655562634';

// ─────────────────────────────────────────────
//  🚀  COMMANDE PRINCIPALE
// ─────────────────────────────────────────────

async function viewPhotoCommand(sock, chatId, message) {
    try {
        const isGroup = chatId.endsWith('@g.us');
        let targetJid = null;

        // ── Détermination de la cible ────────────────────────────
        if (isGroup) {
            if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
                // Réponse à un message → photo de l'auteur du message cité
                targetJid = message.message.extendedTextMessage.contextInfo.participant;
            } else if (message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
                // Mention → photo de la personne mentionnée
                targetJid = message.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else {
                // Aucune cible → photo de l'auteur de la commande
                targetJid = message.key.participant;
            }
        } else {
            // Chat privé → photo de l'utilisateur
            targetJid = message.key.remoteJid;
        }

        // ── Vérification de la cible ─────────────────────────────
        if (!targetJid) {
            return sock.sendMessage(chatId, {
                text: '⚠️ *Impossible de déterminer la cible.*\nMentionne quelqu\'un ou réponds à un message.'
            }, { quoted: message });
        }

        // ── Protection du propriétaire ───────────────────────────
        const cleanTarget = targetJid.split(':')[0].split('@')[0];
        if (cleanTarget === OWNER_NUMBER) {
            return sock.sendMessage(chatId, {
                text: '🛡️ *La photo de profil du propriétaire est protégée.*'
            }, { quoted: message });
        }

        // ── Récupération de la photo ─────────────────────────────
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);

        if (!ppUrl) {
            return sock.sendMessage(chatId, {
                text: `⚠️ *@${cleanTarget} n'a pas de photo de profil*\nou l'a rendue privée.`,
                mentions: [targetJid]
            }, { quoted: message });
        }

        // ── Envoi de la photo ────────────────────────────────────
        await sock.sendMessage(chatId, {
            image  : { url: ppUrl },
            caption:
                `╔══════════════════════════╗\n` +
                `║   📸  *PHOTO DE PROFIL*   ║\n` +
                `╚══════════════════════════╝\n\n` +
                `👤 *Utilisateur :* @${cleanTarget}`,
            mentions: [targetJid]
        }, { quoted: message });

        console.log(`✅ [PP] Photo envoyée pour ${targetJid}`);

    } catch (error) {
        console.error('❌ [PP] Erreur:', error.message);
        await sock.sendMessage(chatId, {
            text: '❌ *Erreur lors de la récupération de la photo de profil.*'
        }, { quoted: message });
    }
}

module.exports = viewPhotoCommand;
