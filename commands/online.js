async function onlineCommand(sock, chatId, message) {
    try {
        // Vérifier si c’est un groupe
        if (!chatId.endsWith('@g.us')) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette commande fonctionne uniquement dans les groupes.'
            }, { quoted: message });
            return;
        }

        // Récupérer les métadonnées du groupe
        const groupMetadata = await sock.groupMetadata(chatId);
        const participants = groupMetadata.participants;

        let onlineUsers = [];

        // Vérifier la présence de chaque participant
        for (const user of participants) {
            const jid = user.id;

            // S’abonner à la présence
            await sock.presenceSubscribe(jid);

            const presence = sock.presence?.[jid]?.lastKnownPresence;

            if (presence === 'available') {
                onlineUsers.push(jid);
            }
        }

        // Aucun utilisateur en ligne détecté
        if (onlineUsers.length === 0) {
            await sock.sendMessage(chatId, {
                text: '😴 *Aucun membre n’est actuellement en ligne.*'
            }, { quoted: message });
            return;
        }

        // Construction du message stylé
        let text = `╔══════════════════╗
🟢 *MEMBRES EN LIGNE*
╚══════════════════╝

👥 Total : *${onlineUsers.length}*

`;

        onlineUsers.forEach((jid, index) => {
            const num = jid.split('@')[0];
            text += `🔹 ${index + 1}. @${num}\n`;
        });

        text += `\n⏱️ _Statut basé sur la présence visible_`;

        // Envoi du message avec mentions
        await sock.sendMessage(chatId, {
            text,
            mentions: onlineUsers
        }, { quoted: message });

    } catch (error) {
        console.error('[ONLINE] Erreur :', error);
        await sock.sendMessage(chatId, {
            text: '❌ Une erreur est survenue lors de la récupération des utilisateurs en ligne.'
        }, { quoted: message });
    }
}

module.exports = onlineCommand;
