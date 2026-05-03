type Coordinate = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
type Direction = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';
type PieceNotation = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

class ChessBoard extends HTMLElement {

    #isInitialized = false;
    #squaresObj: Record<string, HTMLDivElement> = {};
    #squaresMap: Map<HTMLDivElement, Coordinate> = new Map();
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
    #threeFoldRepetitionCounter: Record<string, number> = {};
    #fenArray: string[] = []; // Game history
    #currentFenIndex = -1;

    constructor() {
        super();
    }

    connectedCallback() {
        if (this.#isInitialized) return;
        this.draggable = false;
        let dark = false;
        for (const rank of [8, 7, 6, 5, 4, 3, 2, 1]) {
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                const square = document.createElement('div');
                square.draggable = false;
                if (dark) square.classList.add('d');
                this.#squaresObj[`${file}${rank}`] = square;
                this.#squaresMap.set(square, `${file}${rank}` as Coordinate);
                this.append(square);
                dark = !dark;
            }
            dark = !dark;
        }

        this.addEventListener('request-move', (e) => this.#listen(e));

        this.#isInitialized = true;
    }

    #listen(e: Event) {
        const { fromSquare, toSquare } = (e as CustomEvent).detail;
        if (!fromSquare || !toSquare) return;
        if (fromSquare === toSquare) return;
        const from = this.#squaresMap.get(fromSquare);
        const to = this.#squaresMap.get(toSquare);
        if (!from || !to) return;
        const fenReader = new FenReader(this.fen);
        const result = fenReader.requestMove(from, to);
        if (result === null) return; // Illegal move
        console.log(from, to);
        this.#diffAndUpdate(result);
        this.#commitNewMove(result);
    };

    get fen() {
        return this.#fenArray.at(-1) || '';
    }

    get fenReader() {
        return new FenReader(this.fen);
    }

    /** Removes current game */
    loadFen(fen: string) {
        this.#fenArray.length = 0;
        this.#currentFenIndex = -1;
        const fenReader = new FenReader(fen);
        this.#diffAndUpdate(fenReader);
        this.#commitNewMove(fenReader);
    }

    newGame() {
        this.loadFen(FenReader.startingFen);
    }

    /** Piece factory function. We don't care about keeping pieces in state */
    #buildPiece(pieceNotation: PieceNotation) {
        const pieceDiv = document.createElement('div');
        pieceDiv.draggable = false;
        pieceDiv.textContent = this.#pieceSymbols[pieceNotation];
        pieceDiv.className = `p ${pieceNotation.toUpperCase() === pieceNotation ? 'w' : 'b'}`;
        let offsetX = 0;
        let offsetY = 0;

