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
                text: '❌ Vous êtes déjà dans une partie. Tapez *#surrender* pour quitter.' 
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
                '11':'1️⃣1️⃣',
                '12':'1️⃣2️⃣',
                '13':'1️⃣3️⃣',
                '14':'1️⃣4️⃣',
                '15':'1️⃣5️⃣',
                '16':'1️⃣6️⃣',
                '17':'1️⃣7️⃣',
                '18':'1️⃣8️⃣',
            }[v]));

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6, 9).join('')}
${arr.slice(9, 12).join('')}
${arr.slice(12, 15).join('')}
${arr.slice(15, 18).join('')}

▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 3 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez un numéro (1-18) pour placer votre symbole
• Tapez *#surrender* pour abandonner
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
                text: `⏳ *En attente d’un adversaire*\nTapez *#ttt${text || ''}* pour rejoindre !`
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
        // Trouver la partie du joueur
        const room = Object.values(games).find(room => 
            room.id.startsWith('tictactoe') && 
            [room.game.playerX, room.game.playerO].includes(senderId) && 
            room.state === 'PLAYING'
        );

        if (!room) return;

        const isSurrender = /^(surrender|give up)$/i.test(text);
        
        // ⚡ CORRECTION Regex pour 1-18
        if (!isSurrender && !/^(1[0-8]|[1-9])$/.test(text.trim())) return;

        // Autoriser l’abandon à tout moment
        if (senderId !== room.game.currentTurn && !isSurrender) {
            await sock.sendMessage(chatId, { 
                text: '❌ Ce n’est pas votre tour !' 
            });
            return;
        }

        let ok = isSurrender ? true : room.game.turn(
            senderId === room.game.playerO,
            parseInt(text) - 1
        );

        if (!ok) {
            await sock.sendMessage(chatId, { 
                text: '❌ Coup invalide ! Cette position est déjà occupée.' 
            });
            return;
        }

        let winner = room.game.winner;
        // ⚡ CORRECTION Tie pour 18 cases
        let isTie = room.game.turns === 18;

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
            '11':'1️⃣1️⃣',
            '12':'1️⃣2️⃣',
            '13':'1️⃣3️⃣',
            '14':'1️⃣4️⃣',
            '15':'1️⃣5️⃣',
            '16':'1️⃣6️⃣',
            '17':'1️⃣7️⃣',
            '18':'1️⃣8️⃣',
        }[v]));

        if (isSurrender) {
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
            gameStatus = `🎉 @${winner.split('@')[0]} *remporte la partie !*`;
        } else if (isTie) {
            gameStatus = `🤝 *La partie se termine par un match nul !*`;
        } else {
            // ⚡ CORRECTION symbole du joueur courant
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${room.game.currentTurn === room.game.playerX ? '❎' : '⭕'})`;
        }

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

${arr.slice(0, 3).join('')}
${arr.slice(3, 6).join('')}
${arr.slice(6, 9).join('')}
${arr.slice(9, 12).join('')}
${arr.slice(12, 15).join('')}
${arr.slice(15, 18).join('')}

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Tapez un numéro (1-18) pour jouer\n• Tapez *#surrender* pour abandonner' : ''}
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