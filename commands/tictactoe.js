const TicTacToe = require('../lib/tictactoe');

// Stocker les parties globalement
const games = {};

// --- Commande pour démarrer ou rejoindre une partie ---
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

            const boardStr = renderTicTacToeBoard(room);

            const str = `
🎮 *Partie TicTacToe commencée !*

En attente du tour de @${room.game.currentTurn.split('@')[0]}...

${boardStr}

▢ *ID de la salle :* ${room.id}
▢ *Règles :*
• Alignez 3 symboles verticalement, horizontalement ou en diagonale pour gagner
• Tapez un numéro (1-18) pour placer votre symbole
• Tapez *#surrender* pour abandonner
`;

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

// --- Fonction pour gérer les coups et afficher le plateau ---
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
        
        // Vérifier si le numéro est valide 1-18
        if (!isSurrender && !/^(1[0-8]|[1-9])$/.test(text.trim())) return;

        // Vérifier que c'est bien le tour du joueur
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
        let isTie = room.game.turns === 18;

        if (isSurrender) {
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
            gameStatus = `🎲 Tour de : @${room.game.currentTurn.split('@')[0]} (${room.game.currentTurn === room.game.playerX ? '❎' : '⭕'})`;
        }

        const boardStr = renderTicTacToeBoard(room);

        const str = `
🎮 *Partie TicTacToe*

${gameStatus}

${boardStr}

▢ Joueur ❎ : @${room.game.playerX.split('@')[0]}
▢ Joueur ⭕ : @${room.game.playerO.split('@')[0]}

${!winner && !isTie ? '• Tapez un numéro (1-18) pour jouer\n• Tapez *#surrender* pour abandonner' : ''}
`;

        const mentions = [
            room.game.playerX, 
            room.game.playerO,
            ...(winner ? [winner] : [room.game.currentTurn])
        ];

        await sock.sendMessage(room.x, { text: str, mentions });
        if (room.x !== room.o) await sock.sendMessage(room.o, { text: str, mentions });

        if (winner || isTie) delete games[room.id];

    } catch (error) {
        console.error('Erreur dans le coup tictactoe :', error);
    }
}

// --- Fonction pour générer le plateau 18 cases avec emojis ---
function renderTicTacToeBoard(room) {
    const board = room.game.render(); // 18 cases
    const arr = board.map(v => {
        if (v === 'X') return '❎';
        if (v === 'O') return '⭕';

        const n = Number(v);
        if (n >= 1 && n <= 9) return `${n}️⃣`;
        if (n === 10) return '🔟';
        if (n > 10 && n <= 18) return `1️⃣${n - 10}️⃣`;
        return v;
    });

    const rows = [];
    for (let i = 0; i < 18; i += 3) {
        rows.push(arr.slice(i, i + 3).join(''));
    }

    return rows.join('\n');
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove
};