        const handleDown = (e: PointerEvent) => {
            if (!this.#squaresMap.has(pieceDiv.parentElement as HTMLDivElement)) return;
            //isMoving = true;
            pieceDiv.style.position = 'absolute';
            offsetX = pieceDiv.getBoundingClientRect().width / 2;
            offsetY = pieceDiv.getBoundingClientRect().height / 2;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            pieceDiv.style.left = `${left}px`;
            pieceDiv.style.top = `${top}px`;
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp, { once: true });
        };
        const handleMove = (e: PointerEvent) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            pieceDiv.style.left = `${left}px`;
            pieceDiv.style.top = `${top}px`;
        };
        const handleUp = (e: PointerEvent) => {
            pieceDiv.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);

            const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY)
                .find(el => el instanceof HTMLDivElement && this.#squaresMap.has(el));
            if (!hoveredSquare) return;
            pieceDiv.dispatchEvent(new CustomEvent('request-move', {
                detail: {
                    fromSquare: pieceDiv.parentElement,
                    toSquare: hoveredSquare,
                },
                bubbles: true,
            }));
        };
        div.addEventListener('dragstart', (e) => e.preventDefault());
        div.addEventListener('mousedown', (e) => e.preventDefault());
        pieceDiv.addEventListener('pointerdown', handleDown);
        return pieceDiv;
    }

    #diffAndUpdate(updatedFenReader: FenReader) {
        for (const key in this.#squaresObj) {
            const piece = updatedFenReader.getPieceByCoordinate(key as Coordinate);
            this.#squaresObj[key].replaceChildren(piece ? this.#buildPiece(piece) : '');
        }
        // const current = this.fenReader.coordinateObject;
        // const updated = updatedFenReader.coordinateObject;
        // for (const key in updated) {
        //     const currentPiece = current[key as Coordinate];
        //     const updatedPiece = updated[key as Coordinate];
        //     if (currentPiece === updatedPiece) continue;
        //     console.log(currentPiece, updatedPiece);
        //     // remove the old div and create a new one if necessary
        //     this.#squaresObj[key].replaceChildren(updatedPiece ? this.#buildPiece(updatedPiece) : '');
        // }
    }

    #commitNewMove(updatedFenReader: FenReader) {
        const fen = updatedFenReader.fen;
        this.#fenArray.push(fen);
        // This doesn't work because the whole fen will always be different.
        // Need to split out the relevant piece

        const halfMoveClock = updatedFenReader.halfMoveClock;
        if (Number(halfMoveClock) >= 50) {
            // Draw
        }

        const piecePlacement = updatedFenReader.piecePlacement;
        if (!this.#threeFoldRepetitionCounter[piecePlacement]) this.#threeFoldRepetitionCounter[piecePlacement] = 0;
        this.#threeFoldRepetitionCounter[piecePlacement]++;
        if (this.#threeFoldRepetitionCounter[piecePlacement] >= 3) {
            // Draw
        }
    }

    // #checkForDraws() {
    //     const piecePlacement = this.fenReader.piecePlacement;
    // }

    goToPly(newFenIndex: number) {
        const newFen = this.#fenArray.at(newFenIndex);
        if (!newFen) return;
        this.#diffAndUpdate(new FenReader(newFen));
        this.#currentFenIndex = newFenIndex;
    }

    forward() {
        this.goToPly(this.#currentFenIndex + 1);
    }

    back() {
        this.goToPly(this.#currentFenIndex - 1);
    }

    goToCurrentPly() {
        this.goToPly(this.#fenArray.length - 1);
    }

}

customElements.define('chess-board', ChessBoard);
const x = new ChessBoard();
document.body.replaceChildren(x);
const div = document.createElement('div');
div.style.display = 'flex';
div.style.gap = '2em';
const button = document.createElement('button');
button.textContent = 'New Game';
button.onclick = () => x.newGame();
const input = document.createElement('input');
input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        x.loadFen(input.value);
    }
})
div.replaceChildren(button, input);
document.body.append(div);

class FenReader {

