const fs = require('fs');

const words = ['javascript', 'bot', 'hangman', 'whatsapp', 'nodejs','mostwanted','uranium','mr robot'];
let hangmanGames = {};

function startHangman(sock, chatId) {
    const word = words[Math.floor(Math.random() * words.length)];
    const maskedWord = '_ '.repeat(word.length).trim();

    // Initialiser la partie
    hangmanGames[chatId] = {
        word,
        maskedWord: maskedWord.split(' '),
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
    };

    // Dictionnaire des indices
    const hints = {
        'javascript': 'je gere le Dom Html 🤫',
        'nodejs': 'je gere le Dom Html 🤫',
        'bot': "C'est mon nom 😏",
        'hangman': "C'est l'une de mes commandes 🫠",
        'whatsapp': 'Application Mobile 😴',
        'mr robot': "J'ai des circuits integrés😈"
    };

    const key = word.toLowerCase(); // gérer la casse
    const hint = hints[key] || ''; // fallback vide si mot pas dans indices

    // Envoyer le message
    sock.sendMessage(chatId, {
        text: `🎮 Partie commencée ! Le mot est : ${maskedWord}.\n\n*Indice* : \n~${hint}~\n\n*Notice* :\nUtilise #guess <lettre> pour proposer une reponse`
    });
}

function guessLetter(sock, chatId, letter) {
    if (!hangmanGames[chatId]) {
        sock.sendMessage(chatId, { text: '❌ Aucune partie en cours. Démarrez une nouvelle partie avec #hangman' });
        return;
    }

    const game = hangmanGames[chatId];
    const { word, guessedLetters, maskedWord, maxWrongGuesses } = game;

    if (guessedLetters.includes(letter)) {
        sock.sendMessage(chatId, { text: `⚠️ Vous avez déjà essayé la lettre "${letter}". Essayez-en une autre.` });
        return;
    }

    guessedLetters.push(letter);

    if (word.includes(letter)) {
        for (let i = 0; i < word.length; i++) {
            if (word[i] === letter) {
                maskedWord[i] = letter;
            }
        }
        sock.sendMessage(chatId, { text: `✅ Bonne réponse ! ${maskedWord.join(' ')}` });

        if (!maskedWord.includes('_')) {
            sock.sendMessage(chatId, { text: `🎉 Félicitations ! Vous avez trouvé le mot : ${word}` });
            delete hangmanGames[chatId];
        }
    } else {
        game.wrongGuesses += 1;
        sock.sendMessage(chatId, { text: `❌ Mauvaise réponse ! Il vous reste ${maxWrongGuesses - game.wrongGuesses} essais.` });

        if (game.wrongGuesses >= maxWrongGuesses) {
            sock.sendMessage(chatId, { text: `💀 Partie terminée ! Le mot était : ${word}` });
            delete hangmanGames[chatId];
        }
    }
}

module.exports = { startHangman, guessLetter };
