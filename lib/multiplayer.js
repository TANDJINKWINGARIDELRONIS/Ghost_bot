class Multiplayer {

    constructor(maxRounds = 5) {
        this.players = []; // {id, name, score}
        this.round = 0;
        this.turnIndex = 0;
        this.maxRounds = maxRounds;

        this.started = false;
        this.currentWord = null;
        this.currentCluePlayer = null;
        this.hasGuessed = false;
    }

    // ================= INSCRIPTION =================
    addPlayer(id, name) {

        if (this.started) return "La partie a déjà commencé";

        if (this.players.find(p => p.id === id))
            return "Déjà inscrit";

        this.players.push({ id, name, score: 0 });
        return `${name} inscrit ✅`;
    }

    // ================= LANCER PARTIE =================
    start(wordsList) {

        if (this.players.length < 2)
            return "Minimum 3 joueurs requis";

        this.started = true;
        this.round = 1;
        this.chooseWord(wordsList);

        return `🎮 Partie lancée\nManche 1\nAu tour de ${this.currentCluePlayer.name} de donner un indice`;
    }

    // ================= CHOISIR MOT =================
    chooseWord(wordsList) {

        this.currentWord = wordsList[Math.floor(Math.random() * wordsList.length)];
        this.turnIndex = 0;
        this.currentCluePlayer = this.players[this.turnIndex];
        this.hasGuessed = false;
    }

    // ================= JOUEUR QUI DONNE INDICE =================
    getCluePlayer() {
        return this.currentCluePlayer;
    }

    // ================= DEVINER =================
    guess(playerId, word) {

        if (!this.started) return "La partie n'a pas commencé";

        if (playerId === this.currentCluePlayer.id)
            return "Tu ne peux pas deviner ton propre mot";

        if (this.hasGuessed)
            return "Mot déjà trouvé pour ce tour";

        if (word.toLowerCase() === this.currentWord.toLowerCase()) {

            let player = this.players.find(p => p.id === playerId);
            player.score += 2;

            this.currentCluePlayer.score += 1;

            this.hasGuessed = true;

            return `💡 ${player.name} a trouvé le mot ! (+2 pts)\n${this.currentCluePlayer.name} gagne +1 pt`;
        }

        return "❌ Mauvaise réponse";
    }

    // ================= TOUR SUIVANT =================
    nextTurn(wordsList) {

        if (!this.started) return "Partie non démarrée";

        this.turnIndex++;

        // Tous les joueurs ont donné un indice → nouvelle manche
        if (this.turnIndex >= this.players.length) {

            this.round++;

            if (this.round > this.maxRounds) {
                this.started = false;
                return this.getWinner();
            }

            this.chooseWord(wordsList);

            return `📢 Nouvelle manche ${this.round}\nAu tour de ${this.currentCluePlayer.name}`;
        }

        this.currentCluePlayer = this.players[this.turnIndex];
        this.hasGuessed = false;

        return `Au tour de ${this.currentCluePlayer.name} de donner un indice`;
    }

    // ================= SCORE =================
    scoreboard() {
        return this.players
            .map(p => `${p.name} : ${p.score} pts`)
            .join("\n");
    }

    // ================= VAINQUEUR =================
    getWinner() {

        let best = [...this.players].sort((a,b)=>b.score-a.score)[0];

        return `🏆 Partie terminée\nVainqueur : ${best.name} (${best.score} pts)\n\nScores:\n${this.scoreboard()}`;
    }
}