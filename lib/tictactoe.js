// ╔══════════════════════════════════════════════════════════════╗
// ║       👻  GHOST TICTACTOE — lib/tictactoe.js v3            ║
// ║        Plateau 3×3 · Aligner 3 · IA 3 niveaux              ║
// ╚══════════════════════════════════════════════════════════════╝

'use strict'

const ROWS = 3
const COLS = 3
const WIN_LENGTH = 3
const TOTAL_CELLS = 9

class TicTacToe {
    constructor(playerX = 'x', playerO = 'o', aiDifficulty = 'hard') {
        this.playerX = playerX
        this.playerO = playerO
        this.aiDifficulty = aiDifficulty
        this.isAIGame = playerO === 'AI'

        this._currentTurn = false
        this.turns = 0
        this._board = Array.from({ length: TOTAL_CELLS }, (_, i) => i + 1)
        this._winner = null
        this._winCells = []
        this._lastMove = null
    }

    get currentTurn() { return this._currentTurn ? this.playerO : this.playerX }
    get winner() { return this._winner }
    get winCells() { return this._winCells }
    get lastMove() { return this._lastMove }
    get board() { return [...this._board] }
    get rows() { return ROWS }
    get cols() { return COLS }
    get winLength() { return WIN_LENGTH }
    get isFull() { return this.turns >= TOTAL_CELLS }

    turn(isO, pos) {
        if (this._winner || pos < 0 || pos >= TOTAL_CELLS) return false
        if (this._board[pos] === 'X' || this._board[pos] === 'O') return false

        const symbol = isO ? 'O' : 'X'
        this._board[pos] = symbol
        this._lastMove = pos
        this.turns++

        const winResult = this._checkWin(symbol, pos)
        if (winResult) {
            this._winner = isO ? this.playerO : this.playerX
            this._winCells = winResult
        }

        this._currentTurn = !this._currentTurn
        return true
    }

    playAI() {
        if (this._winner || this.isFull) return -1

        let pos
        switch (this.aiDifficulty) {
            case 'easy': pos = this._aiEasy(); break
            case 'medium': pos = this._aiMedium(); break
            default: pos = this._aiHard()
        }

        if (pos === -1) return -1
        this.turn(true, pos)
        return pos
    }

    _aiEasy() {
        const empty = this._getEmpty()
        if (!empty.length) return -1
        return empty[Math.floor(Math.random() * empty.length)]
    }

    _aiMedium() {
        // 1. Gagner immédiatement
        const win = this._findBestMove('O')
        if (win !== -1) return win

        // 2. Bloquer victoire X
        const block = this._findBestMove('X')
        if (block !== -1) return block

        // 3. Prendre le centre
        if (this._board[4] !== 'X' && this._board[4] !== 'O') return 4

        // 4. Coin aléatoire
        const corners = [0, 2, 6, 8].filter(p => this._board[p] !== 'X' && this._board[p] !== 'O')
        if (corners.length) return corners[Math.floor(Math.random() * corners.length)]

        // 5. Coup aléatoire
        return this._aiEasy()
    }

    _aiHard() {
        // Algorithme minimax pour une IA parfaite
        return this._minimax()
    }

    _minimax() {
        let bestScore = -Infinity
        let bestMove = -1

        for (const pos of this._getEmpty()) {
            this._board[pos] = 'O'
            const score = this._minimaxScore(false)
            this._board[pos] = pos + 1

            if (score > bestScore) {
                bestScore = score
                bestMove = pos
            }
        }
        return bestMove
    }

    _minimaxScore(isMaximizing) {
        // Vérifier victoire
        if (this._checkWin('O', this._lastMove)) return 10
        if (this._checkWin('X', this._lastMove)) return -10
        if (this.isFull) return 0

        if (isMaximizing) {
            let bestScore = -Infinity
            for (const pos of this._getEmpty()) {
                this._board[pos] = 'O'
                const score = this._minimaxScore(false)
                this._board[pos] = pos + 1
                bestScore = Math.max(score, bestScore)
            }
            return bestScore
        } else {
            let bestScore = Infinity
            for (const pos of this._getEmpty()) {
                this._board[pos] = 'X'
                const score = this._minimaxScore(true)
                this._board[pos] = pos + 1
                bestScore = Math.min(score, bestScore)
            }
            return bestScore
        }
    }

    _findBestMove(symbol) {
        const empty = this._getEmpty()
        for (const pos of empty) {
            this._board[pos] = symbol
            const wins = this._checkWin(symbol, pos)
            this._board[pos] = pos + 1
            if (wins) return pos
        }
        return -1
    }

    _checkWin(symbol, lastPos) {
        if (lastPos === undefined || lastPos === null) return null

        const r0 = Math.floor(lastPos / COLS)
        const c0 = lastPos % COLS
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]

        for (const [dr, dc] of directions) {
            let cells = [lastPos]

            for (let s of [1, -1]) {
                for (let i = 1; i < WIN_LENGTH; i++) {
                    const nr = r0 + dr * i * s
                    const nc = c0 + dc * i * s
                    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) break
                    const idx = nr * COLS + nc
                    if (this._board[idx] === symbol) cells.push(idx)
                    else break
                }
            }

            if (cells.length >= WIN_LENGTH) return cells.slice(0, WIN_LENGTH)
        }
        return null
    }

    _getEmpty() {
        return this._board
            .map((v, i) => (v !== 'X' && v !== 'O' ? i : -1))
            .filter(i => i !== -1)
    }

    render() { return [...this._board] }

    reset() {
        this._currentTurn = false
        this.turns = 0
        this._board = Array.from({ length: TOTAL_CELLS }, (_, i) => i + 1)
        this._winner = null
        this._winCells = []
        this._lastMove = null
    }

    toJSON() {
        return {
            playerX: this.playerX,
            playerO: this.playerO,
            aiDifficulty: this.aiDifficulty,
            isAIGame: this.isAIGame,
            currentTurn: this._currentTurn,
            turns: this.turns,
            board: this._board,
            winner: this._winner,
            winCells: this._winCells,
            lastMove: this._lastMove,
        }
    }

    static fromJSON(data) {
        const g = new TicTacToe(data.playerX, data.playerO, data.aiDifficulty)
        g._currentTurn = data.currentTurn
        g.turns = data.turns
        g._board = data.board
        g._winner = data.winner
        g._winCells = data.winCells
        g._lastMove = data.lastMove
        return g
    }
}

module.exports = TicTacToe