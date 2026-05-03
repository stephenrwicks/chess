type Coordinate = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
type Direction = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';
type PieceNotation = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

class ChessGame {

    board = new ChessBoard();
    #fen = '';
    #pieceSymbols = {
        k: '♚',
        q: '♛',
        r: '♜',
        b: '♝',
        n: '♞',
        p: '♟',
        K: '♔',
        Q: '♕',
        R: '♖',
        B: '♗',
        N: '♘',
        P: '♙',
    };


    get fen() {
        return this.#fen;
    }

    get fenReader() {
        return new FenReader(this.#fen);
    }

    loadFen(fen: string) {
        const fenReader = new FenReader(fen);
        this.#fen = fen;
        for (const [coordinate, div] of Object.entries(this.board.squares)) {
            const piece = fenReader.getPieceByCoordinate(coordinate as Coordinate);
            div.replaceChildren(piece ? this.#buildPiece(piece) : '');
        }
        return fenReader;
    }

    newGame() {
        return this.loadFen(FenReader.startingFen);
    }

    #buildPiece(pieceNotation: PieceNotation) {

        const div = document.createElement('div');
        div.textContent = this.#pieceSymbols[pieceNotation];
        div.dataset.piece = pieceNotation;
        div.className = `piece ${pieceNotation.toUpperCase() === pieceNotation ? 'w' : 'b'}`;
        let isMoving = false;
        let offsetX = 0;
        let offsetY = 0;

        // Emits events somewhere

        const handleDown = (e: PointerEvent) => {
            if (!div.parentElement?.classList.contains('square')) return;
            isMoving = true;
            div.style.position = 'absolute';
            offsetX = div.getBoundingClientRect().width / 2;
            offsetY = div.getBoundingClientRect().height / 2;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp, { once: true });
        };
        const handleMove = (e: PointerEvent) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
        };
        const handleUp = (e: PointerEvent) => {

            div.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            isMoving = false;

            const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY)
                .find(el => el instanceof HTMLDivElement && el.classList.contains('square') && this.board.contains(el));

            if (hoveredSquare) {
                div.dispatchEvent(new CustomEvent('request-move', {
                    detail: {
                        fromSquare: div.parentElement,
                        toSquare: hoveredSquare,
                    },
                    bubbles: true,
                }));
            }

        };

        div.addEventListener('pointerdown', handleDown);
        return div;

    }

    #diffBoard() {

    }

}


class ChessBoard extends HTMLElement {

    #initialized = false;
    squares: Record<string, HTMLDivElement> = {};
    constructor() {
        super();
    }

    connectedCallback() {
        if (this.#initialized) return;
        this.className = 'board';
        let dark = false;
        for (const rank of [8, 7, 6, 5, 4, 3, 2, 1]) {
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                const square = document.createElement('div');
                square.className = 'square';
                if (dark) square.classList.add('dark');
                square.dataset.coordinate = `${file}${rank}`;
                this.squares[`${file}${rank}`] = square;
                this.append(square);
                dark = !dark;
            }
            dark = !dark;
        }
        this.addEventListener('request-move', (e) => {
            const { fromSquare, toSquare } = (e as CustomEvent).detail;
        });
        this.#initialized = true;
    }

}


customElements.define('chess-board', ChessBoard);


const x = new ChessGame();
document.body.replaceChildren(x.board);

class FenReader {

    // Class instances of FenReader are designed to be immutable. 
    // We parse the string and derive game state, move legality, etc.

    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen: string;

    #threeFoldRepetition: Record<string, number> = {}; // Does this belong in game, etc? Prob

    constructor(fen: string = FenReader.startingFen) {
        this.#fen = fen;
    }

    get fen() {
        return this.#fen;
    }

    get piecePlacement() {
        return this.#fen.split(' ')[0];
    }

    get activeColor() {
        return this.#fen.split(' ')[1] as 'w' | 'b';
    }

    get castlingRights() {
        return this.#fen.split(' ')[2];
    }

    get enPassantTarget() {
        return this.#fen.split(' ')[3] as '-' | Coordinate;
    }

    /** Used for 50 move rule */
    get halfMoveClock() {
        return this.#fen.split(' ')[4];
    }

    get fullMoveNumber() {
        return this.#fen.split(' ')[5];
    }

    get isCheck() {
        return false;
    }

    get isCheckmate() {
        if (!this.isCheck) return false;
        return false;
    }

    get isStalemate() {
        return false;
    }

    get isRepetition() {
        return false;
    }

    get is50MoveRule() {
        return Number(this.halfMoveClock) >= 50;
    }

    get isGameOver() {
        return false;
    }

    get inactiveColor() {
        return this.activeColor === 'w' ? 'b' : 'w';
    }

