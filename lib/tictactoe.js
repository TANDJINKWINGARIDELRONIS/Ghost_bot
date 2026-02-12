class TicTacToe {
    constructor(playerX = 'x', playerO = 'o') {
        this.playerX = playerX;
        this.playerO = playerO;
        this._currentTurn = false; // false = X, true = O
        this.turns = 0;

        // Plateau 18 cases, initialisé avec les numéros
        this._board = Array.from({ length: 18 }, (_, i) => (i + 1));
        this._winner = null;
    }

    get currentTurn() {
        return this._currentTurn ? this.playerO : this.playerX;
    }

    get winner() {
        return this._winner;
    }

    turn(isO, pos) {
        if (this._winner || pos < 0 || pos >= 18) return false;
        if (this._board[pos] === 'X' || this._board[pos] === 'O') return false;

        this._board[pos] = isO ? 'O' : 'X';
        this.turns++;

        if (this.checkWin(isO ? 'O' : 'X')) {
            this._winner = this._currentTurn ? this.playerO : this.playerX;
        }

        this._currentTurn = !this._currentTurn;
        return true;
    }

    render() {
        return this._board;
    }

    // Vérifie victoire 3 symboles sur 3x6
    checkWin(symbol) {
        const cols = 3;
        const rows = 6;

        // Horizontal
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c <= cols - 3; c++) {
                const i = r * cols + c;
                if (
                    this._board[i] === symbol &&
                    this._board[i + 1] === symbol &&
                    this._board[i + 2] === symbol
                ) return true;
            }
        }

        // Vertical
        for (let c = 0; c < cols; c++) {
            for (let r = 0; r <= rows - 3; r++) {
                const i = r * cols + c;
                if (
                    this._board[i] === symbol &&
                    this._board[i + cols] === symbol &&
                    this._board[i + 2 * cols] === symbol
                ) return true;
            }
        }

        // Diagonal ↘
        for (let r = 0; r <= rows - 3; r++) {
            for (let c = 0; c <= cols - 3; c++) {
                const i = r * cols + c;
                if (
                    this._board[i] === symbol &&
                    this._board[i + cols + 1] === symbol &&
                    this._board[i + 2 * (cols + 1)] === symbol
                ) return true;
            }
        }

        // Diagonal ↙
        for (let r = 0; r <= rows - 3; r++) {
            for (let c = 2; c < cols; c++) {
                const i = r * cols + c;
                if (
                    this._board[i] === symbol &&
                    this._board[i + cols - 1] === symbol &&
                    this._board[i + 2 * (cols - 1)] === symbol
                ) return true;
            }
        }

        return false;
    }
}

module.exports = TicTacToe;