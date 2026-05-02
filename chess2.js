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
const buildBoard = () => {
    // The board should remain dumb and not know the FEN - Neither should the pieces, so the game itself handles legal moves
    const EL = document.createElement('div');
    EL.className = 'board';
    const PIECES = new Set();
    const coordinateSquareMap = new Map();
    const squarePieceMap = new Map();
    EL.addEventListener('draggingPiece', (e) => {
        const x = e.detail;
        // Disassociate the piece / remove
    });
    EL.addEventListener('droppingPiece', (e) => {
        const x = e.detail;
        // add piece
    });
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
    for (const rank of ranks) {
        for (const file of files) {
            const square = document.createElement('div');
            square.className = 'square';
            coordinateSquareMap.set(`${file}${rank}`, square);
            EL.append(square);
        }
    }
    const placePieceAtCoordinate = (piece, coordinate) => {
        const square = coordinateSquareMap.get(coordinate);
        if (!square)
            throw new Error('Error finding square');
        squarePieceMap.set(square, piece);
        PIECES.add(piece);
        square.append(piece.el);
    };
    const removePieceAtCoordinate = (coordinate) => {
        const piece = getPieceByCoordinate(coordinate);
        if (piece) {
            piece.el.remove();
            PIECES.delete(piece);
        }
        return piece;
    };
    const getPieceByCoordinate = (coordinate) => {
        const square = coordinateSquareMap.get(coordinate) ?? null;
        if (!square)
            return null;
        return squarePieceMap.get(square) ?? null;
    };
    const getCoordinateByPiece = () => {
        // ??
    };
    // There might be no need to do this separately from place + remove
    return {
        el: EL,
        pieces: PIECES,
        placePieceAtCoordinate,
        removePieceAtCoordinate,
        getPieceByCoordinate,
    };
};
// This entire thing could be broken into individual functions
const interpretFen = (fen) => {
    const [piecePositions, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = fen.split(' ');
    const getPieceNotationFromFenByCoordinate = (fileLetter, rankNumber) => {
        const rank = piecePositions.split('/')[0 + (8 - rankNumber)];
        const index = 'abcdefgh'.indexOf(fileLetter);
        let target = null;
        let counter = 0;
        while (counter < 8) {
            target = rank[counter];
            const isNumber = Number.isInteger(Number(target));
            if (counter === index && !isNumber) {
                return target;
            }
            if (isNumber) {
                counter += Number(target);
            }
            else {
                counter++;
            }
        }
        return null;
    };
    // const isBlackCastleKingsideLegal = () => {
    //     if (!castlingRights.includes('k')) return false;
    // };
    const object = {
        moveNumber: fullMoveNumber,
        colorToMove: activeColor,
        whiteCanCastleKingside: castlingRights.includes('K'),
        whiteCanCastleQueenside: castlingRights.includes('Q'),
        blackCanCastleKingSide: castlingRights.includes('k'),
        blackCanCastleQueenSide: castlingRights.includes('q'),
        enPassantSquare: enPassantTarget,
        isEnPassantPossible: enPassantTarget && enPassantTarget !== '-',
        getPieceNotationFromFenByCoordinate,
    };
    return object;
};
// What is the difference between game and board? Which methods belong to the board?
// const startingFen: Fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const game = (startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') => {
    const BOARD = buildBoard();
    // Castling state
    let hasWhiteKingMoved = false;
    let hasBlackKingMoved = false;
    let hasa1Moved = false;
    let hash1Moved = false;
    let hasa8Moved = false;
    let hash8Moved = false;
    const loadFen = (fen) => {
        // Castling state would have to be reset
        //const [piecePositions, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = fen.split(' ');
        const { getPieceNotationFromFenByCoordinate } = interpretFen(fen);
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = [8, 7, 6, 5, 4, 3, 2, 1];
        for (const rank of ranks) {
            for (const file of files) {
                const existingPiece = BOARD.getPieceByCoordinate(`${file}${rank}`);
                if (existingPiece) {
                    BOARD.removePieceAtCoordinate(`${file}${rank}`);
                }
                const newPieceNotation = getPieceNotationFromFenByCoordinate(file, rank);
                if (!newPieceNotation)
                    continue;
                const newPiece = buildPiece(newPieceNotation);
                BOARD.placePieceAtCoordinate(newPiece, `${file}${rank}`);
            }
        }
    };
    loadFen(startingFen);
    const object = {
        BOARD,
        loadFen,
        get element() {
            return this.BOARD.el;
        },
        // get notation / clock () { etc - These belong to the game and not the board
        // }
    };
    return object;
};
// Board and game are indistinguishable right now, but they shouldn't be when I'm done
const g = game();
document.body.append(g.element);
class FenReader {
    // Class instances of FenReader are designed to be immutable. 
    // So we just parse it and figure out what every square contains.
    // Use this to calculate move legality.
    // So calculating every piece type in here is actually most appropriate, rather than each piece calculating itself
    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen;
    #threeFoldRepetitionMap = {}; // Does this belong in game, etc? Prob
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
    get inactiveColor() {
        return this.activeColor === 'w' ? 'b' : 'w';
    }
    getPieceByCoordinate(c) {
        const file = c[0];
        const fileIndex = 'abcdefgh'.indexOf(file);
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
            if (counter === fileIndex)
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
    getIsPieceAtCoordinateSameColorAsActive(c) {
        return this.activeColor === this.getPieceColorAtCoordinate(c);
    }
    get whiteCanCastleKingside() {
        if (this.activeColor === 'b')
            return false;
        if (this.isCheck)
            return false;
        // Squares are attacked
        const haventMoved = this.castlingRights.includes('K');
        return haventMoved &&
            !this.getPieceByCoordinate('f1') &&
            !this.getPieceByCoordinate('g1');
    }
    get whiteCanCastleQueenside() {
        if (this.activeColor === 'b')
            return false;
        if (this.isCheck)
            return false;
        // Squares are attacked
        const haventMoved = this.castlingRights.includes('Q');
        return haventMoved &&
            !this.getPieceByCoordinate('d1') &&
            !this.getPieceByCoordinate('c1') &&
            !this.getPieceByCoordinate('b1');
    }
    get blackCanCastleKingside() {
        if (this.activeColor === 'w')
            return false;
        if (this.isCheck)
            return false;
        // Squares are attacked
        const haventMoved = this.castlingRights.includes('k');
        return haventMoved &&
            !this.getPieceByCoordinate('f8') &&
            !this.getPieceByCoordinate('g8');
    }
    get blackCanCastleQueenside() {
        if (this.activeColor === 'w')
            return false;
        if (this.isCheck)
            return false;
        // Squares are attacked
        const haventMoved = this.castlingRights.includes('q');
        return haventMoved &&
            !this.getPieceByCoordinate('d8') &&
            !this.getPieceByCoordinate('c8') &&
            !this.getPieceByCoordinate('b8');
    }
    isSquareAttacked(c) {
    }
    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    move(from, to) {
        const piece = this.getPieceByCoordinate(from);
        const currentMove = this.activeColor;
        if (!piece)
            return null;
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece && currentMove === 'b')
            return null;
        if (!isWhitePiece && currentMove === 'w')
            return null;
        const p = piece.toLowerCase();
        let isMoveLegal = false;
        if (p === 'k')
            isMoveLegal = this.#isKingMoveLegal(from, to);
        else if (p === 'q') {
        }
        else if (p === 'r') {
        }
        else if (p === 'b') {
        }
        else if (p === 'n') {
        }
        else if (p === 'p') {
        }
        if (!isMoveLegal)
            return null;
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
    getRayCoordinates(startCoordinate, direction) {
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
    getLegalQueenMoves(startCoordinate, direction) {
        // We don't care if there is actually a rook on the starting square in this method,
        // we just assume there is
        const ray = this.getRayCoordinates(startCoordinate, direction);
        const result = [];
        if (this.isCheck) {
            // Must remove check to be legal (capture or block)
            return result;
        }
        for (const coordinate of ray) {
            // We don't have to check if we went off the board because getRay does that.
            const piece = this.getPieceByCoordinate(coordinate);
            if (!piece) {
                result.push(coordinate);
                continue;
            }
            // Here we know there is a piece
            if (this.getIsPieceAtCoordinateSameColorAsActive(coordinate)) {
                break;
            }
            // It's the opposite color so we can capture it
            result.push(coordinate);
            break;
        }
        return result;
    }
    getLegalRookMoves(startCoordinate, direction) {
        return this.getLegalQueenMoves(startCoordinate, direction);
    }
    getLegalBishopMoves(startCoordinate, direction) {
        return this.getLegalQueenMoves(startCoordinate, direction);
    }
    #isKingMoveLegal(from, to) {
        return false;
    }
    getRemaningPiecesPieceNotation(color) {
        // Just use fen
        return [];
    }
    getRemainingPiecesCoordinates(color) {
        return [];
    }
    get legalMoves() {
        return [];
    }
    doesThisMoveRemoveCheck(from, to) {
        // Generate fen, new FenReader, determine if still in check
    }
}
