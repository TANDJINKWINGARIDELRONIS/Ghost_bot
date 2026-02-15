const wordsList = [
    "éléphant","soleil","python","ordinateur","fromage","volcan",
    "uranium","océan","pizza","avion","mangue","robot","bouteille"
];

let wordGames = {};

function getRandomWord(){
    return wordsList[Math.floor(Math.random()*wordsList.length)];
}

// ================= START =================
async function startWordGame(sock, chatId, message, participants){

    if(wordGames[chatId])
        return sock.sendMessage(chatId,{text:"❌ Une partie est déjà en cours"}, {quoted:message});

    if(participants.length < 2 || participants.length > 3)
        return sock.sendMessage(chatId,{text:"⚠️ 2 ou 3 joueurs seulement"}, {quoted:message});

    let game = {
        players: participants,
        words: {},
        scores: {},
        currentTurn: 0,
        round: 1,
        maxRounds: 5,
        phase: "clue",
        found: false
    };

    // init score + mots privés
    for(const p of participants){
        game.words[p] = getRandomWord();
        game.scores[p] = 0;

        await sock.sendMessage(p,{
            text:`🎯 Ton mot secret est : *${game.words[p]}*`
        });
    }

    wordGames[chatId] = game;

    const current = game.players[game.currentTurn];

    sock.sendMessage(chatId,{
        text:`🎮 Partie lancée !

👥 Joueurs: ${participants.map(x=>'@'+x.split('@')[0]).join(' ')}

📝 Manche 1
👉 Au tour de @${current.split('@')[0]} de donner un indice`,
        mentions: participants
    });
}

// ================= CLUE =================
async function giveClue(sock, chatId, sender, clue, message){
    const game = wordGames[chatId];
    if(!game) return;

    const current = game.players[game.currentTurn];

    if(sender !== current)
        return sock.sendMessage(chatId,{text:"❌ Ce n'est pas ton tour"}, {quoted:message});

    if(game.phase !== "clue")
        return;

    game.phase = "guess";
    game.found = false;

    sock.sendMessage(chatId,{
        text:`💡 Indice : *${clue}*

Les autres joueurs devinent avec:
#guess mot`
    });
}

// ================= GUESS =================
async function guessWord(sock, chatId, sender, guess, message){
    const game = wordGames[chatId];
    if(!game) return;
    if(game.phase !== "guess") return;
    if(game.found) return;

    const current = game.players[game.currentTurn];
    const realWord = game.words[current].toLowerCase();

    if(sender === current)
        return sock.sendMessage(chatId,{text:"❌ Tu ne peux pas deviner ton propre mot"}, {quoted:message});

    if(guess.toLowerCase() === realWord){

        game.scores[sender] += 1;
        game.scores[current] += 1;
        game.found = true;

        sock.sendMessage(chatId,{
            text:`🎉 Bonne réponse !

@${sender.split('@')[0]} a trouvé le mot *${realWord}*`,
            mentions:[sender]
        });

        nextTurn(sock,chatId);
    }
}

// ================= NEXT TURN =================
async function nextTurn(sock,chatId){
    const game = wordGames[chatId];

    game.currentTurn++;

    if(game.currentTurn >= game.players.length){
        game.currentTurn = 0;
        game.round++;
    }

    if(game.round > game.maxRounds)
        return endGame(sock,chatId);

    game.phase = "clue";

    const current = game.players[game.currentTurn];

    sock.sendMessage(chatId,{
        text:`📝 Manche ${game.round}

👉 Au tour de @${current.split('@')[0]} de donner un indice`,
        mentions:[current]
    });
}

// ================= SCORE =================
async function showScore(sock,chatId){
    const game = wordGames[chatId];
    if(!game) return;

    let text="🏆 Scores :\n\n";

    for(const p of game.players){
        text += `@${p.split('@')[0]} : ${game.scores[p]} pts\n`;
    }

    sock.sendMessage(chatId,{text,mentions:game.players});
}

