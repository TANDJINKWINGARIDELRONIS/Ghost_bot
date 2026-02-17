const civilsWords = [
    "maison","eau","pain","telephone","ecole",
    "route","table","chaise","voiture","soleil"
];

const ucWords = [
    "appartement","boisson","baguette","portable","college",
    "avenue","bureau","fauteuil","automobile","lumiere"
];

class Undercover {
    constructor(host) {
        this.host = host;
        this.players = [host];
        this.civils = [];
        this.undercovers = [];
        this.word = null;
        this.votes = {};
        this.started = false;
        this.currentTurnIndex = 0;
        this.turnTime = 30; // secondes par joueur
        this.turnInterval = null;

    }

    addPlayer(jid) {
        if (!this.started && !this.players.includes(jid)) {
            this.players.push(jid);
        }
    }

    determineUndercoverCount() {
        const n = this.players.length;

        if (n <= 4) return 1;
        if (n <= 7) return 2;
        if (n <= 10) return 3;
        return 4;
    }
    startGame() {
        const index = Math.floor(Math.random() * civilsWords.length);

        this.civilWord = civilsWords[index];
        this.ucWord = ucWords[index];

        this.started = true;
        this.votes = {};

        const undercoverCount = this.determineUndercoverCount();

        const shuffled = [...this.players].sort(() => 0.5 - Math.random());

        this.undercovers = shuffled.slice(0, undercoverCount);
        this.civils = shuffled.slice(undercoverCount);
    }

    async sendWord(sock) {
    for (const player of this.players) {

        let messageWord;
        let role;

        if (this.undercovers.includes(player)) {
            messageWord = this.ucWord;
            role = "🕵️ UNDERCOVER";
        } else {
            messageWord = this.civilWord;
            role = "👨‍🌾 CIVIL";
        }

        await sock.sendMessage(player, {
            text:
        `🎭 *TON ROLE*

        ${role}

        🤫 Ton mot est : *${messageWord}*

        ⚠️ Ne montre pas ce message aux autres joueurs !`
                });
            }
    }
    async startDescriptionPhase(sock, chatId) {

    if (!this.started) return;

    this.currentTurnIndex = 0;

    const nextTurn = async () => {

        if (this.currentTurnIndex >= this.players.length) {

            clearInterval(this.turnInterval);

            await sock.sendMessage(chatId, {
                text: "🗳️ Tous les joueurs ont parlé ! Phase de vote !\nUtilisez *#uc vote @joueur*"
            });

            return;
        }

        const currentPlayer = this.players[this.currentTurnIndex];

        await sock.sendMessage(chatId, {
            text: `🎤 C'est au tour de @${currentPlayer.split("@")[0]} !
                ⏳ Tu as ${this.turnTime} secondes pour décrire ton mot.`,
                mentions: [currentPlayer]
        });

        let timeLeft = this.turnTime;

        this.turnInterval = setInterval(async () => {

            timeLeft--;

            if (timeLeft === 10) {
                await sock.sendMessage(chatId, {
                    text: `⏰ Plus que 10 secondes @${currentPlayer.split("@")[0]} !`,
                    mentions: [currentPlayer]
                });
            }

            if (timeLeft <= 0) {

                clearInterval(this.turnInterval);

                await sock.sendMessage(chatId, {
                    text: `⌛ Temps écoulé pour @${currentPlayer.split("@")[0]} !`,
                    mentions: [currentPlayer]
                });

                this.currentTurnIndex++;

                setTimeout(nextTurn, 2000);
                    }

                }, 1000);

            };

            nextTurn();
        }



    vote(voter, target) {
        if (!this.started) return "La partie n'a pas commencé.";
        if (!this.players.includes(voter)) return "Tu ne participes pas.";
        if (!this.players.includes(target)) return "Joueur invalide.";
        if (this.votes[voter]) return "Tu as déjà voté.";

        this.votes[voter] = target;
        return null;
    }

    allVoted() {
        return Object.keys(this.votes).length === this.players.length;
    }

    countVotes() {
        const count = {};

        for (const target of Object.values(this.votes)) {
            count[target] = (count[target] || 0) + 1;
        }

        let eliminated = null;
        let max = 0;

        for (const player in count) {
            if (count[player] > max) {
                max = count[player];
                eliminated = player;
            }
        }

        return eliminated;
    }

    eliminate(player) {
        this.players = this.players.filter(p => p !== player);
        this.civils = this.civils.filter(p => p !== player);
        this.undercovers = this.undercovers.filter(p => p !== player);
    }

    checkWin() {
        if (this.undercovers.length === 0) {
            return "civils";
        }

        if (this.undercovers.length >= this.civils.length) {
            return "undercovers";
        }

        return null;
    }
}

module.exports = Undercover;