    get coordinateObject(): Record<Coordinate, PieceNotation | null> {
        const result = {} as Record<Coordinate, PieceNotation | null>;
        for (const file of 'abcdefgh') {
            for (const rank of '12345678') {
                const coordinate = `${file}${rank}` as Coordinate;
                result[coordinate] = this.getPieceByCoordinate(coordinate);
            }
        }
        return result;
    }

    getPieceByCoordinate(c: Coordinate): PieceNotation | null {
        const file = c[0];
        const fileIndex = 'abcdefgh'.indexOf(file);
        const rank = c[1];
        // Last rank first so we subtract
        const rankString = this.piecePlacement.split('/')[8 - Number(rank)];
        if (rankString === '8') return null;
        const expandedRank = this.#expandRank(rankString);
        const result = expandedRank[fileIndex];
        if (result === '0') return null
        return result as PieceNotation;
    }

    /** Determines which color */
    getPieceColorAtCoordinate(c: Coordinate): 'w' | 'b' | null {
        const piece = this.getPieceByCoordinate(c);
        if (!piece) return null;
        if (piece.toLowerCase() === piece) return 'b';
        return 'w';
    }
    get whiteCanCastleKingside() {
        if (!this.castlingRights.includes('K')) return false;
        if (this.activeColor === 'b') return false;
        if (this.getPieceByCoordinate('e1') !== 'K') return false;
        if (this.getPieceByCoordinate('h1') !== 'R') return false;
        if (this.isCheck) return false;
        if (this.getPieceByCoordinate('f1')) return false;
        if (this.getPieceByCoordinate('g1')) return false;
        if (this.getIsSquareAttacked('f1', 'b')) return false;
        if (this.getIsSquareAttacked('g1', 'b')) return false;
        return true;
    }
    get whiteCanCastleQueenside() {
        if (!this.castlingRights.includes('Q')) return false;
        if (this.activeColor === 'b') return false;
        if (this.getPieceByCoordinate('e1') !== 'K') return false;
        if (this.getPieceByCoordinate('a1') !== 'R') return false;
        if (this.isCheck) return false;
        if (this.getPieceByCoordinate('d1')) return false;
        if (this.getPieceByCoordinate('c1')) return false;
        if (this.getPieceByCoordinate('b1')) return false;
        if (this.getIsSquareAttacked('d1', 'b')) return false;
        if (this.getIsSquareAttacked('c1', 'b')) return false;
        if (this.getIsSquareAttacked('b1', 'b')) return false;
        return true;
    }
    get blackCanCastleKingside() {
        if (!this.castlingRights.includes('k')) return false;
        if (this.activeColor === 'w') return false;
        if (this.getPieceByCoordinate('e8') !== 'k') return false;
        if (this.getPieceByCoordinate('h8') !== 'r') return false;
        if (this.isCheck) return false;
        if (this.getPieceByCoordinate('f8')) return false;
        if (this.getPieceByCoordinate('g8')) return false;
        if (this.getIsSquareAttacked('f8', 'w')) return false;
        if (this.getIsSquareAttacked('g8', 'w')) return false;
        return true;
    }
    get blackCanCastleQueenside() {
        if (!this.castlingRights.includes('q')) return false;
        if (this.activeColor === 'w') return false;
        if (this.getPieceByCoordinate('e8') !== 'k') return false;
        if (this.getPieceByCoordinate('a8') !== 'r') return false;
        if (this.isCheck) return false;
        if (this.getPieceByCoordinate('d8')) return false;
        if (this.getPieceByCoordinate('c8')) return false;
        if (this.getPieceByCoordinate('b8')) return false;
        if (this.getIsSquareAttacked('d8', 'w')) return false;
        if (this.getIsSquareAttacked('c8', 'w')) return false;
        if (this.getIsSquareAttacked('b8', 'w')) return false;
        return true;
    }

    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    move(from: Coordinate, to: Coordinate): FenReader | null {
        const piece = this.getPieceByCoordinate(from);
        const activeColor = this.activeColor;
        if (!piece) return null;
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece && activeColor === 'b') return null;
        if (!isWhitePiece && activeColor === 'w') return null;

        const p = piece.toLowerCase();
        let isCandidateMove = false;
        if (p === 'k') {
            isCandidateMove = this.getKingMoves(from).has(to);
        }
        else if (p === 'q') {
            isCandidateMove = this.getQueenMoves(from).has(to);
        }
        else if (p === 'r') {
            isCandidateMove = this.getRookMoves(from).has(to);
        }
        else if (p === 'b') {
            isCandidateMove = this.getBishopMoves(from).has(to);
        }
        else if (p === 'n') {

        }
        else if (p === 'p') {

        }

