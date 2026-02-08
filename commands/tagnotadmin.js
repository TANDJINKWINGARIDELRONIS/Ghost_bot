const isAdmin = require('../lib/isAdmin');

async function tagNotAdminCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Veuillez d’abord rendre le bot administrateur.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: 'Seuls les administrateurs peuvent utiliser la commande .tagnotadmin.' }, { quoted: message });
            return;
        }

        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants || [];

        const nonAdmins = participants.filter(p => !p.admin).map(p => p.id);
        if (nonAdmins.length === 0) {
            await sock.sendMessage(chatId, { text: 'Aucun membre non administrateur à identifier.' }, { quoted: message });
            return;
        }

        let text = '🔊 *Bonjour à tous :*\n\n';
        nonAdmins.forEach(jid => {
            text += `@${jid.split('@')[0]}\n`;
        });

        await sock.sendMessage(chatId, { text, mentions: nonAdmins }, { quoted: message });
    } catch (error) {
        console.error('Erreur dans la commande tagnotadmin :', error);
        await sock.sendMessage(chatId, { text: 'Échec de l’identification des membres non administrateurs.' }, { quoted: message });
    }
}

module.exports = tagNotAdminCommand;
