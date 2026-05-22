// ╔══════════════════════════════════════════════════════════════╗
// ║       👻  GHOST TICTACTOE — commands/games/tictactoe.js     ║
// ║          Plateau 3×3 · Aligner 3 · IA 3 niveaux             ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict'

const TicTacToe = require('../../lib/tictactoe')

const games = {}
const scores = {}

// ─────────────────────────────────────────────
//  RENDU PLATEAU 3×3 PROPRE
// ─────────────────────────────────────────────

function renderBoard(game) {
    const board = game.render()
    const winCells = new Set(game.winCells || [])
    const lastMove = game.lastMove

    let lines = []
    const symbols = { 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣' }

    for (let i = 0; i < 9; i++) {
        const v = board[i]
        let char
        if (v === 'X') {
            char = winCells.has(i) ? '❌' : (i === lastMove ? '❌' : '❎')
        } else if (v === 'O') {
            char = winCells.has(i) ? '⭕' : (i === lastMove ? '⭕' : '🟢')
        } else {
            char = symbols[v] || '⬜'
        }
        lines.push(char)
    }

    return `┌───┬───┬───┐
│ ${lines[0]} │ ${lines[1]} │ ${lines[2]} │
├───┼───┼───┤
│ ${lines[3]} │ ${lines[4]} │ ${lines[5]} │
├───┼───┼───┤
│ ${lines[6]} │ ${lines[7]} │ ${lines[8]} │
└───┴───┴───┘`
}

function getScore(jid) {
    if (!scores[jid]) scores[jid] = { wins: 0, losses: 0, draws: 0, streak: 0, bestStreak: 0 }
    return scores[jid]
}

function updateScores(winnerJid, loserJid, isDraw, playerXJid, playerOJid) {
    if (isDraw) {
        [playerXJid, playerOJid].forEach(jid => {
            if (jid && jid !== 'AI') {
                const s = getScore(jid)
                s.draws++
                s.streak = 0
            }
        })
        return
    }
    if (winnerJid && winnerJid !== 'AI') {
        const s = getScore(winnerJid)
        s.wins++
        s.streak++
        if (s.streak > s.bestStreak) s.bestStreak = s.streak
    }
    if (loserJid && loserJid !== 'AI') {
        const s = getScore(loserJid)
        s.losses++
        s.streak = 0
    }
}

function formatScore(jid) {
    const s = getScore(jid)
    const total = s.wins + s.losses + s.draws
    const winPct = total > 0 ? Math.round((s.wins / total) * 100) : 0
    return `✅ ${s.wins}V  ❌ ${s.losses}D  🤝 ${s.draws}N  🔥 ${s.streak}  👑 ${s.bestStreak}  📊 ${winPct}%`
}

// ─────────────────────────────────────────────
//  NETTOYAGE AUTO
// ─────────────────────────────────────────────

setInterval(() => {
    const now = Date.now()
    for (const [id, room] of Object.entries(games)) {
        if (now - (room.lastMove || room.created) > 10 * 60_000) {
            delete games[id]
        }
    }
}, 2 * 60_000)

function helpMessage() {
    return `👻 *GHOST TICTACTOE 3×3*

╔════════════════════════════════════╗
║  Plateau 3×3 · Aligner 3 pour gagner  ║
╚════════════════════════════════════╝

🎮 *Commandes :*
• \`#ttt\` — Attendre un adversaire
• \`#ttt ai\` — VS IA (Difficile)
• \`#ttt ai easy\` — IA Facile 🟢
• \`#ttt ai medium\` — IA Moyenne 🟡
• \`#ttt ai hard\` — IA Difficile 🔴
• \`#ttt <nom>\` — Salle privée

🕹️ *Jouer :*
• \`1\` à \`9\` — Placer votre pièce
• \`quit\` — Abandonner

📊 *Stats :*
• \`#score\` — Vos statistiques
• \`#ranking\` — Classement global

📐 *Numérotation :*
┌───┬───┬───┐
│ 1 │ 2 │ 3 │
├───┼───┼───┤
│ 4 │ 5 │ 6 │
├───┼───┼───┤
│ 7 │ 8 │ 9 │
└───┴───┴───┘`
}

async function tictactoeCommand(sock, chatId, senderId, text) {
    try {
        text = (text || '').trim().toLowerCase()

        if (text === 'help' || text === 'aide') {
            await sock.sendMessage(chatId, { text: helpMessage() })
            return
        }

        const existingRoom = Object.values(games).find(r =>
            [r.game.playerX, r.game.playerO].includes(senderId) && r.state !== 'FINISHED'
        )

        if (existingRoom) {
            await sock.sendMessage(chatId, {
                text: `❌ Vous êtes déjà dans une partie !\nTapez *quit* pour abandonner.`
            })
            return
        }

        // Mode IA
        if (text === 'ai' || text.startsWith('ai ')) {
            const parts = text.split(' ')
            const difficulty = (['easy', 'medium', 'hard'].includes(parts[1]) ? parts[1] : 'hard')
            const diffLabel = { easy: '🟢 Facile', medium: '🟡 Moyen', hard: '🔴 Difficile' }[difficulty]

            const id = 'ttt-' + Date.now()
            const game = new TicTacToe(senderId, 'AI', difficulty)
            const room = { id, chatId, chatIdO: chatId, game, state: 'PLAYING', created: Date.now(), lastMove: Date.now() }
            games[id] = room

            const boardStr = renderBoard(game)

            await sock.sendMessage(chatId, {
                text:
                    `👻 *TICTACTOE VS IA*\n\n` +
                    `🤖 Difficulté : ${diffLabel}\n` +
                    `❎ Vous: X  |  ⭕ IA: O\n\n` +
                    `${boardStr}\n\n` +
                    `🎯 Votre tour ! Tapez *1-9*`
            })
            return
        }

        // Mode multijoueur - chercher salle
        const waitingRoom = Object.values(games).find(r =>
            r.state === 'WAITING' && (!text || r.name === text)
        )

        if (waitingRoom) {
            waitingRoom.chatIdO = chatId
            waitingRoom.game.playerO = senderId
            waitingRoom.state = 'PLAYING'
            waitingRoom.lastMove = Date.now()

            const boardStr = renderBoard(waitingRoom.game)
            const xName = '@' + waitingRoom.game.playerX.split('@')[0]
            const oName = '@' + senderId.split('@')[0]

            const msg =
                `👻 *TICTACTOE — PARTIE COMMENCÉE*\n\n` +
                `❎ ${xName}  vs  ⭕ ${oName}\n\n` +
                `${boardStr}\n\n` +
                `🎲 Tour de ${xName} (❎)\n` +
                `📌 Tapez *1-9*`

            await sock.sendMessage(waitingRoom.chatId, { text: msg, mentions: [waitingRoom.game.playerX, senderId] })
            if (waitingRoom.chatIdO !== waitingRoom.chatId) {
                await sock.sendMessage(waitingRoom.chatIdO, { text: msg, mentions: [waitingRoom.game.playerX, senderId] })
            }
            return
        }

        // Créer nouvelle salle
        const id = 'ttt-' + Date.now()
        const game = new TicTacToe(senderId, 'PENDING', 'hard')
        const room = { id, chatId, chatIdO: chatId, game, state: 'WAITING', name: text || null, created: Date.now(), lastMove: Date.now() }
        games[id] = room

        const joinCmd = text ? `#ttt ${text}` : '#ttt'

        await sock.sendMessage(chatId, {
            text:
                `👻 *SALLE TICTACTOE CRÉÉE*\n\n` +
                `⏳ En attente d'un adversaire...\n` +
                `🎮 Code: \`${id.slice(-6)}\`\n` +
                `📲 Rejoindre avec: *${joinCmd}*\n\n` +
                `⏱ Expire dans 10 minutes`
        })

    } catch (err) {
        console.error('Erreur tictactoeCommand:', err)
        await sock.sendMessage(chatId, { text: '❌ Erreur, réessayez.' })
    }
}

async function handleTicTacToeMove(sock, chatId, senderId, text) {
    try {
        const isQuit = /^(quit|abandon|forfait|gg)$/i.test(text.trim())
        const rawNum = text.replace(/[^\d]/g, '')
        const move = rawNum ? parseInt(rawNum, 10) : NaN

        const room = Object.values(games).find(r =>
            [r.game.playerX, r.game.playerO].includes(senderId) && r.state === 'PLAYING'
        )

        if (!room) return

        if (isQuit) {
            const winner = senderId === room.game.playerX ? room.game.playerO : room.game.playerX
            updateScores(winner, senderId, false, room.game.playerX, room.game.playerO)
            delete games[room.id]

            const winnerName = winner === 'AI' ? '🤖 IA' : '@' + winner.split('@')[0]
            const msg = `🏳️ Abandon !\n🏆 ${winnerName} gagne !`
            await _broadcast(sock, room, msg, [winner].filter(j => j !== 'AI'))
            return
        }

        if (isNaN(move) || move < 1 || move > 9) return

        if (senderId !== room.game.currentTurn) {
            await sock.sendMessage(chatId, { text: '⏳ Pas votre tour !' })
            return
        }

        const isO = senderId === room.game.playerO
        const pos = move - 1
        const ok = room.game.turn(isO, pos)

        if (!ok) {
            await sock.sendMessage(chatId, { text: '❌ Case invalide ou occupée !' })
            return
        }

        room.lastMove = Date.now()

        if (room.game.winner || room.game.isFull) {
            await _handleGameOver(sock, room)
            return
        }

        if (room.game.isAIGame) {
            await _handleAITurn(sock, room)
            return
        }

        await _sendBoardUpdate(sock, room)

    } catch (err) {
        console.error('Erreur handleTicTacToeMove:', err)
    }
}

async function _handleAITurn(sock, room) {
    const thinkTime = { easy: 300, medium: 500, hard: 800 }[room.game.aiDifficulty] || 500
    await new Promise(r => setTimeout(r, thinkTime))

    const aiPos = room.game.playAI()
    if (aiPos === -1) {
        await _handleGameOver(sock, room)
        return
    }

    room.lastMove = Date.now()

    if (room.game.winner || room.game.isFull) {
        await _handleGameOver(sock, room)
        return
    }

    await _sendBoardUpdate(sock, room)
}

async function _handleGameOver(sock, room) {
    const game = room.game
    const isDraw = game.isFull && !game.winner
    const winner = game.winner
    const loser = winner ? (winner === game.playerX ? game.playerO : game.playerX) : null

    delete games[room.id]
    updateScores(winner, loser, isDraw, game.playerX, game.playerO)

    let header
    if (isDraw) {
        header = `🤝 *MATCH NUL !*\nPlus de cases disponibles.`
    } else if (winner === 'AI') {
        header = `🤖 *L'IA GAGNE !*\n💀 Difficulté: ${room.game.aiDifficulty}`
    } else {
        const streak = getScore(winner).streak
        const streakMsg = streak >= 3 ? `\n🔥 Série de ${streak} victoires !` : ''
        header = `🏆 *@${winner.split('@')[0]} GAGNE !*${streakMsg}`
    }

    const msg =
        `${header}\n\n` +
        `${renderBoard(game)}\n\n` +
        `🎮 Rejouer: \`#ttt ai\` ou \`#ttt\``

    const mentions = [game.playerX, game.playerO].filter(j => j && j !== 'AI')
    await _broadcast(sock, room, msg, mentions)
}

async function _sendBoardUpdate(sock, room) {
    const game = room.game
    const current = game.currentTurn
    const tag = current === 'AI' ? '🤖 IA' : '@' + current.split('@')[0]
    const symbol = current === game.playerX ? '❎' : '⭕'

    const msg =
        `${renderBoard(game)}\n\n` +
        `🎲 Tour de ${tag} ${symbol} (${game.turns + 1}/9)\n` +
        `📌 Tapez *1-9*`

    const mentions = [game.playerX, game.playerO].filter(j => j && j !== 'AI')
    await _broadcast(sock, room, msg, mentions)
}

async function _broadcast(sock, room, text, mentions = []) {
    await sock.sendMessage(room.chatId, { text, mentions })
    if (room.chatIdO && room.chatIdO !== room.chatId) {
        await sock.sendMessage(room.chatIdO, { text, mentions })
    }
}

async function scoreCommand(sock, chatId, senderId) {
    const s = getScore(senderId)
    const total = s.wins + s.losses + s.draws
    const winPct = total > 0 ? Math.round((s.wins / total) * 100) : 0

    await sock.sendMessage(chatId, {
        text:
            `📊 *STATS GHOST TICTACTOE*\n\n` +
            `👤 @${senderId.split('@')[0]}\n\n` +
            `✅ Victoires : *${s.wins}*\n` +
            `❌ Défaites  : *${s.losses}*\n` +
            `🤝 Nuls      : *${s.draws}*\n` +
            `📈 Winrate   : *${winPct}%*\n` +
            `🔥 Série     : *${s.streak}*\n` +
            `👑 Record    : *${s.bestStreak}*`,
        mentions: [senderId]
    })
}

async function rankingCommand(sock, chatId) {
    const sorted = Object.entries(scores)
        .filter(([, s]) => s.wins + s.losses + s.draws > 0)
        .sort(([, a], [, b]) => b.wins - a.wins || b.bestStreak - a.bestStreak)
        .slice(0, 10)

    if (!sorted.length) {
        await sock.sendMessage(chatId, { text: '📊 Aucune partie jouée.' })
        return
    }

    const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
    const lines = sorted.map(([jid, s], i) => {
        const tag = '@' + jid.split('@')[0]
        const total = s.wins + s.losses + s.draws
        const pct = total > 0 ? Math.round(s.wins / total * 100) : 0
        return `${medals[i]} ${tag} — ${s.wins}V / ${s.losses}D · ${pct}% · 🔥${s.bestStreak}`
    })

    await sock.sendMessage(chatId, {
        text: `🏆 *CLASSEMENT TICTACTOE*\n\n${lines.join('\n')}`,
        mentions: sorted.map(([jid]) => jid)
    })
}

module.exports = {
    tictactoeCommand,
    handleTicTacToeMove,
    scoreCommand,
    rankingCommand
}