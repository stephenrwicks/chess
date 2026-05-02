"use strict";
const buildPiece = (pieceNotation) => {
    const EL = document.createElement('div');
    let legalMovesMemo = null;
    let isDraggable = false;
    let hasMoved = false;
    let isMoving = false;
    let offsetX = 0;
    let offsetY = 0;
    const highlightLegalMoves = () => {
        // Send an event to the board. The board does this.
    };
    const handleDown = (e) => {
        //if (this.board!.currentMove !== this.color) return;
        isMoving = true;
        EL.style.position = 'absolute';
        offsetX = EL.getBoundingClientRect().width / 2;
        offsetY = EL.getBoundingClientRect().height / 2;
        const left = e.clientX - offsetX;
        const top = e.clientY - offsetY;
        EL.style.left = `${left}px`;
        EL.style.top = `${top}px`;
        highlightLegalMoves();
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp, { once: true });
        //if (this.square) this.square.classList.add('active');
    };
    const handleMove = (e) => {
        const left = e.clientX - offsetX;
        const top = e.clientY - offsetY;
        EL.style.left = `${left}px`;
        EL.style.top = `${top}px`;
    };
    const handleUp = (e) => {
        const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY).find(el => el instanceof HTMLDivElement && el.classList.contains('square')) ?? null;
        EL.removeAttribute('style');
        window.removeEventListener('pointermove', handleMove);
        // Check legal move
        isMoving = false;
    };
    EL.addEventListener('pointerdown', handleDown);
    const PIECE = {
        get el() {
            return EL;
        },
        get color() {
            if (['K', 'Q', 'R', 'B', 'N', 'P'].includes(this.type))
                return 'w';
            return 'b';
        },
        highlightLegalMoves() {
        },
        get type() {
            return pieceNotation;
        },
        set type(t) {
            if (t) {
                EL.textContent = t;
            }
            else {
                EL.textContent = '';
            }
            pieceNotation = t;
            this.el.className = `piece ${this.color}`;
            // Add and remove different capabilities here maybe
        }
    };
    PIECE.type = pieceNotation;
    return PIECE;
};
class Board extends HTMLElement {
    #initialized = false;
    squares = {};
    constructor() {
        super();
    }
    connectedCallback() {
        if (this.#initialized)
            return;
        this.#initialized = true;
        this.className = 'board';
        for (const rank of [8, 7, 6, 5, 4, 3, 2, 1]) {
            for (const file of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
                const square = document.createElement('div');
                square.className = 'square';
                square.dataset.coordinate = `${file}${rank}`;
                this.squares[`${file}${rank}`] = square;
                this.append(square);
            }
        }
    }
    loadFen(fen) {
        const fenReader = new FenReader(fen);
        console.log(fenReader);
        for (const [coordinate, div] of Object.entries(this.squares)) {
            const piece = fenReader.getPieceByCoordinate(coordinate);
            console.log(piece);
            if (!piece)
                continue;
            div.replaceChildren(buildPiece(piece).el);
        }
    }
}
customElements.define('chess-board', Board);
// What is the difference between game and board? Which methods belong to the board?
// const startingFen: Fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// const game = () => {
//     const BOARD = buildBoard();
//     // Castling state
//     let hasWhiteKingMoved = false;
//     let hasBlackKingMoved = false;
//     let hasa1Moved = false;
//     let hash1Moved = false;
//     let hasa8Moved = false;
//     let hash8Moved = false;
//     const loadFen = (fen: Fen) => {
//         // Castling state would have to be reset
//         //const [piecePositions, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = fen.split(' ');
//         const { getPieceNotationFromFenByCoordinate } = interpretFen(fen);
//         const files: TFile[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
//         const ranks: TRank[] = [8, 7, 6, 5, 4, 3, 2, 1];
//         for (const rank of ranks) {
//             for (const file of files) {
//                 const existingPiece = BOARD.getPieceByCoordinate(`${file}${rank}`);
//                 if (existingPiece) {
//                     BOARD.removePieceAtCoordinate(`${file}${rank}`);
//                 }
//                 const newPieceNotation = getPieceNotationFromFenByCoordinate(file, rank);
//                 if (!newPieceNotation) continue;
//                 const newPiece = buildPiece(newPieceNotation);
//                 BOARD.placePieceAtCoordinate(newPiece, `${file}${rank}`);
//             }
//         }
//     };
//     loadFen(startingFen);
//     const object = {
//         BOARD,
//         loadFen,
//         get element() {
//             return this.BOARD.el;
//         },
//         // get notation / clock () { etc - These belong to the game and not the board
//         // }
//     }
//     return object;
// };
// Board and game are indistinguishable right now, but they shouldn't be when I'm done
// const g = game();
// document.body.append(g.element);
const x = document.createElement('chess-board');
document.body.replaceChildren(x);
class FenReader {
    // Class instances of FenReader are designed to be immutable. 
    // So we just parse it and figure out what every square contains.
    // Use this to calculate move legality.
    // So calculating every piece type in here is actually most appropriate, rather than each piece calculating itself
    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen;
    #threeFoldRepetition = {}; // Does this belong in game, etc? Prob
    constructor(fen = FenReader.startingFen) {
        this.#fen = fen;
    }
    get fen() {
        return this.#fen;
    }
    get piecePlacement() {
        return this.#fen.split(' ')[0];
    }
    get activeColor() {
        return this.#fen.split(' ')[1];
    }
    get castlingRights() {
        return this.#fen.split(' ')[2];
    }
    get enPassantTarget() {
        return this.#fen.split(' ')[3];
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
        if (!this.isCheck)
            return false;
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
    get coordinates() {
        const result = {};
        for (const file of 'abcdefgh') {
            for (const rank of '12345678') {
                const coordinate = `${file}${rank}`;
                result[coordinate] = this.getPieceByCoordinate(coordinate);
            }
        }
        return result;
    }
    getPieceByCoordinate(c) {
        const file = c[0];
        const toFileIndex = 'abcdefgh'.indexOf(file);
        const rank = c[1];
        // Last rank first so we subtract
        const rankString = this.piecePlacement.split('/')[8 - Number(rank)];
        if (rankString === '8') {
            // Completely empty, return immediately
            return null;
        }
        let currentTarget = null;
        let counter = 0;
        // Iterate through the rank string and either grab the correct piece or skip over squares
        while (counter < 8) {
            currentTarget = rankString[counter];
            if (counter === toFileIndex)
                break;
            const isNumberOfEmptySquares = Number.isInteger(Number(currentTarget));
            counter += isNumberOfEmptySquares ? Number(currentTarget) : 1;
        }
        return currentTarget;
    }
    /** Determines which color */
    getPieceColorAtCoordinate(c) {
        const piece = this.getPieceByCoordinate(c);
        if (!piece)
            return null;
        if (piece.toLowerCase() === piece)
            return 'b';
        return 'w';
    }
    get whiteCanCastleKingside() {
        if (!this.castlingRights.includes('K'))
            return false;
        if (this.activeColor === 'b')
            return false;
        if (this.getPieceByCoordinate('e1') !== 'K')
            return false;
        if (this.getPieceByCoordinate('h1') !== 'R')
            return false;
        if (this.isCheck)
            return false;
        if (this.getPieceByCoordinate('f1'))
            return false;
        if (this.getPieceByCoordinate('g1'))
            return false;
        if (this.getIsSquareAttacked('f1', 'b'))
            return false;
        if (this.getIsSquareAttacked('g1', 'b'))
            return false;
        return true;
    }
    get whiteCanCastleQueenside() {
        if (!this.castlingRights.includes('Q'))
            return false;
        if (this.activeColor === 'b')
            return false;
        if (this.getPieceByCoordinate('e1') !== 'K')
            return false;
        if (this.getPieceByCoordinate('a1') !== 'R')
            return false;
        if (this.isCheck)
            return false;
        if (this.getPieceByCoordinate('d1'))
            return false;
        if (this.getPieceByCoordinate('c1'))
            return false;
        if (this.getPieceByCoordinate('b1'))
            return false;
        if (this.getIsSquareAttacked('d1', 'b'))
            return false;
        if (this.getIsSquareAttacked('c1', 'b'))
            return false;
        if (this.getIsSquareAttacked('b1', 'b'))
            return false;
        return true;
    }
    get blackCanCastleKingside() {
        if (!this.castlingRights.includes('k'))
            return false;
        if (this.activeColor === 'w')
            return false;
        if (this.getPieceByCoordinate('e8') !== 'k')
            return false;
        if (this.getPieceByCoordinate('h8') !== 'r')
            return false;
        if (this.isCheck)
            return false;
        if (this.getPieceByCoordinate('f8'))
            return false;
        if (this.getPieceByCoordinate('g8'))
            return false;
        if (this.getIsSquareAttacked('f8', 'w'))
            return false;
        if (this.getIsSquareAttacked('g8', 'w'))
            return false;
        return true;
    }
    get blackCanCastleQueenside() {
        if (!this.castlingRights.includes('q'))
            return false;
        if (this.activeColor === 'w')
            return false;
        if (this.getPieceByCoordinate('e8') !== 'k')
            return false;
        if (this.getPieceByCoordinate('a8') !== 'r')
            return false;
        if (this.isCheck)
            return false;
        if (this.getPieceByCoordinate('d8'))
            return false;
        if (this.getPieceByCoordinate('c8'))
            return false;
        if (this.getPieceByCoordinate('b8'))
            return false;
        if (this.getIsSquareAttacked('d8', 'w'))
            return false;
        if (this.getIsSquareAttacked('c8', 'w'))
            return false;
        if (this.getIsSquareAttacked('b8', 'w'))
            return false;
        return true;
    }
    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    move(from, to) {
        const piece = this.getPieceByCoordinate(from);
        const activeColor = this.activeColor;
        if (!piece)
            return null;
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece && activeColor === 'b')
            return null;
        if (!isWhitePiece && activeColor === 'w')
            return null;
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
        if (!isCandidateMove)
            return null;
        // Do it HERE to simplify
        // Determine if it goes into check
        // Determine if it blocks check
        // if (this.doesThisMoveGoIntoCheck()) {
        // Without changing active color, set up that position and see if we're in check?
        //     return null;
        // }
        // if (this.isCheck) {
        //     const result = this.doesThisMoveRemoveCheck(from, to);
        //     if (!result) return null;
        // }
        // method that alters fen string, returns new one, does not modify this. getNewFen
        return new FenReader(FenReader.startingFen);
    }
    #getAdjacentCoordinate(startCoordinate, direction) {
        let file = startCoordinate[0];
        let rank = startCoordinate[1];
        if (direction.includes('left')) {
            if (file === 'a')
                return null;
            file = String.fromCharCode(file.charCodeAt(0) - 1);
        }
        if (direction.includes('right')) {
            if (file === 'h')
                return null;
            file = String.fromCharCode(file.charCodeAt(0) + 1);
        }
        if (direction.includes('up')) {
            if (rank === '8')
                return null;
            rank = String(Number(rank) + 1);
        }
        if (direction.includes('down')) {
            if (rank === '1')
                return null;
            rank = String(Number(rank) - 1);
        }
        return `${file}${rank}`;
    }
    /** Get straight line regardless of legality. Does not include start */
    #getRayCoordinates(startCoordinate, direction) {
        const result = [];
        let current = startCoordinate;
        while (true) {
            const coordinate = this.#getAdjacentCoordinate(current, direction);
            if (!coordinate)
                break;
            current = coordinate;
            result.push(coordinate);
        }
        return result;
    }
    #getRayMoves(startCoordinate, direction, color = this.activeColor) {
        // Assume there is a queen on the start coordinate. How far can it go?
        // Color is necessary to determine capture possibility
        const ray = this.#getRayCoordinates(startCoordinate, direction);
        const result = [];
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
    getKingMoves(startCoordinate, color = this.activeColor) {
        return new Set();
    }
    getQueenMoves(startCoordinate, color = this.activeColor) {
        const rookMoves = this.getRookMoves(startCoordinate, color);
        const bishopMoves = this.getBishopMoves(startCoordinate, color);
        return new Set([...rookMoves, ...bishopMoves]);
    }
    getRookMoves(startCoordinate, color = this.activeColor) {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'up', color),
            ...this.#getRayMoves(startCoordinate, 'down', color),
            ...this.#getRayMoves(startCoordinate, 'left', color),
            ...this.#getRayMoves(startCoordinate, 'right', color),
        ]);
    }
    getBishopMoves(startCoordinate, color = this.activeColor) {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'upright', color),
            ...this.#getRayMoves(startCoordinate, 'downright', color),
            ...this.#getRayMoves(startCoordinate, 'downleft', color),
            ...this.#getRayMoves(startCoordinate, 'upleft', color),
        ]);
    }
    getKnightMoves(startCoordinate, color = this.activeColor) {
        return new Set();
    }
    getPawnMoves(startCoordinate, color = this.activeColor) {
        const enPassantSquare = this.enPassantTarget;
        return new Set();
    }
    getIsSquareAttacked(c, attacker = this.inactiveColor) {
        // Go through every piece and check if it can hit a square
        let isAttacked = false;
        for (const piece of Object.values(this.coordinates)) {
            if (!piece)
                continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((attacker === 'b' && isWhite))
                continue;
            if (attacker === 'w' && !isWhite)
                continue;
            const p = piece.toLowerCase();
            if (p === 'k') {
                if (this.getKingMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
            if (p === 'q') {
                if (this.getQueenMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
            if (p === 'r') {
                if (this.getRookMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
            if (p === 'b') {
                if (this.getBishopMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
            if (p === 'n') {
                if (this.getKnightMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
            if (p === 'p') {
                if (this.getPawnMoves(c, attacker).has(c))
                    isAttacked = true;
                break;
            }
        }
        return isAttacked;
    }
    detectCheck(from, to) {
        const fenReader = this.generateNewFenReaderFromMove(from, to, false);
        return fenReader.isCheck;
    }
    generateNewFenReaderFromMove(from, to, changeTurns = true) {
        let [piecePlacement, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = this.fen.split(' ');
        const movingPiece = this.getPieceByCoordinate(from);
        if (!movingPiece)
            throw new Error('no piece?');
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const fromFileIndex = 'abcdefgh'.indexOf(fromFile);
        const toFileIndex = 'abcdefgh'.indexOf(toFile);
        const isWhiteCastleKingside = from === 'e1' && to === 'g1';
        const isWhiteCastleQueenside = from === 'e1' && to === 'c1';
        const isBlackCastleKingside = from === 'e8' && to === 'g1';
        const isBlackCastleQueenside = from === 'e8' && to === 'c8';
        const isEnPassant = to === enPassantTarget; // and is correct pawn move
        if (isWhiteCastleKingside || from === 'e1' || from === 'h1' || to === 'h1')
            castlingRights = castlingRights.replace('K', '');
        if (isBlackCastleKingside || from === 'e8' || from === 'h8' || to === 'h8')
            castlingRights = castlingRights.replace('k', '');
        if (isWhiteCastleQueenside || from === 'e1' || from === 'a8' || to === 'a8')
            castlingRights = castlingRights.replace('Q', '');
        if (isBlackCastleQueenside || from === 'e8' || from === 'a8' || to === 'a8')
            castlingRights = castlingRights.replace('q', '');
        if (castlingRights === '')
            castlingRights = '-';
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
            halfMoveClock = String(Number(halfMoveClock) + 1);
            if (this.activeColor === 'b')
                fullMoveNumber = String(Number(fullMoveNumber + 1));
        }
        // Modify the fen string
        const ranks = piecePlacement.split('/');
        const expandRank = (rank) => {
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
        };
        const compressRank = (rank) => {
            let resultString = '';
            let count = 0;
            for (const char of rank) {
                if (char === '0') {
                    count++;
                    continue;
                }
                if (count)
                    resultString += String(count);
                resultString += char;
                count = 0;
            }
            if (count)
                resultString += String(count);
            return resultString;
        };
        if (fromRank === toRank) {
            const rankArray = expandRank(ranks[8 - Number(toRank)]);
            rankArray[fromFileIndex] = '0';
            rankArray[toFileIndex] = movingPiece;
            ranks.splice(8 - Number(fromRank), 1, compressRank(rankArray));
        }
        else {
            const fromRankArr = expandRank(ranks[8 - Number(fromRank)]);
            const toRankArr = expandRank(ranks[8 - Number(toRank)]);
            fromRankArr[fromFileIndex] = '0';
            toRankArr[fromFileIndex] = movingPiece;
            ranks.splice(8 - Number(fromRank), 1, compressRank(fromRankArr));
            ranks.splice(8 - Number(toRank), 1, compressRank(toRankArr));
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
        if (isEnPassant) {
            // Remove a piece on a different square
            // It's going to be the pawn in front of enpassanttarget (which has been mutated already here)
        }
        const newPiecePlacement = ranks.join('/');
        const fen = `${newPiecePlacement} ${activeColor} ${castlingRights} ${enPassantTarget} ${halfMoveClock} ${fullMoveNumber}`;
        return new FenReader(fen);
    }
}
