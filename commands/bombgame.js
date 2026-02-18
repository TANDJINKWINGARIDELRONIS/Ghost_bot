const Bomb = require('../lib/bombgame');
const games = {};

async function bombCmd(sock,msg,args){

    const chatId = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    args = args || [];


    // 🧨 CREER PARTIE
    if(!args[0]){

        if(games[chatId])
            return sock.sendMessage(chatId,{text:"❌ Une partie existe déjà"});

        games[chatId] = new Bomb(sender);

        return sock.sendMessage(chatId,{
    text:`💣 *Bomb Timer*

    Hôte : @${sender.split("@")[0]}
    Thème : *${games[chatId].theme}*

    #bomb join pour jouer
    #bomb start pour lancer`,
    mentions:[sender]
    });
    }


    // 👥 JOIN
    if(args[0]==="join"){

        const game = games[chatId];
        if(!game) return sock.sendMessage(chatId,{text:"❌ Aucune partie"});

        if(game.started)
            return sock.sendMessage(chatId,{text:"❌ Déjà commencée"});

        const res = game.addPlayer(sender);
        if(res==="already")
            return sock.sendMessage(chatId,{text:"Tu es déjà dedans 😅"});

        return sock.sendMessage(chatId,{
            text:`✅ @${sender.split("@")[0]} rejoint la partie`,
            mentions:[sender]
        });
    }


    // 🚀 START
    if(args[0]==="start"){

        const game = games[chatId];
        if(!game) return;

        const res = game.start();

        if(res==="players")
            return sock.sendMessage(chatId,{text:"⚠️ Minimum 2 joueurs"});

        await sock.sendMessage(chatId,{
            text:`💣 La bombe est lancée !
    Thème : *${game.theme}*`
        });

        return nextTurn(sock,chatId);
    }


    // 🗣️ REPONDRE
    if(args[0]==="say"){

        const game = games[chatId];
        if(!game || !game.started) return;

        const word = args.slice(1).join(" ");
        if(!word) return;

        const res = game.playWord(sender,word);

        if(res==="turn") return;
        if(res==="used")
            return sock.sendMessage(chatId,{text:"❌ Mot déjà utilisé"});

        clearTimeout(game.timer);

        await sock.sendMessage(chatId,{
            text:`⏱️ @${sender.split("@")[0]} survit !`,
            mentions:[sender]
        });

        return nextTurn(sock,chatId);
    }


    // 🛑 STOP
    if(args[0]==="stop"){
        delete games[chatId];
        sock.sendMessage(chatId,{text:"🛑 Partie arrêtée"});
    }

    }


    // ===== TOUR =====
    async function nextTurn(sock,chatId){

    const game = games[chatId];
    if(!game) return;

    const turn = game.pick();

    if(turn==="win"){
        await sock.sendMessage(chatId,{
            text:`🏆 @${game.alive[0].split("@")[0]} gagne !`,
            mentions:[game.alive[0]]
        });
        delete games[chatId];
        return;
    }

    await sock.sendMessage(chatId,{
        text:`💣 La bombe est chez @${turn.split("@")[0]} !`,
        mentions:[turn]
    });

    game.timer = setTimeout(async ()=>{

        const result = game.explode();

        if(result.type==="win"){
            await sock.sendMessage(chatId,{
                text:`🏆 @${result.winner.split("@")[0]} gagne !`,
                mentions:[result.winner]
            });
            delete games[chatId];
            return;
        }

        await sock.sendMessage(chatId,{
            text:`💥 @${result.dead.split("@")[0]} éliminé !`,
            mentions:[result.dead]
        });

        nextTurn(sock,chatId);

    }, Math.floor(Math.random()*7000)+4000);

}

module.exports = bombCmd;
