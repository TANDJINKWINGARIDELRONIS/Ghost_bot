const Undercover = require('../lib/undercover');
const games = {}; // manquait

async function execute(sock, msg, args) {

    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    args = args || [];

    if (args[0] === "join") {
        const game = games[chatId];
        if (!game)
            return sock.sendMessage(chatId, { text: "❌ Aucune Salles trouvées." });

        game.addPlayer(sender);

        return sock.sendMessage(chatId, {
            text: `Nouveau Joueur Detecte 😈\n\n\t✅ @${sender.split("@")[0]} a rejoint la Salle !`,
            mentions: [sender]
        });
    }

    if (args[0] === "start") {
        const game = games[chatId];
        if (!game)
            return sock.sendMessage(chatId, { text: "❌ Aucune partie." });

        if (game.players.length < 2)
            return sock.sendMessage(chatId, { text: "⚠️ Minimum 2 joueurs." });

        return sendword(sock, chatId);
    }

    if (!args[0] || args[0] === "start") {
        if (games[chatId])
            return sock.sendMessage(chatId, { text: "❌ Partie déjà en cours dans cette salle." });

        games[chatId] = new Undercover(sender);

        await sock.sendMessage(chatId, {
            text:
`🎮 Partie créée !
*Regle A avoir*
Si votre mot est decouvert vous etes eliminé
👉 Tape *#uc join* pour participer
👉 Tape *#uc stop* pour quitter la partie
⏳ L'hôte lance avec *#uc start*`
        });
    }

    if (args[0] === "stop") {
        delete games[chatId];
        return sock.sendMessage(chatId, {
            text: `Le joueur @${sender.split("@")[0]} a quitté la partie 🛑 .`,
            mentions: [sender]
        });
    }
}

module.exports = execute;