class BombGame {

    constructor(host){
        this.host = host;
        this.players = [host];
        this.alive = [];
        this.turn = null;
        this.started = false;
        this.used = [];
        this.timer = null;

        const themes = [
            "Animaux","Pays","Fruits","Métiers","Sports",
            "Capitales","Couleurs","Objets maison","Marques","Anime"
        ];

        this.theme = themes[Math.floor(Math.random()*themes.length)];
    }

    addPlayer(id){
        if(this.players.includes(id)) return "already";
        this.players.push(id);
    }

    start(){
        if(this.players.length < 2) return "players";
        this.started = true;
        this.alive = [...this.players];
    }

    pick(){
        if(this.alive.length === 1) return "win";
        this.turn = this.alive[Math.floor(Math.random()*this.alive.length)];
        return this.turn;
    }

    playWord(sender,word){

        if(sender !== this.turn) return "turn";

        word = word.toLowerCase();

        if(this.used.includes(word)) return "used";

        this.used.push(word);
        return "ok";
    }

    explode(){
        const dead = this.turn;
        this.alive = this.alive.filter(p=>p!==dead);

        if(this.alive.length === 1)
            return {type:"win",winner:this.alive[0]};

        return {type:"dead",dead};
    }
}

module.exports = BombGame;