        if (!isCandidateMove) return null;

        if (this.detectCheck(from, to)) {
            // Move could be possible but put the player into check.
            // Or the player is currently in check and the move doesn't help
            return null;
        }

        // method that alters fen string, returns new one, does not modify this. getNewFen
        return new FenReader(FenReader.startingFen);
    }


    #getAdjacentCoordinate(startCoordinate: Coordinate, direction: Direction): Coordinate | null {
        let file = startCoordinate[0];
        let rank = startCoordinate[1];
        if (direction.includes('left')) {
            if (file === 'a') return null;
            file = String.fromCharCode(file.charCodeAt(0) - 1);
        }
        if (direction.includes('right')) {
            if (file === 'h') return null;
            file = String.fromCharCode(file.charCodeAt(0) + 1);
        }
        if (direction.includes('up')) {
            if (rank === '8') return null;
            rank = String(Number(rank) + 1);
        }
        if (direction.includes('down')) {
            if (rank === '1') return null;
            rank = String(Number(rank) - 1);
        }
        return `${file}${rank}` as Coordinate;
    }

    /** Get straight line regardless of legality. Does not include start */
    #getRayCoordinates(startCoordinate: Coordinate, direction: Direction): Coordinate[] {
        const result: Coordinate[] = [];
        let current = startCoordinate;
        while (true) {
            const coordinate = this.#getAdjacentCoordinate(current, direction);
            if (!coordinate) break;
            current = coordinate;
            result.push(coordinate);
        }
        return result;
    }

    #getRayMoves(startCoordinate: Coordinate, direction: Direction, color = this.activeColor): Coordinate[] {
        // Assume there is a queen on the start coordinate. How far can it go?
        // Color is necessary to determine capture possibility
        const ray = this.#getRayCoordinates(startCoordinate, direction);
        const result: Coordinate[] = [];
        for (const coordinate of ray) {
            // We don't have to check if we went off the board because getAdjacent does that.
            const piece = this.getPieceByCoordinate(coordinate);
            if (!piece) {
                // Empty, keep going
                result.push(coordinate);
                continue;
            }
            // There is a piece
            if (color !== this.getPieceColorAtCoordinate(coordinate)) {
                // It's the opposite color so we can capture it and stop
                result.push(coordinate);
            }
            break;
        }
        return result;
    }


    // In the following piece-specific methods, we ignore checks completely and assume we are not in check.
    // We handle that afterward in the "move" method. All these methods will be made #private
    // I am allowing the color to be toggled so that we can use these to see attacked squares as well

    getKingMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set();
    }

    getQueenMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        const rookMoves = this.getRookMoves(startCoordinate, color);
        const bishopMoves = this.getBishopMoves(startCoordinate, color);
        return new Set([...rookMoves, ...bishopMoves]);
    }

    getRookMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'up', color),
            ...this.#getRayMoves(startCoordinate, 'down', color),
            ...this.#getRayMoves(startCoordinate, 'left', color),
            ...this.#getRayMoves(startCoordinate, 'right', color),
        ]);
    }

    getBishopMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'upright', color),
            ...this.#getRayMoves(startCoordinate, 'downright', color),
            ...this.#getRayMoves(startCoordinate, 'downleft', color),
            ...this.#getRayMoves(startCoordinate, 'upleft', color),
        ]);
    }

    getKnightMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set();
    }

    getPawnMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        const enPassantSquare = this.enPassantTarget;
        return new Set();
    }

    getIsSquareAttacked(c: Coordinate, attacker: 'w' | 'b' = this.inactiveColor) {
        // Go through every piece and check if it can hit a square
        let isAttacked = false;
        for (const piece of Object.values(this.coordinateObject)) {
            if (!piece) continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((attacker === 'b' && isWhite)) continue;
            if (attacker === 'w' && !isWhite) continue;
            const p = piece.toLowerCase();
            if (p === 'k') {
                if (this.getKingMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'q') {
                if (this.getQueenMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'r') {
                if (this.getRookMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'b') {
                if (this.getBishopMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'n') {
                if (this.getKnightMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'p') {
                if (this.getPawnMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
        }
        return isAttacked;
    }

    /** Get a new FenReader without changing moves and see if check is there.
     *  Use this to see if you are getting out of or moving into check before moving */
    detectCheck(from: Coordinate, to: Coordinate): boolean {
        const fenReader = this.generateNewFenReaderFromMove(from, to, false);
        return fenReader.isCheck;
    }

    /** Gets a new FenReader. Doesn't test move legality. We can opt to not change turns to test moves */
    generateNewFenReaderFromMove(from: Coordinate, to: Coordinate, changeTurns = true): FenReader {
        let [piecePlacement, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = this.fen.split(' ');

        const movingPiece = this.getPieceByCoordinate(from);

        if (!movingPiece) throw new Error('no piece?');
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const fromFileIndex = 'abcdefgh'.indexOf(fromFile);
        const toFileIndex = 'abcdefgh'.indexOf(toFile);
        // Reset if we moved a pawn or if we land on a piece.
        const shouldReset50MoveClock = movingPiece.toLowerCase() === 'p' || !!this.getPieceByCoordinate(to);

        const isWhiteCastleKingside = movingPiece === 'K' && from === 'e1' && to === 'g1';
        const isWhiteCastleQueenside = movingPiece === 'K' && from === 'e1' && to === 'c1';
        const isBlackCastleKingside = movingPiece === 'k' && from === 'e8' && to === 'g1';
        const isBlackCastleQueenside = movingPiece === 'k' && from === 'e8' && to === 'c8';
        const isEnPassant =
            (this.activeColor === 'w' && movingPiece === 'P' && to === enPassantTarget) ||
            (this.activeColor === 'b' && movingPiece === 'p' && to === enPassantTarget);

        if (isWhiteCastleKingside || from === 'e1' || from === 'h1' || to === 'h1') castlingRights = castlingRights.replace('K', '');
        if (isBlackCastleKingside || from === 'e8' || from === 'h8' || to === 'h8') castlingRights = castlingRights.replace('k', '');
        if (isWhiteCastleQueenside || from === 'e1' || from === 'a8' || to === 'a8') castlingRights = castlingRights.replace('Q', '');
        if (isBlackCastleQueenside || from === 'e8' || from === 'a8' || to === 'a8') castlingRights = castlingRights.replace('q', '');
        if (castlingRights === '') castlingRights = '-';

        if (movingPiece === 'P' && fromRank === '2') {
            enPassantTarget = `${fromFile}3`;
        }
        else if (movingPiece === 'p' && fromRank === '7') {
            enPassantTarget = `${fromFile}6`;
        }
        else {
            enPassantTarget = '-';
        }

        if (changeTurns) {
            activeColor = activeColor === 'w' ? 'b' : 'w';
            halfMoveClock = shouldReset50MoveClock ? '0' : String(Number(halfMoveClock) + 1);
            if (this.activeColor === 'b') fullMoveNumber = String(Number(fullMoveNumber + 1));
        }

        // Modify the fen string
        const ranks = piecePlacement.split('/');

        if (fromRank === toRank) {
            const rankArray = this.#expandRank(ranks[8 - Number(toRank)]);
            rankArray[fromFileIndex] = '0';
            rankArray[toFileIndex] = movingPiece;
            ranks.splice(8 - Number(fromRank), 1, this.#compressRank(rankArray));
        }
        else {
            const fromRankArr = this.#expandRank(ranks[8 - Number(fromRank)]);
            const toRankArr = this.#expandRank(ranks[8 - Number(toRank)]);
            fromRankArr[fromFileIndex] = '0';
            toRankArr[fromFileIndex] = movingPiece;
            ranks.splice(8 - Number(fromRank), 1, this.#compressRank(fromRankArr));
            ranks.splice(8 - Number(toRank), 1, this.#compressRank(toRankArr));
        }

        // Exceptions
        if (isWhiteCastleKingside) {
            // Move the rook 
        }
        else if (isBlackCastleKingside) {

        }
        else if (isWhiteCastleQueenside) {

        }
        else if (isBlackCastleQueenside) {

        }
        else if (isEnPassant) {
            // Remove a piece on a different square
            // It's going to be the pawn in front of enpassanttarget (which has been mutated already here)
        }

        const newPiecePlacement = ranks.join('/');
        const fen = `${newPiecePlacement} ${activeColor} ${castlingRights} ${enPassantTarget} ${halfMoveClock} ${fullMoveNumber}`;
        return new FenReader(fen);
    }

    /** Takes a fen rank string and normalizes it to 8 character array (adds zeros in place of numbers) */
    #expandRank(rank: string) {
        let expandedString = '';
        for (const char of rank) {
            if (Number.isNaN(Number(char))) {
                expandedString += char;
                continue;
            }
            expandedString += Array.from({ length: Number(char) }, () => '0').join('');
        }
        const arr = expandedString.split('');
        return arr;
    }

    #compressRank(expandedRankArray: string[]) {
        let rankString = '';
        let count = 0;
        for (const char of expandedRankArray) {
            if (char === '0') {
                count++;
                continue;
            }
            if (count) rankString += String(count);
            rankString += char;
            count = 0;
        }
        if (count) rankString += String(count);
        return rankString;
    }

}