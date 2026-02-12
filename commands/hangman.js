const fs = require('fs');

const words = ['javascript', 'bot', 'hangman', 'whatsapp', 'nodejs','mostwanted','uranium','mr robot'];
let hangmanGames = {};

function startHangman(sock, chatId) {
    const word = words[Math.floor(Math.random() * words.length)];
    const maskedWord = '_ '.repeat(word.length).trim();

    hangmanGames[chatId] = {
        word,
        maskedWord: maskedWord.split(' '),
        guessedLetters: [],
        wrongGuesses: 0,
        maxWrongGuesses: 6,
    };
    if (word == 'javascript' || word == 'nodejs') {
        sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} .
            *Indice* : 
                ~je gere le Dom Html 🤫~
            
            *Notice :* 
                Utilise #guess <lettre> pour proposer une reponse` });   
    }
    if (word == 'Bot') {
        sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} .
            *Indice* : 
                ~C'est mon nom 😏~
            
            *Notice :* 
                Utilise #guess <lettre> pour proposer une reponse` });   
    }
    if (word == 'hangman') {
        sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} .
            *Indice* : 
                ~C'est l'une de mes commandes 🫠~
            
            *Notice :* 
                Utilise #guess <lettre> pour proposer une reponse` });   
    }
    if (word == 'whatsapp') {
        sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} .
            *Indice* : 
                ~Application Mobile 😴~
            
            *Notice :* 
                Utilise #guess <lettre> pour proposer une reponse` });   
    }
    if (word == 'mr robot') {
        sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} .
            *Indice* : 
                ~J'ai des circuits integrés😈~
            
            *Notice :* 
                Utilise #guess <lettre> pour proposer une reponse` });   
    }
    



    sock.sendMessage(chatId, { text: `🎮 Partie commencée ! Le mot est : ${maskedWord} . Utilise #guess <lettre> pour proposer une reponse` });
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
