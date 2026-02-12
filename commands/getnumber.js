const games = {}; 
// Structure : 
// games[chatId] = { player: userId, number: X, guessedNumber: [], attempts: 0 }

function startgame(sock, chatId, message) {
    const userId = message.key.participant || message.key.remoteJid;
    const number = Math.floor(Math.random() * 100) + 1;

    // 🎯 Lancer une partie
    if (games[chatId]) {
        sock.sendMessage(chatId, {
            text: "⚠️ Une partie est déjà en cours dans ce chat. Le lanceur doit faire #exit pour l'arrêter"
        }, { quoted: message });
        return;
    }

    games[chatId] = {
        player: userId,
        number: number,
        guessedNumber: [],
        attempts: 0
    };

    sock.sendMessage(chatId, {
        text: "🎮 Jeu lancé !\n\nDevine un nombre entre 1 et 100 🤔. Tape #is <nombre> pour donner ta réponse "
    }, { quoted: message });
}
    
function guessNumber(sock, chatId, message, user_number) {
    if (!games[chatId]) {
        sock.sendMessage(chatId, { text: '❌ Aucune partie en cours. Démarrez une nouvelle partie avec #getnum' });
        return;
    }

    const userId = message.key.participant || message.key.remoteJid;
    const game = games[chatId];

    // Si ce n'est pas le joueur actif
    if (userId !== game.player) {
        sock.sendMessage(chatId, { text: `❌ Ce n'est pas votre partie` });
        return; 
    }

    // Vérifie si le nombre a déjà été essayé
    if (game.guessedNumber.includes(user_number)) {
        sock.sendMessage(chatId, { text: `⚠️ Vous avez déjà essayé le nombre "${user_number}". Essayez-en un autre.` });
        return;
    }

    // Ajouter le nombre essayé
    game.guessedNumber.push(user_number);
    game.attempts += 1;

    // Comparer le nombre
    if (user_number > game.number) {
        sock.sendMessage(chatId, { text: "🔼 Trop grand !" }, { quoted: message });
        return;
    }

    if (user_number < game.number) {
        sock.sendMessage(chatId, { text: "🔽 Trop petit !" }, { quoted: message });
        return;
    }

    // Nombre correct
    const attempts = game.attempts;
    delete games[chatId]; // supprime la partie
    sock.sendMessage(chatId, { text: `🎉 Bravo ! Trouvé en ${attempts} essais !` }, { quoted: message });
}

function exitgame(sock, chatId, message) {
    if (!games[chatId]) {
        sock.sendMessage(chatId, { text: "❌ Aucune partie en cours à quitter." }, { quoted: message });
        return;
    }

    const number = games[chatId].number;
    delete games[chatId];
    sock.sendMessage(chatId, { text: `Partie abandonnée, le nombre était ${number}` }, { quoted: message });
}

module.exports = { startgame, guessNumber, exitgame };