const isAdmin = require('../lib/isAdmin');

async function muteCommand(sock, chatId, senderId, message, durationInMinutes) {

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(
            chatId,
            { text: '❌ Veuillez d’abord donner les droits administrateur au bot.' },
            { quoted: message }
        );
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(
            chatId,
            { text: '❌ Seuls les administrateurs du groupe peuvent utiliser la commande mute.' },
            { quoted: message }
        );
        return;
    }

    try {
        // Mettre le groupe en mode muet
        await sock.groupSettingUpdate(chatId, 'announcement');

        if (durationInMinutes !== undefined && durationInMinutes > 0) {
            const durationInMilliseconds = durationInMinutes * 60 * 1000;

            await sock.sendMessage(
                chatId,
                { text: `🔇 Le groupe a été mis en sourdine pendant ${durationInMinutes} minute(s).` },
                { quoted: message }
            );

            // Démute automatiquement après la durée définie
            setTimeout(async () => {
                try {
                    await sock.groupSettingUpdate(chatId, 'not_announcement');
                    await sock.sendMessage(chatId, {
                        text: '🔊 Le groupe n’est plus en sourdine.'
                    });
                } catch (unmuteError) {
                    console.error('Erreur lors du démutage du groupe :', unmuteError);
                }
            }, durationInMilliseconds);

        } else {
            await sock.sendMessage(
                chatId,
                { text: '🔇 Le groupe a été mis en sourdine.' },
                { quoted: message }
            );
        }

    } catch (error) {
        console.error('Erreur lors du mute/démute du groupe :', error);
        await sock.sendMessage(
            chatId,
            { text: '❌ Une erreur est survenue lors du mute ou du démute du groupe. Veuillez réessayer.' },
            { quoted: message }
        );
    }
}

module.exports = muteCommand;
