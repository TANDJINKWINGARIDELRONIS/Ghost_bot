const isAdmin = require('../../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🔇  *MUTE GROUPE*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❌ *Bot non administrateur*\n\n` +
                `Veuillez d'abord donner les droits\n` +
                `administrateur au bot.`
        }, { quoted: message });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🔇  *MUTE GROUPE*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `🚫 *Accès refusé*\n\n` +
                `Seuls les administrateurs du groupe\n` +
                `peuvent utiliser cette commande.`
        }, { quoted: message });
        return;
    }

    try {
        await sock.groupSettingUpdate(chatId, 'announcement');

        // ── Récupère tous les membres pour les mentionner ─────────
        const metadata     = await sock.groupMetadata(chatId);
        const participants = metadata.participants.map(p => p.id);
        const mentions     = participants.map(u => `@${u.split('@')[0]}`).join(' ');

        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;

            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       🔇  *GROUPE EN SOURDINE*    ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `✅ *Groupe muté avec succès !*\n\n` +
                    `⏱️ *Durée :* ${durationInMinutes} minute(s)\n` +
                    `🔓 Réouverture automatique dans ${durationInMinutes} min.\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📢 ${mentions}\n\n` +
                    `_Seuls les admins peuvent écrire._`,
                mentions: participants
            }, { quoted: message });

            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');

                    // Re-fetch membres au moment du démute auto
                    const meta2  = await sock.groupMetadata(chatId);
                    const parts2 = meta2.participants.map(p => p.id);
                    const ments2 = parts2.map(u => `@${u.split('@')[0]}`).join(' ');

                    await sock.sendMessage(chatId, {
                        text:
                            `╔══════════════════════════════════╗\n` +
                            `║       🔊  *GROUPE RÉOUVERT*       ║\n` +
                            `╚══════════════════════════════════╝\n\n` +
                            `✅ *Sourdine levée automatiquement !*\n\n` +
                            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `📢 ${ments2}\n\n` +
                            `💬 Tout le monde peut à nouveau écrire.`,
                        mentions: parts2
                    });
                } catch (unmuteError) {
                    console.error('Erreur lors du démutage du groupe :', unmuteError);
                }
            }, durationInMilliseconds);

        } else {
            await sock.sendMessage(chatId, {
                text:
                    `╔══════════════════════════════════╗\n` +
                    `║       🔇  *GROUPE EN SOURDINE*    ║\n` +
                    `╚══════════════════════════════════╝\n\n` +
                    `✅ *Groupe muté avec succès !*\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `📢 ${mentions}\n\n` +
                    `_Seuls les admins peuvent écrire._`,
                mentions: participants
            }, { quoted: message });
        }

    } catch (error) {
        console.error('Erreur lors du mute/démute du groupe :', error);
        await sock.sendMessage(chatId, {
            text:
                `╔══════════════════════════════════╗\n` +
                `║       🔇  *MUTE GROUPE*           ║\n` +
                `╚══════════════════════════════════╝\n\n` +
                `❌ *Erreur système*\n\n` +
                `Une erreur est survenue lors du mute.\n` +
                `Veuillez réessayer.`
        }, { quoted: message });
    }
}

module.exports = muteCommand;
