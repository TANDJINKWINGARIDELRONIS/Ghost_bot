// Liste de mots (tu peux l'étendre)
const mots = ["maison", "eau", "pain", "telephone", "ecole", "route", "table",
    "chaise", "voiture", "soleil", "lune", "ami", "famille", "travail", "marche", "argent",
    "porte", "fenetre", "sac", "stylo"
];

// Classe Multiplayer
class Multiplayer {
    constructor(maxRounds = 5) {
        this.players = []; // {id, name, score}
        this.round = 0;
        this.turnIndex = 0;
        this.maxRounds = maxRounds;
        this.started = false;
        this.currentWord = mots[Math.floor(Math.random() * mots.length)];
        this.currentCluePlayer = null;
        this.hasGuessed = false;
    }

    addPlayer(id, name) {
        if (this.started) return "La partie a déjà commencé";
        if (this.players.find(p => p.id === id)) return "Déjà inscrit";
        this.players.push({ id, name, score: 0 });
        return `${name} inscrit ✅`;
    }

    start() {
        if (this.players.length < 3) return "Minimum 3 joueurs requis";
        this.started = true;
        this.round = 1;
        this.chooseWord();
        return `🎮 Partie lancée\nManche 1\nAu tour de ${this.currentCluePlayer.name} de donner un indice`;
    }

    chooseWord() {
        this.currentWord = mots[Math.floor(Math.random() * mots.length)];
        this.turnIndex = 0;
        this.currentCluePlayer = this.players[this.turnIndex];
        this.hasGuessed = false;
    }

    getCluePlayer() {
        return this.currentCluePlayer;
    }

    guess(playerId, word) {
        if (!this.started) return "La partie n'a pas commencé";
        if (playerId === this.currentCluePlayer.id) return "Tu ne peux pas deviner ton propre mot";
        if (this.hasGuessed) return "Mot déjà trouvé pour ce tour";
        if (word.toLowerCase() === this.currentWord.toLowerCase()) {
            let player = this.players.find(p => p.id === playerId);
            player.score += 2;
            this.currentCluePlayer.score += 1;
            this.hasGuessed = true;
            return `💡 ${player.name} a trouvé le mot ! (+2 pts)\n${this.currentCluePlayer.name} gagne +1 pt`;
        }
        return "❌ Mauvaise réponse";
    }

    nextTurn() {
        if (!this.started) return "Partie non démarrée";
        this.turnIndex++;
        if (this.turnIndex >= this.players.length) {
            this.round++;
            if (this.round > this.maxRounds) {
                this.started = false;
                return this.getWinner();
            }
            this.chooseWord();
            return `📢 Nouvelle manche ${this.round}\nAu tour de ${this.currentCluePlayer.name}`;
        }
        this.currentCluePlayer = this.players[this.turnIndex];
        this.hasGuessed = false;
        return `Au tour de ${this.currentCluePlayer.name} de donner un indice`;
    }

    scoreboard() {
        return this.players.map(p => `${p.name} : ${p.score} pts`).join("\n");
    }

    getWinner() {
        let best = [...this.players].sort((a, b) => b.score - a.score)[0];
        return `🏆 Partie terminée\nVainqueur : ${best.name} (${best.score} pts)\n\nScores:\n${this.scoreboard()}`;
    }
}

// ================= INSTANCES PAR GROUPE =================
const jeux = {}; // { groupId: instance de Multiplayer }


// ================= ENVOYER MOT EN PRIVÉ =================
async function envoyerMot(sock, jeu) {
    for (const player of jeu.players) {
        await sock.sendMessage(player.id, {
            text: `🤫 Ton mot est : *${jeu.currentWord}*`
        });
    }
}


// ================= PASSER AU TOUR SUIVANT =================
async function passerTour(sock, chatId, jeu) {
    const result = jeu.nextTurn();

    if (!jeu.started) {
        await sock.sendMessage(chatId, { text: result });
        return;
    }

    // Nouvelle manche → renvoyer le mot
    if (jeu.turnIndex === 0) {
        await envoyerMot(sock, jeu);
    }

    await sock.sendMessage(chatId, {
        text: result,
        mentions: [jeu.currentCluePlayer.id]
    });
}


// ================= GESTION DES MESSAGES =================
async function multiplayerCommand(sock, chatId, senderId, body, pushName = "Joueur") {
    if (!jeux[chatId]) jeux[chatId] = new Multiplayer();
    const jeu = jeux[chatId];

    body = body.trim().toLowerCase();

    // ================= INSCRIPTION =================
    if (body === "je m'inscris" && !jeu.started) {
        const result = jeu.addPlayer(senderId, pushName);

        await sock.sendMessage(chatId, { text: result });

        if (result.includes('inscrit')) {
            await sock.sendMessage(chatId, {
                text: `Total : ${jeu.players.length} joueurs`,
                mentions: jeu.players.map(p => p.id)
            });
        }
    }

    // ================= START =================
    else if (body === "#start" && !jeu.started) {
        const result = jeu.start();

        if (result.includes('Partie lancée')) {
            await envoyerMot(sock, jeu);

            await sock.sendMessage(chatId, {
                text: result,
                mentions: [jeu.currentCluePlayer.id]
            });
        } else {
            await sock.sendMessage(chatId, { text: result });
        }
    }

    // ================= DEVINER =================
    else if (body.startsWith("#guess ") && jeu.started) {
        const proposition = body.replace("#guess ", "").trim();
        const result = jeu.guess(senderId, proposition);

        if (result.includes('trouvé')) {
            await sock.sendMessage(chatId, {
                text: result,
                mentions: [senderId]
            });

            await passerTour(sock, chatId, jeu);
        } else {
            await sock.sendMessage(chatId, { text: result });
        }
    }

    // ================= NEXT =================
    else if (body === "#next" && jeu.started) {
        await passerTour(sock, chatId, jeu);
    }

    // ================= SCORE =================
    else if (body === "#score") {
        if (!jeu.started && jeu.players.length === 0) {
            await sock.sendMessage(chatId, { text: "Aucune partie en cours." });
        } else {
            await sock.sendMessage(chatId, {
                text: `📊 Scores:\n${jeu.scoreboard()}`,
                mentions: jeu.players.map(p => p.id)
            });
        }
    }

    // ================= STOP =================
    else if (body === "#stop") {
        jeux[chatId] = new Multiplayer();
        await sock.sendMessage(chatId, {
            text: "Partie réinitialisée. Inscrivez-vous avec 'je m'inscris'."
        });
    }
}

module.exports = multiplayerCommand;