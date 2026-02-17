// commands/statusall.js
module.exports = {
    name: "statusallCommand",
    description: "Active la lecture automatique des statuts et réactions.",
    run: async ({ sock, msg, replyWithTag }) => {
        const chatId = msg.key.remoteJid;

        // Stocker un flag global pour l'auto-statut
        sock.autoStatus = true;

        await replyWithTag(sock, chatId, msg, `✅ *Auto-statut activé !*\nLe bot va maintenant lire tous les nouveaux statuts et réagir avec ❤️ automatiquement.`);

        // Surveille les mises à jour de statut
        sock.ev.on('presence.update', async (update) => {
            if (!sock.autoStatus) return;

            const jid = update.id; // JID de l'utilisateur
            const type = update.type; // ex: 'available'

            // Ici on pourrait filtrer si c'est un statut "story"
            // Dans Baileys, on récupère les messages de statut via 'messages.upsert'
        });

        // Alternative plus simple : écouter tous les messages éphémères/statuts
        sock.ev.on('messages.upsert', async (m) => {
            if (!sock.autoStatus) return;

            const messages = m.messages || [];
            for (const message of messages) {
                const sender = message.key.remoteJid;
                const isStatus = message.key.fromMe === false && message.message?.viewOnceMessage;

                if (isStatus) {
                    try {
                        // Marquer comme vu
                        await sock.sendMessage(sender, { react: { text: '❤️', key: message.key } });
                        console.log(`Auto-like ❤️ envoyé à ${sender}`);
                    } catch (e) {
                        console.error('Erreur auto-status:', e.message);
                    }
                }
            }
        });
    }
};
