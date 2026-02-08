const isAdmin = require('../lib/isAdmin');  // Move isAdmin to helpers

async function tagAllCommand(sock, chatId, senderId, message) {
    try {
        const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);
        

        if (!isBotAdmin) {
            await sock.sendMessage(chatId, { text: 'Veuillez d’abord rendre le bot administrateur.' }, { quoted: message });
            return;
        }

        if (!isSenderAdmin) {
            await sock.sendMessage(chatId, { text: 'Seuls les administrateurs du groupe peuvent utiliser la commande .tagall.' }, { quoted: message });
            return;
        }

        // Get group metadata
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        if (!participants || participants.length === 0) {
            await sock.sendMessage(chatId, { text: 'Aucun participant trouvé dans le groupe.' });
            return;
        }

        // Create message with each member on a new line
        let messageText = '🔊 *Bonjour à tous :*\n\n';
        participants.forEach(participant => {
            messageText += `@${participant.id.split('@')[0]}\n`; // Add \n for new line
        });

        // Send message with mentions
        await sock.sendMessage(chatId, {
            text: messageText,
            mentions: participants.map(p => p.id)
        });

    } catch (error) {
        console.error('Erreur dans la commande tagall :', error);
        await sock.sendMessage(chatId, { text: 'Échec du marquage de tous les membres.' });
    }
}

module.exports = tagAllCommand;  // Export directly
