const TicTacToe = require('../lib/tictactoe');

// Stocker les parties globalement
const games = {};


async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        // Vérifier si le joueur est déjà dans une partie
        if (Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId)
        )) {
            await sock.sendMessage(chatId, { 
                text: '❌ Vous êtes déjà dans une partie. Tapez *quit* pour quitter.' 
            });
            return;
        }

        // Rechercher une salle existante
        let room = Object.values(games).find(room => 
            room.state === 'WAITING' && 
            (text ? room.name === text : true)
        );

        if (room) {
            // Rejoindre une salle existante
            room.o = chatId;
            room.game.playerO = senderId;
            room.state = 'PLAYING';

            const arr = room.game.render().map(v => ({
                'X': '❎',
                'O': '⭕',
                '1': '1️⃣',
                '2': '2️⃣',
                '3': '3️⃣',
                '4': '4️⃣',
                '5': '5️⃣',
                '6': '6️⃣',
                '7': '7️⃣',
                '8': '8️⃣',
                '9': '9️⃣',
                '10':'🔟',
                '11':'1️⃣',
                '12':'2️⃣',
                '13':'3️⃣',
                '14':'4️⃣',
                '15':'5️⃣',
                '16':'6️⃣',
                '17':'7️⃣',
                '18':'8️⃣',
                '19':'9️⃣',
                '20':'🔟',
                '21':'1️⃣',
                '22':'2️⃣',
                '23':'3️⃣',
                '24':'4️⃣',
                '25':'5️⃣',
                '26':'6️⃣',
                '27':'7️⃣',
                '28':'8️⃣',
                '29':'9️⃣',
                '30':'🔟',
                '31':'1️⃣',
                '32':'2️⃣',
                '33':'3️⃣',
                '34':'4️⃣',
                '35':'5️⃣',
                '36':'6️⃣',
                '37':'7️⃣',
                '38':'8️⃣',
                '39':'9️⃣',
                '40':'🔟',
                '41':'1️⃣',
                '42':'2️⃣',
                '43':'3️⃣',
                '44':'4️⃣',
                '45':'5️⃣',
                '46':'6️⃣',
                '47':'7️⃣',
                '48':'8️⃣',
                '49':'9️⃣',
                '50':'🔟','51':'1️⃣','52':'2️⃣','53':'3️⃣','54':'4️⃣','55':'5️⃣','56':'6️⃣','57':'7️⃣','58':'8️⃣','59':'9️⃣','60':'🔟',
                '61':'1️⃣','62':'2️⃣','63':'3️⃣','64':'4️⃣','65':'5️⃣','66':'6️⃣','67':'7️⃣','68':'8️⃣','69':'9️⃣','70':'🔟',
                '71':'1️⃣','72':'2️⃣','73':'3️⃣','74':'4️⃣','75':'5️⃣','76':'6️⃣','77':'7️⃣','78':'8️⃣','79':'9️⃣','80':'🔟',
                '81':'1️⃣','82':'2️⃣','83':'3️⃣','84':'4️⃣','85':'5️⃣','86':'6️⃣','87':'7️⃣','88':'8️⃣','89':'9️⃣','90':'🔟',
                '91':'1️⃣','92':'2️⃣','93':'3️⃣','94':'4️⃣','95':'5️⃣','96':'6️⃣','97':'7️⃣','98':'8️⃣','99':'9️⃣','100':'🔟'

            }[v]));

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

${arr.slice(0, 10).join('')}
${arr.slice(10, 20).join('')}
${arr.slice(20, 30).join('')}
${arr.slice(30, 40).join('')}
${arr.slice(40, 50).join('')}
${arr.slice(50, 60).join('')}
${arr.slice(60, 70).join('')}
${arr.slice(70, 80).join('')}
${arr.slice(80, 90).join('')}
${arr.slice(90, 100).join('')}

▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 4 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez *move numeor(1-100) pour placer votre symbole
• Le premier chiffre de la 2 ligne correspond à la position 11, le premier de la 3ème ligne à 21, etc.
• Tapez *quit* pour abandonner
`;

            // Envoyer le message une seule fois au groupe
            await sock.sendMessage(chatId, { 
                text: str,
                mentions: [room.game.currentTurn, room.game.playerX, room.game.playerO]
            });

        } else {
            // Créer une nouvelle salle
            room = {
                id: 'tictactoe-' + (+new Date),
                x: chatId,
                o: '',
                game: new TicTacToe(senderId, 'o'),
                state: 'WAITING'
            };

            if (text) room.name = text;

            await sock.sendMessage(chatId, { 
                text: `⏳ *En attente d’un adversaire*\nTapez **accept* ${text || ''}* pour rejoindre !`
            });

            games[room.id] = room;
        }

    } catch (error) {
        console.error('Erreur dans la commande tictactoe :', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Erreur lors du démarrage de la partie. Veuillez réessayer.' 
        });
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        const isquit = /^(quit|give up)$/i.test(text);

        const cleaned = text.replace(/[^\d]/g, '');
        const move = cleaned ? parseInt(cleaned, 10) : NaN;

        const room = Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId) && 
            room.state === 'PLAYING'
        );

        if (!room) return;

        if (!isquit && (!Number.isInteger(move) || move < 1 || move > 100)) {
            await sock.sendMessage(chatId, {
                text: '❌ Choisis une position entre 1 et 100.'
            });
            return;
        }

        if (senderId !== room.game.currentTurn && !isquit) {
            await sock.sendMessage(chatId, { 
                text: '❌ Ce n’est pas ton tour !' 
            });
            return;
        }

        const ok = isquit ? true : room.game.turn(
            senderId === room.game.playerO,
            move - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, {
                text: '❌ Cette case est déjà occupée.'
            });
            return;
        }

        let winner = room.game.winner;
        let isTie = room.game.turns === 100;

        const arr = room.game.render().map(v => ({
            'X': '❎',
            'O': '⭕',
            '1': '1️⃣','2':'2️⃣','3':'3️⃣','4':'4️⃣','5':'5️⃣','6':'6️⃣','7':'7️⃣','8':'8️⃣','9':'9️⃣','10':'🔟',
            '11':'1️⃣','12':'2️⃣','13':'3️⃣','14':'4️⃣','15':'5️⃣','16':'6️⃣','17':'7️⃣','18':'8️⃣','19':'9️⃣','20':'🔟',
            '21':'1️⃣','22':'2️⃣','23':'3️⃣','24':'4️⃣','25':'5️⃣','26':'6️⃣','27':'7️⃣','28':'8️⃣','29':'9️⃣','30':'🔟',
            '31':'1️⃣','32':'2️⃣','33':'3️⃣','34':'4️⃣','35':'5️⃣','36':'6️⃣','37':'7️⃣','38':'8️⃣','39':'9️⃣','40':'🔟',
            '41':'1️⃣','42':'2️⃣','43':'3️⃣','44':'4️⃣','45':'5️⃣','46':'6️⃣','47':'7️⃣','48':'8️⃣','49':'9️⃣','50':'🔟',
            '51':'1️⃣','52':'2️⃣','53':'3️⃣','54':'4️⃣','55':'5️⃣','56':'6️⃣','57':'7️⃣','58':'8️⃣','59':'9️⃣','60':'🔟',
            '61':'1️⃣','62':'2️⃣','63':'3️⃣','64':'4️⃣','65':'5️⃣','66':'6️⃣','67':'7️⃣','68':'8️⃣','69':'9️⃣','70':'🔟',
            '71':'1️⃣','72':'2️⃣','73':'3️⃣','74':'4️⃣','75':'5️⃣','76':'6️⃣','77':'7️⃣','78':'8️⃣','79':'9️⃣','80':'🔟',
            '81':'1️⃣','82':'2️⃣','83':'3️⃣','84':'4️⃣','85':'5️⃣','86':'6️⃣','87':'7️⃣','88':'8️⃣','89':'9️⃣','90':'🔟',
            '91':'1️⃣','92':'2️⃣','93':'3️⃣','94':'4️⃣','95':'5️⃣','96':'6️⃣','97':'7️⃣','98':'8️⃣','99':'9️⃣','100':'🔟',
        }[v]));

        if (isquit) {
            // Définir le gagnant comme l’adversaire
            winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX;
            
            await sock.sendMessage(chatId, { 
                text: `🏳️ @${senderId.split('@')[0]} a abandonné ! @${winner.split('@')[0]} remporte la partie !`,
                mentions: [senderId, winner]
            });
            
            delete games[room.id];
            return;
        }

        let gameStatus;
        if (winner) {
            gameStatus = `🎉 @${winner.split('@')[0]} remporte la partie !`;
        } else if (isTie) {
            gameStatus = `🤝 La partie se termine par un match nul !`;
        } else {
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${senderId === room.game.playerX ? '⭕' : '❎'})`;
        }

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

${arr.slice(0, 10).join('')}
${arr.slice(10, 20).join('')}
${arr.slice(20, 30).join('')}
${arr.slice(30, 40).join('')}
${arr.slice(40, 50).join('')}
${arr.slice(50, 60).join('')}
${arr.slice(60, 70).join('')}
${arr.slice(70, 80).join('')}
${arr.slice(80, 90).join('')}
${arr.slice(90, 100).join('')}

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Tapez un numéro (1-100) pour jouer\n• Tapez *quit* pour abandonner' : ''}
`;

        const mentions = [
            room.game.playerX, 
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, { 
            text: str,
            mentions: mentions
        });

        if (room.x !== room.o) {
            await sock.sendMessage(room.o, { 
                text: str,
                mentions: mentions
            });
        }

        if (winner || isTie) {
            delete games[room.id];
        }

    } catch (error) {
        console.error('Erreur dans le coup tictactoe :', error);
    }
}


module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};