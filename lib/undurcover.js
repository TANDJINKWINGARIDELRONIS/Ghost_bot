const mots = ["maison", "eau", "pain", "telephone", "ecole", "route", "table",
    "chaise", "voiture", "soleil", "lune", "ami", "famille", "travail", "marche", "argent",
    "porte", "fenetre", "sac", "stylo"
];

class Undercover {
    constructor(host) {
        this.players = [host];
        this.currentPlayerIndex = 0;

        this.round = 0;
        
    }
    addPlayer(jid) {
        if (!this.players.includes(jid)) {
            this.players.push(jid);
        }
    }
    sendword() {
        for (const player of this.players) {
            return sock.sendMessage(player.jid, {
                text: `🤫 Ton mot est : *${ mots[Math.floor(Math.random() * mots.length)]}*`
            });
        }
    }      
    get currentTurn() {
        return this.players[this.currentPlayerIndex];
    }
    switchTurn() {
        this.currentPlayerIndex =
            (this.currentPlayerIndex + 1) % this.players.length;
    }
    getWinner() {
        if (this.players.length === 1) {
            return this.players[0];
        }
        return null;
    }

}