// ================= INITIALISATION =================
const game = new WordHintGame(5);

async function sendWordToPlayers(sock, game) {

    for (const player of game.players) {
        await sock.sendMessage(player.id, {
            text: `🤫 Ton mot est : *${game.currentWord}*`
        });
    }
}

// ================= COMMAND HANDLER =================
switch (true) {

    // ========= INSCRIPTION =========
    case userMessage === '#join':

        let joinMsg = game.addPlayer(sender, pushName);
        await sock.sendMessage(chatId, { text: joinMsg });
        break;


    // ========= LANCER PARTIE =========
    case userMessage === '#start':

        let startMsg = game.start(wordsList);
        await sock.sendMessage(chatId, { text: startMsg });

        if (game.started)
            await sendWordToPlayers(sock, game);

        break;


    // ========= DEVINER =========
    case userMessage.startsWith('#guess'):

        let guessedWord = userMessage.split(' ').slice(1).join(' ');

        if (!guessedWord) {
            await sock.sendMessage(chatId, { text: "Utilise : #guess <mot>" });
            break;
        }

        let guessMsg = game.guess(sender, guessedWord);
        await sock.sendMessage(chatId, { text: guessMsg });

        // Si mot trouvé → passer au joueur suivant
        if (guessMsg.includes("a trouvé")) {

            let nextMsg = game.nextTurn(wordsList);
            await sock.sendMessage(chatId, { text: nextMsg });

            // Si nouvelle manche → renvoyer mot
            if (game.started)
                await sendWordToPlayers(sock, game);
        }

        break;


    // ========= PASSER AU JOUEUR SUIVANT =========
    case userMessage === '#next':

        let nextMsg = game.nextTurn(wordsList);
        await sock.sendMessage(chatId, { text: nextMsg });

        if (game.started)
            await sendWordToPlayers(sock, game);

        break;


    // ========= SCORES =========
    case userMessage === '#score':

        await sock.sendMessage(chatId, {
            text: `📊 Scores:\n${game.scoreboard()}`
        });

        break;
}