    // Class instances of FenReader are designed to be immutable. 
    // We parse the string and derive game state, move legality, etc.

    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen: string;

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
        if (!c) return null;
        const file = c[0];
        if (!file) return null;
        const fileIndex = 'abcdefgh'.indexOf(file);
        if (fileIndex < 0) return null;
        const rank = c[1];
        if (!rank) return null;
        // Last rank first so we subtract
        const rankString = this.piecePlacement.split('/')[8 - Number(rank)];
        if (!rankString) return null;
        if (rankString === '8') return null; // Empty rank
        const expandedRank = this.#expandRank(rankString);
        const result = expandedRank[fileIndex];
        if (result === '0' || !result) return null;
        return result as PieceNotation;
    }

    /** Determines which color is at a square (or returns null) */
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
        if (this.#getIsSquareAttacked('f1', 'b')) return false;
        if (this.#getIsSquareAttacked('g1', 'b')) return false;
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
        if (this.#getIsSquareAttacked('d1', 'b')) return false;
        if (this.#getIsSquareAttacked('c1', 'b')) return false;
        if (this.#getIsSquareAttacked('b1', 'b')) return false;
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
        if (this.#getIsSquareAttacked('f8', 'w')) return false;
        if (this.#getIsSquareAttacked('g8', 'w')) return false;
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
        if (this.#getIsSquareAttacked('d8', 'w')) return false;
        if (this.#getIsSquareAttacked('c8', 'w')) return false;
        if (this.#getIsSquareAttacked('b8', 'w')) return false;
        return true;
    }

    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    requestMove(from: Coordinate, to: Coordinate): FenReader | null {
        if (from === to) return null; // Not a move
        const piece = this.getPieceByCoordinate(from);
        const activeColor = this.activeColor;
        if (!piece) return null;
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece && activeColor === 'b') return null;
        if (!isWhitePiece && activeColor === 'w') return null;

        const p = piece.toLowerCase();
        let isCandidateMove = false;
        if (p === 'k') {
            isCandidateMove = this.#getKingMoves(from).has(to);
        }
        else if (p === 'q') {
            isCandidateMove = this.#getQueenMoves(from).has(to);
        }
        else if (p === 'r') {
            isCandidateMove = this.#getRookMoves(from).has(to);
        }
        else if (p === 'b') {
            console.log(this.#getBishopMoves(from));
            isCandidateMove = this.#getBishopMoves(from).has(to);
        }
        else if (p === 'n') {

        }
        else if (p === 'p') {
            isCandidateMove = this.#getPawnMoves(from).has(to);
        }

        if (!isCandidateMove) return null;

        if (this.#detectCheck(from, to)) {
            // Move could be possible but puts the player in check,
            // or the player is currently in check and the move doesn't get out.
            // So we return null
            return null;
        }

        // The move is legal. Return a new instance
        return this.#generateNewFenReaderFromMove(from, to);
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

    #getKingMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set();
    }

    #getQueenMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        const rookMoves = this.#getRookMoves(startCoordinate, color);
        const bishopMoves = this.#getBishopMoves(startCoordinate, color);
        return new Set([...rookMoves, ...bishopMoves]);
    }

    #getRookMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'up', color),
            ...this.#getRayMoves(startCoordinate, 'down', color),
            ...this.#getRayMoves(startCoordinate, 'left', color),
            ...this.#getRayMoves(startCoordinate, 'right', color),
        ]);
    }

    #getBishopMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'upright', color),
            ...this.#getRayMoves(startCoordinate, 'downright', color),
            ...this.#getRayMoves(startCoordinate, 'downleft', color),
            ...this.#getRayMoves(startCoordinate, 'upleft', color),
        ]);
    }

    #getKnightMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        return new Set();
    }

    #getPawnMoves(startCoordinate: Coordinate, color = this.activeColor): Set<Coordinate> {
        const result: Set<Coordinate> = new Set();
        const hasNotMoved = (startCoordinate[1] === '2' && color === 'w') || (startCoordinate[1] === '7' && color === 'b');
        const oppositeColor = color === 'w' ? 'b' : 'w';

        const squareInFront = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'up' : 'down');
        const pieceInFront = squareInFront && this.getPieceByCoordinate(squareInFront);
        if (squareInFront && !pieceInFront) result.add(squareInFront);

        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight && this.getPieceColorAtCoordinate(squareUpRight) === oppositeColor) result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft && this.getPieceColorAtCoordinate(squareUpLeft) === oppositeColor) result.add(squareUpLeft);

        // Double jump
        if (hasNotMoved && squareInFront && !pieceInFront) {
            const twoInFront = this.#getAdjacentCoordinate(squareInFront, color === 'w' ? 'up' : 'down');
            if (twoInFront && !this.getPieceByCoordinate(twoInFront)) result.add(twoInFront);
        }

        const enPassantSquare = this.enPassantTarget;
        if (enPassantSquare === squareUpRight || enPassantSquare === squareUpLeft) {
            result.add(enPassantSquare);
        }
        console.log(result);
        return result;
    }
    #getIsSquareAttacked(c: Coordinate, attacker: 'w' | 'b' = this.inactiveColor) {
        // Go through every piece and check if it can hit a square
        let isAttacked = false;
        for (const piece of Object.values(this.coordinateObject)) {
            if (!piece) continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((attacker === 'b' && isWhite)) continue;
            if (attacker === 'w' && !isWhite) continue;
            const p = piece.toLowerCase();
            if (p === 'k') {
                if (this.#getKingMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'q') {
                if (this.#getQueenMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'r') {
                if (this.#getRookMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'b') {
                if (this.#getBishopMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'n') {
                if (this.#getKnightMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
            if (p === 'p') {
                if (this.#getPawnMoves(c, attacker).has(c)) isAttacked = true;
                break;
            }
        }
        return isAttacked;
    }

    /** Get a new FenReader without changing moves and see if check is there.
     *  Use this to see if you are getting out of or moving into check before moving */
    #detectCheck(from: Coordinate, to: Coordinate): boolean {
        const testFenReader = this.#generateNewFenReaderFromMove(from, to, false);
        return testFenReader.isCheck;
    }

    /** Gets a new FenReader. Doesn't test move legality. 
     * We can opt to not change turns to check conditions after the reader is created (checks) */
    #generateNewFenReaderFromMove(from: Coordinate, to: Coordinate, changeTurns = true): FenReader {
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
            toRankArr[toFileIndex] = movingPiece;
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
            // It's going to be the pawn in front of enpassanttarget
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