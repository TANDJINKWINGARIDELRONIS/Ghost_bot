const Undercover = require('../lib/undercover');
const games = {};

async function execute(sock, msg, args) {

    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    args = args || [];

    // 🎮 CREER UNE PARTIE
    if (!args[0]) {

        if (games[chatId]) {
            return sock.sendMessage(chatId, {
                text: "❌ Une partie est déjà en cours dans cette salle."
            });
        }

        games[chatId] = new Undercover(sender);

        return sock.sendMessage(chatId, {
            text:
`🎮 Nouvelle Partie Undercuver  créée !

Hote : @${sender.split("@")[0]}
Staut : En attente d'autre joueurs.....


*Consigne* :
👉 Tape *#uc rules* pour avoir les regle du jeux  
👉 Tape *#uc join* pour participer
👉 l'hote lance la partie avec *#uc start* pour commencer
👉 Tape *#uc vote* et mentionne la personne que tu veux eliminer 
👉 Tape *#uc stop* pour quitter la parie`,

mentions: [sender]

        });
    }

    // 👥 REJOINDRE
    if (args[0] === "join") {

        const game = games[chatId];
        if (!game) {
            return sock.sendMessage(chatId, {
                text: "❌ Aucune partie trouvée."
            });
        }
        if (game.started) {
            return sock.sendMessage(chatId, {
                text: "❌ La partie a déjà commencé."
            });
        }

        game.addPlayer(sender);

        return sock.sendMessage(chatId, {
            text: `✅ @${sender.split("@")[0]} a rejoint la partie !`,
            mentions: [sender]
        });
    }

        // 🚀 DEMARRER
    if (args[0] === "start") {

        const game = games[chatId];
        if (!game)
            return sock.sendMessage(chatId, { text: "❌ Aucune partie en cours." });

        if (game.players.length < 2)
            return sock.sendMessage(chatId, { text: "⚠️ Minimum 2 joueurs requis." });

        game.startGame();

        await sock.sendMessage(chatId, {
            text: `🎭 La partie commence avec ${game.players.length} joueurs !
    📩 Les rôles et mots ont été envoyés en privé.`
        });

        await game.sendWord(sock);
        await game.startDescriptionPhase(sock,chatId)
        return;
    }


    if (args[0] === "rules") {
        // Premier message
await sock.sendMessage(chatId, {
    text: `
🎭 RÈGLES DU JEU UNDERCOVER 🎭

🎯 *Objectif* :
Découvrir qui sont les Undercovers… sans révéler ton propre mot !

🧑‍🌾 *Les Civils* :

Reçoivent tous le même mot.

Doivent démasquer les Undercover.

🕵️ *Les Undercover* :

Reçoivent un mot très proche (synonyme ou mot similaire).

Doivent se fondre dans la discussion sans se faire repérer.

⏳ Prochaine regle dans 15s soit prêt` });

// Deuxième message après 15 secondes
setTimeout(async () => {
    await sock.sendMessage(chatId, {
        text: `
  🎭 RÈGLES DU JEU UNDERCOVER 🎭

🗣 *Déroulement d’un tour* :

Chaque joueur décrit son mot avec un seul mot ou une courte phrase.

La discussion continue jusqu’à ce que tout le monde ait parlé.

Ensuite, place au vote ! 🗳

🗳 *Vote* :

Chaque joueur vote pour la personne qu’il pense être Undercover.

Le joueur avec le plus de votes est éliminé.

⏳ Prochaine regle dans 15s soit prêt`
    });
}, 15000); 

// Troisième message après 30 secondes (15s après le deuxième)
setTimeout(async () => {
    await sock.sendMessage(chatId, {
        text: `
  🎭 RÈGLES DU JEU UNDERCOVER 🎭
🏆 *Conditions de victoire* :

Si tous les Undercover sont éliminés → 🎉 Les Civils gagnent.

Si le nombre d’Undercover est égal ou supérieur aux Civils → 😈 Les Undercover gagnent.

⚠️ *Règles importantes* :

Ne montre jamais ton mot.

Ne dis pas ton mot exact.

Sois malin dans tes descriptions 😉

Bonne chance… et méfiez-vous de tout le monde 👀`
    });
}, 30000); 

    }
    //VOTE 
    if (args[0] === "vote") {

    const game = games[chatId];
    if (!game)
        return sock.sendMessage(chatId, { text: "❌ Aucune partie." });

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

    if (!mentioned || mentioned.length === 0)
        return sock.sendMessage(chatId, { text: "⚠️ Mentionne un joueur à voter." });

    const target = mentioned[0];

    const error = game.vote(sender, target);
    if (error)
        return sock.sendMessage(chatId, { text: `❌ ${error}` });

    await sock.sendMessage(chatId, {
        text: `🗳️ @${sender.split("@")[0]} a voté.`,
        mentions: [sender]
    });

    // Si tout le monde a voté
    if (game.allVoted()) {

        const eliminated = game.countVotes();

        game.eliminate(eliminated);

        await sock.sendMessage(chatId, {
            text: `❌ @${eliminated.split("@")[0]} est éliminé !`,
            mentions: [eliminated]
        });

        const winner = game.checkWin();

        if (winner === "civils") {
            await sock.sendMessage(chatId, {
                text: "🎉 Les civils ont gagné ! L'Undercover a été découvert."
            });
            delete games[chatId];
        }

       if (winner === "undercovers") {
            await sock.sendMessage(chatId, {
                text: "😈 Les Undercovers ont gagné !" 
            });
            delete games[chatId];
        }


            game.votes = {};
        }

        return;
    }

    // 🛑 STOP
    if (args[0] === "stop") {

        const game = games[chatId];
        if (!game) {
            return sock.sendMessage(chatId, {
                text: "❌ Aucune partie à arrêter."
            });
        }

        delete games[chatId];

        return sock.sendMessage(chatId, {
            text: "🛑 Partie annulée."
        });
    }
}

module.exports = execute;