// ================= END =================
async function endGame(sock,chatId){
    const game = wordGames[chatId];
    if(!game) return;

    let ranking = game.players
        .sort((a,b)=>game.scores[b]-game.scores[a]);

    let text="🏁 Partie terminée\n\n🏆 Classement:\n";

    ranking.forEach((p,i)=>{
        text += `${i+1}. @${p.split('@')[0]} - ${game.scores[p]} pts\n`;
    });

    sock.sendMessage(chatId,{text,mentions:game.players});

    delete wordGames[chatId];const wordsList = [
    "éléphant","soleil","python","ordinateur","fromage","volcan",
    "uranium","océan","pizza","avion","mangue","robot","bouteille"
];

let wordGames = {};

function getRandomWord(){
    return wordsList[Math.floor(Math.random()*wordsList.length)];
}

// ================= START =================
async function startWordGame(sock, chatId, message, participants){

    if(wordGames[chatId])
        return sock.sendMessage(chatId,{text:"❌ Une partie est déjà en cours"}, {quoted:message});

    if(participants.length < 2 || participants.length > 3)
        return sock.sendMessage(chatId,{text:"⚠️ 2 ou 3 joueurs seulement"}, {quoted:message});

    let game = {
        players: participants,
        words: {},
        scores: {},
        currentTurn: 0,
        round: 1,
        maxRounds: 5,
        phase: "clue",
        found: false
    };

    // init score + mots privés
    for(const p of participants){
        game.words[p] = getRandomWord();
        game.scores[p] = 0;

        await sock.sendMessage(p,{
            text:`🎯 Ton mot secret est : *${game.words[p]}*`
        });
    }

    wordGames[chatId] = game;

    const current = game.players[game.currentTurn];

    sock.sendMessage(chatId,{
        text:`🎮 Partie lancée !

👥 Joueurs: ${participants.map(x=>'@'+x.split('@')[0]).join(' ')}

📝 Manche 1
👉 Au tour de @${current.split('@')[0]} de donner un indice`,
        mentions: participants
    });
}

// ================= CLUE =================
async function giveClue(sock, chatId, sender, clue, message){
    const game = wordGames[chatId];
    if(!game) return;

    const current = game.players[game.currentTurn];

    if(sender !== current)
        return sock.sendMessage(chatId,{text:"❌ Ce n'est pas ton tour"}, {quoted:message});

    if(game.phase !== "clue")
        return;

    game.phase = "guess";
    game.found = false;

    sock.sendMessage(chatId,{
        text:`💡 Indice : *${clue}*

Les autres joueurs devinent avec:
#guess mot`
    });
}

// ================= GUESS =================
async function guessWord(sock, chatId, sender, guess, message){
    const game = wordGames[chatId];
    if(!game) return;
    if(game.phase !== "guess") return;
    if(game.found) return;

    const current = game.players[game.currentTurn];
    const realWord = game.words[current].toLowerCase();

    if(sender === current)
        return sock.sendMessage(chatId,{text:"❌ Tu ne peux pas deviner ton propre mot"}, {quoted:message});

    if(guess.toLowerCase() === realWord){

        game.scores[sender] += 1;
        game.scores[current] += 1;
        game.found = true;

        sock.sendMessage(chatId,{
            text:`🎉 Bonne réponse !

@${sender.split('@')[0]} a trouvé le mot *${realWord}*`,
            mentions:[sender]
        });

        nextTurn(sock,chatId);
    }
}

// ================= NEXT TURN =================
async function nextTurn(sock,chatId){
    const game = wordGames[chatId];

    game.currentTurn++;

    if(game.currentTurn >= game.players.length){
        game.currentTurn = 0;
        game.round++;
    }

    if(game.round > game.maxRounds)
        return endGame(sock,chatId);

    game.phase = "clue";

    const current = game.players[game.currentTurn];

    sock.sendMessage(chatId,{
        text:`📝 Manche ${game.round}

👉 Au tour de @${current.split('@')[0]} de donner un indice`,
        mentions:[current]
    });
}

// ================= SCORE =================
async function showScore(sock,chatId){
    const game = wordGames[chatId];
    if(!game) return;

    let text="🏆 Scores :\n\n";

    for(const p of game.players){
        text += `@${p.split('@')[0]} : ${game.scores[p]} pts\n`;
    }

    sock.sendMessage(chatId,{text,mentions:game.players});
}

// ================= END =================
async function endGame(sock,chatId){
    const game = wordGames[chatId];
    if(!game) return;

    let ranking = game.players
        .sort((a,b)=>game.scores[b]-game.scores[a]);

    let text="🏁 Partie terminée\n\n🏆 Classement:\n";

    ranking.forEach((p,i)=>{
        text += `${i+1}. @${p.split('@')[0]} - ${game.scores[p]} pts\n`;
    });

    sock.sendMessage(chatId,{text,mentions:game.players});

    delete wordGames[chatId];
}
}
module.exports = {
    startWordGame,
    giveClue,
    guessWord,
    showScore,
    endGame
};
