"use strict";
class FenReader {
    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen;
    #splitFen;
    #splitPiecePlacement;
    #isPromotion;
    #coordinateObject;
    constructor(fen, isPromotion = false) {
        this.#fen = fen;
        this.#splitFen = fen.split(' ');
        if (this.#splitFen.length !== 6)
            throw new Error('Illegal FEN!');
        this.#splitPiecePlacement = this.piecePlacement.split('/');
        if (this.#splitPiecePlacement.length !== 8)
            throw new Error('Illegal FEN!');
        this.#coordinateObject = {};
        for (const rank of '12345678') {
            const rankString = this.#splitPiecePlacement[8 - Number(rank)];
            const expandedRank = this.#expandRank(rankString);
            for (const file of 'abcdefgh') {
                const coordinate = `${file}${rank}`;
                const fileIndex = 'abcdefgh'.indexOf(file);
                if (fileIndex < 0)
                    continue;
                const piece = expandedRank[fileIndex] === '0' ? null : expandedRank[fileIndex];
                this.#coordinateObject[coordinate] = piece;
            }
        }
        Object.freeze(this.#coordinateObject);
        this.#isPromotion = isPromotion;
    }
    get fen() {
        return this.#fen;
    }
    get piecePlacement() {
        return this.#splitFen[0];
    }
    get activeColor() {
        return this.#splitFen[1];
    }
    get inactiveColor() {
        return this.activeColor === 'w' ? 'b' : 'w';
    }
    get castlingRights() {
        return this.#splitFen[2];
    }
    get enPassantTarget() {
        return this.#splitFen[3];
    }
    get halfMoveClock() {
        return this.#splitFen[4];
    }
    get fullMoveNumber() {
        return this.#splitFen[5];
    }
    get isPromotion() {
        return this.#isPromotion;
    }
    get is50MoveRule() {
        return Number(this.halfMoveClock) >= 50;
    }
    get coordinateObject() {
        return this.#coordinateObject;
    }
    #isCheck = null;
    get isCheck() {
        if (this.#isCheck !== null)
            return this.#isCheck;
        const kingSquare = this.activeColor === 'w' ? this.whiteKingSquare : this.blackKingSquare;
        this.#isCheck = this.#getIsSquareAttacked(kingSquare);
        return this.#isCheck;
    }
    #whiteKingSquare = null;
    get whiteKingSquare() {
        if (this.#whiteKingSquare !== null)
            return this.#whiteKingSquare;
        for (const [c, p] of Object.entries(this.coordinateObject)) {
            if (p === 'K') {
                this.#whiteKingSquare = c;
                return c;
            }
        }
        throw new Error('No white king');
    }
    #blackKingSquare = null;
    get blackKingSquare() {
        if (this.#blackKingSquare !== null)
            return this.#blackKingSquare;
        for (const [c, p] of Object.entries(this.coordinateObject)) {
            if (p === 'k') {
                this.#blackKingSquare = c;
                return c;
            }
        }
        throw new Error('No black king');
    }
    #isCheckmate = null;
    get isCheckmate() {
        if (this.#isCheckmate !== null)
            return this.#isCheckmate;
        this.#isCheckmate = this.isCheck && !this.activeColorHasLegalMoves;
        return this.#isCheckmate;
    }
    #isStalemate = null;
    get isStalemate() {
        if (this.#isStalemate !== null)
            return this.#isStalemate;
        this.#isStalemate = !this.isCheck && !this.activeColorHasLegalMoves;
        return this.#isStalemate;
    }
    #isInsufficientMaterial = null;
    get isInsufficientMaterial() {
        if (this.#isInsufficientMaterial !== null)
            return this.#isInsufficientMaterial;
        this.#isInsufficientMaterial = (() => {
            let whiteKnights = 0;
            let blackKnights = 0;
            let whiteHasLightSquareBishop = false;
            let whiteHasDarkSquareBishop = false;
            let blackHasLightSquareBishop = false;
            let blackHasDarkSquareBishop = false;
            for (const [coordinate, piece] of Object.entries(this.coordinateObject)) {
                if (!piece)
                    continue;
                if (piece.toLowerCase() === 'p')
                    return false;
                if (piece.toLowerCase() === 'q')
                    return false;
                if (piece.toLowerCase() === 'r')
                    return false;
                if (piece === 'B') {
                    const isDark = this.#isDarkSquare(coordinate);
                    if (isDark)
                        whiteHasDarkSquareBishop = true;
                    else
                        whiteHasLightSquareBishop = true;
                }
                if (piece === 'b') {
                    const isDark = this.#isDarkSquare(coordinate);
                    if (isDark)
                        blackHasDarkSquareBishop = true;
                    else
                        blackHasLightSquareBishop = true;
                }
                if (piece === 'N')
                    whiteKnights += 1;
                if (piece === 'n')
                    blackKnights += 1;
            }
            if ((whiteHasLightSquareBishop || whiteHasDarkSquareBishop) && whiteKnights >= 1)
                return false;
            if ((blackHasLightSquareBishop || blackHasDarkSquareBishop) && blackKnights >= 1)
                return false;
            if (whiteKnights >= 2)
                return false;
            if (blackKnights >= 2)
                return false;
            if (whiteHasLightSquareBishop && whiteHasDarkSquareBishop)
                return false;
            if (blackHasLightSquareBishop && blackHasDarkSquareBishop)
                return false;
            return true;
        })();
        return this.#isInsufficientMaterial;
    }
    #activeColorHasLegalMoves = null;
    get activeColorHasLegalMoves() {
        if (this.#activeColorHasLegalMoves !== null)
            return this.#activeColorHasLegalMoves;
        for (const [coordinate, piece] of Object.entries(this.coordinateObject)) {
            if (!piece)
                continue;
            const isWhitePiece = this.#isWhitePiece(piece);
            if (this.activeColor === 'b' && isWhitePiece)
                continue;
            if (this.activeColor === 'w' && !isWhitePiece)
                continue;
            const moveset = this.getLegalMoves(coordinate);
            if (moveset.size > 0) {
                this.#activeColorHasLegalMoves = true;
                return this.#activeColorHasLegalMoves;
            }
            ;
        }
        this.#activeColorHasLegalMoves = false;
        return this.#activeColorHasLegalMoves;
    }
    #whiteCanCastleKingside = null;
    get whiteCanCastleKingside() {
        if (this.#whiteCanCastleKingside !== null)
            return this.#whiteCanCastleKingside;
        this.#whiteCanCastleKingside = (() => {
            if (!this.castlingRights.includes('K'))
                return false;
            if (this.activeColor === 'b')
                return false;
            if (this.getPieceAt('e1') !== 'K')
                return false;
            if (this.getPieceAt('h1') !== 'R')
                return false;
            if (this.isCheck)
                return false;
            if (this.getPieceAt('f1'))
                return false;
            if (this.getPieceAt('g1'))
                return false;
            if (this.#getIsSquareAttacked('f1', 'b'))
                return false;
            if (this.#getIsSquareAttacked('g1', 'b'))
                return false;
            return true;
        })();
        return this.#whiteCanCastleKingside;
    }
    #whiteCanCastleQueenside = null;
    get whiteCanCastleQueenside() {
        if (this.#whiteCanCastleQueenside !== null)
            return this.#whiteCanCastleQueenside;
        this.#whiteCanCastleQueenside = (() => {
            if (!this.castlingRights.includes('Q'))
                return false;
            if (this.activeColor === 'b')
                return false;
            if (this.getPieceAt('e1') !== 'K')
                return false;
            if (this.getPieceAt('a1') !== 'R')
                return false;
            if (this.isCheck)
                return false;
            if (this.getPieceAt('d1'))
                return false;
            if (this.getPieceAt('c1'))
                return false;
            if (this.getPieceAt('b1'))
                return false;
            if (this.#getIsSquareAttacked('d1', 'b'))
                return false;
            if (this.#getIsSquareAttacked('c1', 'b'))
                return false;
            if (this.#getIsSquareAttacked('b1', 'b'))
                return false;
            return true;
        })();
        return this.#whiteCanCastleQueenside;
    }
    #blackCanCastleKingside = null;
    get blackCanCastleKingside() {
        if (this.#blackCanCastleKingside !== null)
            return this.#blackCanCastleKingside;
        this.#blackCanCastleKingside = (() => {
            if (!this.castlingRights.includes('k'))
                return false;
            if (this.activeColor === 'w')
                return false;
            if (this.getPieceAt('e8') !== 'k')
                return false;
            if (this.getPieceAt('h8') !== 'r')
                return false;
            if (this.isCheck)
                return false;
            if (this.getPieceAt('f8'))
                return false;
            if (this.getPieceAt('g8'))
                return false;
            if (this.#getIsSquareAttacked('f8', 'w'))
                return false;
            if (this.#getIsSquareAttacked('g8', 'w'))
                return false;
            return true;
        })();
        return this.#blackCanCastleKingside;
    }
    #blackCanCastleQueenside = null;
    get blackCanCastleQueenside() {
        if (this.#blackCanCastleQueenside !== null)
            return this.#blackCanCastleQueenside;
        this.#blackCanCastleQueenside = (() => {
            if (!this.castlingRights.includes('q'))
                return false;
            if (this.activeColor === 'w')
                return false;
            if (this.getPieceAt('e8') !== 'k')
                return false;
            if (this.getPieceAt('a8') !== 'r')
                return false;
            if (this.isCheck)
                return false;
            if (this.getPieceAt('d8'))
                return false;
            if (this.getPieceAt('c8'))
                return false;
            if (this.getPieceAt('b8'))
                return false;
            if (this.#getIsSquareAttacked('d8', 'w'))
                return false;
            if (this.#getIsSquareAttacked('c8', 'w'))
                return false;
            if (this.#getIsSquareAttacked('b8', 'w'))
                return false;
            return true;
        })();
        return this.#blackCanCastleQueenside;
    }
    #evaluation = null;
    get evaluation() {
        if (this.#evaluation !== null)
            return this.#evaluation;
        if (this.isCheckmate) {
            this.#evaluation = this.activeColor === 'w' ? -Infinity : Infinity;
            return this.#evaluation;
        }
        let e = 0;
        for (const k in this.coordinateObject) {
            const p = this.coordinateObject[k];
            if (!p)
                continue;
            if (p === 'Q') {
                e += 9;
            }
            if (p === 'q') {
                e -= 9;
            }
            if (p === 'R') {
                e += 5;
            }
            if (p === 'r') {
                e -= 5;
            }
            if (p === 'B' || p === 'N') {
                e += 3;
            }
            if (p === 'b' || p === 'n') {
                e -= 3;
            }
            if (p === 'P') {
                e += 1;
            }
            if (p === 'p') {
                e -= 1;
            }
        }
        const e4 = this.getPieceAt('e4');
        const d4 = this.getPieceAt('d4');
        const e5 = this.getPieceAt('e5');
        const d5 = this.getPieceAt('d5');
        for (const p of [e4, d4, e5, d5]) {
            if (!p)
                continue;
            e += this.#isWhitePiece(p) ? .2 : -.2;
        }
        this.#evaluation = e;
        return this.#evaluation;
    }
    #legalMovesMemo = {};
    getLegalMoves(from) {
        if (this.#legalMovesMemo[from] instanceof Set)
            return this.#legalMovesMemo[from];
        const piece = this.getPieceAt(from);
        if (!piece) {
            this.#legalMovesMemo[from] = new Set();
            return this.#legalMovesMemo[from];
        }
        ;
        const p = piece.toLowerCase();
        if (p === 'k')
            this.#legalMovesMemo[from] = this.#getKingMovesWithCastling(from);
        else if (p === 'q')
            this.#legalMovesMemo[from] = this.#getQueenMoves(from);
        else if (p === 'r')
            this.#legalMovesMemo[from] = this.#getRookMoves(from);
        else if (p === 'b')
            this.#legalMovesMemo[from] = this.#getBishopMoves(from);
        else if (p === 'n')
            this.#legalMovesMemo[from] = this.#getKnightMoves(from);
        else if (p === 'p')
            this.#legalMovesMemo[from] = this.#getPawnMoves(from);
        for (const to of this.#legalMovesMemo[from]) {
            if (this.#detectCheck(from, to))
                this.#legalMovesMemo[from].delete(to);
        }
        return this.#legalMovesMemo[from];
    }
    getAllLegalMovesForActiveColor() {
        const result = new Set();
        const color = this.activeColor;
        for (const [from, p] of Object.entries(this.coordinateObject)) {
            if (!p)
                continue;
            const isWhite = this.#isWhitePiece(p);
            if (isWhite && color !== 'w')
                continue;
            if (!isWhite && color === 'w')
                continue;
            const moveset = this.getLegalMoves(from);
            for (const to of moveset) {
                result.add({ from, to });
            }
        }
        return result;
    }
    #controlledSquaresMemo = {};
    getControlledSquares(from) {
        if (this.#controlledSquaresMemo[from] instanceof Set)
            return this.#controlledSquaresMemo[from];
        const piece = this.getPieceAt(from);
        if (!piece) {
            this.#controlledSquaresMemo[from] = new Set();
            return this.#controlledSquaresMemo[from];
        }
        ;
        const p = piece.toLowerCase();
        if (p === 'k')
            this.#controlledSquaresMemo[from] = this.#getKingMovesExceptCastling(from, this.inactiveColor);
        else if (p === 'p')
            this.#controlledSquaresMemo[from] = this.#getPawnControlledSquares(from, this.inactiveColor);
        else if (p === 'q')
            this.#controlledSquaresMemo[from] = this.#getQueenMoves(from, this.inactiveColor);
        else if (p === 'r')
            this.#controlledSquaresMemo[from] = this.#getRookMoves(from, this.inactiveColor);
        else if (p === 'b')
            this.#controlledSquaresMemo[from] = this.#getBishopMoves(from, this.inactiveColor);
        else if (p === 'n')
            this.#controlledSquaresMemo[from] = this.#getKnightMoves(from, this.inactiveColor);
        return this.#controlledSquaresMemo[from];
    }
    requestMove(from, to) {
        if (!from || !to)
            return null;
        if (from === to)
            return null;
        const piece = this.getPieceAt(from);
        if (!piece)
            return null;
        const isWhitePiece = this.#isWhitePiece(piece);
        if (isWhitePiece && this.activeColor === 'b')
            return null;
        if (!isWhitePiece && this.activeColor === 'w')
            return null;
        const moveset = this.getLegalMoves(from);
        if (!moveset.has(to))
            return null;
        return this.#generateNewFenReaderFromMove(from, to);
    }
    requestPromotion(promoteTo = 'Q') {
        const promotedPawnColor = this.inactiveColor;
        const pawn = promotedPawnColor === 'w' ? 'P' : 'p';
        const rankIndex = promotedPawnColor === 'w' ? 0 : 7;
        if (promotedPawnColor === 'b')
            promoteTo = promoteTo.toLowerCase();
        const ranks = this.piecePlacement.split('/');
        const rank = ranks[rankIndex];
        const expandedRank = this.#expandRank(rank);
        const pawnIndex = expandedRank.indexOf(pawn);
        if (pawnIndex < 0)
            throw new Error('promotion error');
        expandedRank[pawnIndex] = promoteTo;
        ranks[rankIndex] = this.#compressRank(expandedRank);
        const piecePlacement = ranks.join('/');
        const split = this.fen.split(' ');
        split[0] = piecePlacement;
        return new FenReader(split.join(' '));
    }
    getPieceAt(coordinate) {
        return this.coordinateObject[coordinate];
    }
    getCoordinatesOfPieceTypeThatCanHitAnotherCoordinate(pieceType, target) {
        const pieceCoordinates = [];
        for (const [c, p] of Object.entries(this.coordinateObject)) {
            if (p === pieceType)
                pieceCoordinates.push(c);
        }
        const result = [];
        for (const startCoordinate of pieceCoordinates) {
            if (this.getLegalMoves(startCoordinate).has(target)) {
                result.push(startCoordinate);
            }
            ;
        }
        return result;
    }
    getRandomLegalMove() {
        const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const allCoordinates = [];
        for (const [coord, p] of Object.entries(this.coordinateObject)) {
            if (!p)
                continue;
            if (this.activeColor === 'w' && p.toUpperCase() === p) {
                allCoordinates.push(coord);
            }
            else if (this.activeColor === 'b' && p.toLowerCase() === p) {
                allCoordinates.push(coord);
            }
        }
        if (!this.activeColorHasLegalMoves)
            return null;
        const from = getRandom(allCoordinates);
        const moveset = this.getLegalMoves(from);
        if (!moveset.size)
            return this.getRandomLegalMove();
        const to = getRandom([...moveset]);
        return { from, to };
    }
    #getPieceColorAt(coordinate) {
        const piece = this.getPieceAt(coordinate);
        if (!piece)
            return null;
        if (piece.toLowerCase() === piece)
            return 'b';
        return 'w';
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
        const ray = this.#getRayCoordinates(startCoordinate, direction);
        const result = [];
        for (const coordinate of ray) {
            const colorOfPieceInTheWay = this.#getPieceColorAt(coordinate);
            if (colorOfPieceInTheWay === null) {
                result.push(coordinate);
                continue;
            }
            if (color !== colorOfPieceInTheWay) {
                result.push(coordinate);
            }
            break;
        }
        return result;
    }
    #getKingMovesExceptCastling(startCoordinate, color = this.activeColor) {
        const result = new Set();
        for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft']) {
            const coordinate = this.#getAdjacentCoordinate(startCoordinate, direction);
            if (!coordinate)
                continue;
            if (this.#getPieceColorAt(coordinate) === color)
                continue;
            result.add(coordinate);
        }
        return result;
    }
    #getKingMovesWithCastling(startCoordinate, color = this.activeColor) {
        const result = this.#getKingMovesExceptCastling(startCoordinate, color);
        if (color === 'w') {
            if (this.whiteCanCastleKingside)
                result.add('g1');
            if (this.whiteCanCastleQueenside)
                result.add('c1');
        }
        else {
            if (this.blackCanCastleKingside)
                result.add('g8');
            if (this.blackCanCastleQueenside)
                result.add('c8');
        }
        return result;
    }
    #getQueenMoves(startCoordinate, color = this.activeColor) {
        const rookMoves = this.#getRookMoves(startCoordinate, color);
        const bishopMoves = this.#getBishopMoves(startCoordinate, color);
        return new Set([...rookMoves, ...bishopMoves]);
    }
    #getRookMoves(startCoordinate, color = this.activeColor) {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'up', color),
            ...this.#getRayMoves(startCoordinate, 'down', color),
            ...this.#getRayMoves(startCoordinate, 'left', color),
            ...this.#getRayMoves(startCoordinate, 'right', color),
        ]);
    }
    #getBishopMoves(startCoordinate, color = this.activeColor) {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'upright', color),
            ...this.#getRayMoves(startCoordinate, 'downright', color),
            ...this.#getRayMoves(startCoordinate, 'downleft', color),
            ...this.#getRayMoves(startCoordinate, 'upleft', color),
        ]);
    }
    #getKnightMoves(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const upLeft = this.#getAdjacentCoordinate(startCoordinate, 'upleft');
        const upTwoLeftOne = upLeft && this.#getAdjacentCoordinate(upLeft, 'up');
        const upRight = this.#getAdjacentCoordinate(startCoordinate, 'upright');
        const upTwoRightOne = upRight && this.#getAdjacentCoordinate(upRight, 'up');
        const right = this.#getAdjacentCoordinate(startCoordinate, 'right');
        const rightTwoUpOne = right && this.#getAdjacentCoordinate(right, 'upright');
        const rightTwoDownOne = right && this.#getAdjacentCoordinate(right, 'downright');
        const downRight = this.#getAdjacentCoordinate(startCoordinate, 'downright');
        const downTwoRightOne = downRight && this.#getAdjacentCoordinate(downRight, 'down');
        const downLeft = this.#getAdjacentCoordinate(startCoordinate, 'downleft');
        const downTwoLeftOne = downLeft && this.#getAdjacentCoordinate(downLeft, 'down');
        const left = this.#getAdjacentCoordinate(startCoordinate, 'left');
        const leftTwoUpOne = left && this.#getAdjacentCoordinate(left, 'upleft');
        const leftTwoDownOne = left && this.#getAdjacentCoordinate(left, 'downleft');
        for (const coordinate of [
            upTwoLeftOne, upTwoRightOne, rightTwoUpOne, rightTwoDownOne,
            downTwoRightOne, downTwoLeftOne, leftTwoUpOne, leftTwoDownOne
        ]) {
            if (!coordinate)
                continue;
            if (this.#getPieceColorAt(coordinate) === color)
                continue;
            result.add(coordinate);
        }
        return result;
    }
    #getPawnMoves(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const hasNotMoved = (startCoordinate[1] === '2' && color === 'w') || (startCoordinate[1] === '7' && color === 'b');
        const squareInFront = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'up' : 'down');
        const pieceInFront = squareInFront && this.getPieceAt(squareInFront);
        if (squareInFront && !pieceInFront)
            result.add(squareInFront);
        if (hasNotMoved && squareInFront && !pieceInFront) {
            const twoInFront = this.#getAdjacentCoordinate(squareInFront, color === 'w' ? 'up' : 'down');
            if (twoInFront && !this.getPieceAt(twoInFront))
                result.add(twoInFront);
        }
        const oppositeColor = color === 'w' ? 'b' : 'w';
        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight && this.#getPieceColorAt(squareUpRight) === oppositeColor)
            result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft && this.#getPieceColorAt(squareUpLeft) === oppositeColor)
            result.add(squareUpLeft);
        if (this.enPassantTarget === squareUpRight || this.enPassantTarget === squareUpLeft) {
            result.add(this.enPassantTarget);
        }
        return result;
    }
    #getPawnControlledSquares(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight)
            result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft)
            result.add(squareUpLeft);
        return result;
    }
    #getIsSquareAttacked(c, color = this.inactiveColor) {
        for (const [attackingCoordinate, piece] of Object.entries(this.coordinateObject)) {
            if (!piece)
                continue;
            const isWhite = this.#isWhitePiece(piece);
            if ((color === 'b' && isWhite))
                continue;
            if (color === 'w' && !isWhite)
                continue;
            if (this.getControlledSquares(attackingCoordinate).has(c))
                return true;
        }
        return false;
    }
    #detectCheck(from, to) {
        const testFenReader = this.#generateNewFenReaderFromMove(from, to, false);
        return testFenReader.isCheck;
    }
    #generateNewFenReaderFromMove(from, to, changeTurns = true) {
        let piecePlacement = this.piecePlacement;
        let activeColor = this.activeColor;
        let castlingRights = this.castlingRights;
        let enPassantTarget = this.enPassantTarget;
        let halfMoveClock = this.halfMoveClock;
        let fullMoveNumber = this.fullMoveNumber;
        const movingPiece = this.getPieceAt(from);
        if (!movingPiece)
            throw new Error('no piece?');
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const fromFileIndex = 'abcdefgh'.indexOf(fromFile);
        const toFileIndex = 'abcdefgh'.indexOf(toFile);
        const shouldReset50MoveClock = movingPiece.toLowerCase() === 'p' || !!this.getPieceAt(to);
        const isWhiteCastleKingside = movingPiece === 'K' && from === 'e1' && to === 'g1';
        const isWhiteCastleQueenside = movingPiece === 'K' && from === 'e1' && to === 'c1';
        const isBlackCastleKingside = movingPiece === 'k' && from === 'e8' && to === 'g8';
        const isBlackCastleQueenside = movingPiece === 'k' && from === 'e8' && to === 'c8';
        const isEnPassant = (this.activeColor === 'w' && movingPiece === 'P' && to === enPassantTarget) ||
            (this.activeColor === 'b' && movingPiece === 'p' && to === enPassantTarget);
        const isPromotion = (this.activeColor === 'w' && movingPiece === 'P' && toRank === '8') ||
            (this.activeColor === 'b' && movingPiece === 'p' && toRank === '1');
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
        let newEnPassantTarget = enPassantTarget;
        if (movingPiece === 'P' && fromRank === '2' && toRank === '4') {
            newEnPassantTarget = `${fromFile}3`;
        }
        else if (movingPiece === 'p' && fromRank === '7' && toRank === '5') {
            newEnPassantTarget = `${fromFile}6`;
        }
        else {
            newEnPassantTarget = '-';
        }
        if (changeTurns) {
            activeColor = activeColor === 'w' ? 'b' : 'w';
            if (this.activeColor === 'b') {
                fullMoveNumber = String(Number(fullMoveNumber) + 1);
                halfMoveClock = String(Number(halfMoveClock) + 1);
            }
            if (shouldReset50MoveClock)
                halfMoveClock = '0';
        }
        const ranks = piecePlacement.split('/');
        if (fromRank === toRank) {
            const rankArray = this.#expandRank(ranks[8 - Number(toRank)]);
            rankArray[fromFileIndex] = '0';
            rankArray[toFileIndex] = movingPiece;
            if (isWhiteCastleKingside) {
                rankArray[7] = '0';
                rankArray[5] = 'R';
            }
            else if (isBlackCastleKingside) {
                rankArray[7] = '0';
                rankArray[5] = 'r';
            }
            else if (isWhiteCastleQueenside) {
                rankArray[0] = '0';
                rankArray[3] = 'R';
            }
            else if (isBlackCastleQueenside) {
                rankArray[0] = '0';
                rankArray[3] = 'r';
            }
            ranks[8 - Number(fromRank)] = this.#compressRank(rankArray);
        }
        else {
            const fromRankArr = this.#expandRank(ranks[8 - Number(fromRank)]);
            const toRankArr = this.#expandRank(ranks[8 - Number(toRank)]);
            fromRankArr[fromFileIndex] = '0';
            toRankArr[toFileIndex] = movingPiece;
            ranks[8 - Number(fromRank)] = this.#compressRank(fromRankArr);
            ranks[8 - Number(toRank)] = this.#compressRank(toRankArr);
        }
        if (isEnPassant) {
            const enPassantFile = enPassantTarget[0];
            const enPassantFileIndex = 'abcdefgh'.indexOf(enPassantFile);
            const enPassantPawnRank = this.activeColor == 'w' ? '5' : '4';
            const enPassantRankArray = this.#expandRank(ranks[8 - Number(enPassantPawnRank)]);
            enPassantRankArray[enPassantFileIndex] = '0';
            ranks[8 - Number(enPassantPawnRank)] = this.#compressRank(enPassantRankArray);
        }
        const newPiecePlacement = ranks.join('/');
        const fen = `${newPiecePlacement} ${activeColor} ${castlingRights} ${newEnPassantTarget} ${halfMoveClock} ${fullMoveNumber}`;
        return new FenReader(fen, isPromotion);
    }
    #expandRank(rank) {
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
    #compressRank(expandedRankArray) {
        let rankString = '';
        let count = 0;
        for (const char of expandedRankArray) {
            if (char === '0') {
                count++;
                continue;
            }
            if (count)
                rankString += String(count);
            rankString += char;
            count = 0;
        }
        if (count)
            rankString += String(count);
        return rankString;
    }
    #isDarkSquare(coordinate) {
        const file = coordinate[0];
        const rank = coordinate[1];
        const fileIndex = 'abcdefgh'.indexOf(file);
        if (Number(rank) % 2 === 0)
            return fileIndex % 2 !== 0;
        return fileIndex % 2 === 0;
    }
    #isWhitePiece(p) {
        return p.toUpperCase() === p;
    }
}
class ChessBoard extends HTMLElement {
    #isInitialized = false;
    #squaresObj = {};
    #squaresMap = new Map();
    #threeFoldRepetitionCounter = {};
    #fenArray = [];
    #notationArray = [];
    #currentlyViewingIndex = 0;
    #isGameOver = false;
    #isWhite = true;
    #board = document.createElement('div');
    #backButton = document.createElement('button');
    #forwardButton = document.createElement('button');
    #goToStartButton = document.createElement('button');
    #goToEndButton = document.createElement('button');
    #takebackButton = document.createElement('button');
    #fenDiv = document.createElement('div');
    #notationDiv = document.createElement('div');
    #notationButtons = [];
    #drag = window.innerWidth > 1024;
    #autoPromote = false;
    #FenReaders = {};
    constructor() {
        super();
    }
    connectedCallback() {
        if (this.#isInitialized)
            return;
        let dark = false;
        this.#board.className = 'board';
        for (const rank of '87654321') {
            for (const file of 'abcdefgh') {
                const square = document.createElement('div');
                if (dark)
                    square.classList.add('d');
                this.#squaresObj[`${file}${rank}`] = square;
                this.#squaresMap.set(square, `${file}${rank}`);
                dark = !dark;
            }
            dark = !dark;
        }
        const controls = document.createElement('div');
        controls.className = 'controls';
        const fenInput = document.createElement('input');
        fenInput.type = 'text';
        fenInput.placeholder = 'Load FEN';
        fenInput.addEventListener('keyup', (e) => {
            if (e.key !== 'Enter')
                return;
            this.#loadFen(fenInput.value);
            fenInput.value = '';
        });
        this.#backButton.type = 'button';
        this.#backButton.textContent = '<';
        this.#backButton.addEventListener('click', () => this.back());
        this.#forwardButton.type = 'button';
        this.#forwardButton.textContent = '>';
        this.#forwardButton.addEventListener('click', () => this.forward());
        this.#goToStartButton.type = 'button';
        this.#goToStartButton.textContent = '<<';
        this.#goToStartButton.addEventListener('click', () => this.goToStart());
        this.#goToEndButton.type = 'button';
        this.#goToEndButton.textContent = '>>';
        this.#goToEndButton.addEventListener('click', () => this.goToEnd());
        this.#takebackButton.type = 'button';
        this.#takebackButton.textContent = '↺';
        this.#takebackButton.addEventListener('click', () => this.takeback());
        const playBotButton = document.createElement('button');
        playBotButton.type = 'button';
        playBotButton.textContent = 'Play bot';
        playBotButton.addEventListener('click', () => {
            this.#playBotDialog();
        });
        const mainButtons = document.createElement('div');
        mainButtons.className = 'main-buttons';
        const newAnalysisButton = document.createElement('button');
        newAnalysisButton.type = 'button';
        newAnalysisButton.textContent = 'Analysis';
        newAnalysisButton.addEventListener('click', () => this.#restartGame());
        const resignButton = document.createElement('button');
        resignButton.type = 'button';
        resignButton.textContent = 'Resign';
        resignButton.addEventListener('click', () => this.#endGame());
        const loadFenButton = document.createElement('button');
        loadFenButton.type = 'button';
        loadFenButton.textContent = 'Load FEN';
        loadFenButton.addEventListener('click', async () => {
            const fen = await this.#loadFenDialog();
            if (!fen)
                return;
            this.#loadFen(fen);
        });
        const flipBoardButton = document.createElement('button');
        flipBoardButton.type = 'button';
        flipBoardButton.textContent = 'Flip Board';
        flipBoardButton.addEventListener('click', () => {
            this.#flipBoard();
        });
        const pieceSizeDiv = document.createElement('div');
        const pieceSizeLabel = document.createElement('label');
        pieceSizeLabel.textContent = 'Piece Size';
        pieceSizeLabel.htmlFor = 'chess-board-piece-size';
        const pieceSizeInput = document.createElement('input');
        pieceSizeInput.type = 'range';
        pieceSizeInput.id = 'chess-board-piece-size';
        pieceSizeInput.min = '5';
        pieceSizeInput.max = '10';
        this.style.setProperty('--pieceSize', `calc(var(--squareSize) * ${1})`);
        pieceSizeInput.addEventListener('input', () => {
            const val = Number(pieceSizeInput.value) / 10;
            this.style.setProperty('--pieceSize', `calc(var(--squareSize) * ${val})`);
        });
        pieceSizeDiv.replaceChildren(pieceSizeLabel, pieceSizeInput);
        const radioFieldset = document.createElement('fieldset');
        const radioLegend = document.createElement('legend');
        radioLegend.textContent = 'Move behavior';
        const dragRadio = document.createElement('input');
        dragRadio.type = 'radio';
        dragRadio.name = 'chess-board-click-drag';
        dragRadio.checked = this.#drag;
        const dragLabel = document.createElement('label');
        dragLabel.replaceChildren(dragRadio, 'Drag piece to move');
        const clickRadio = document.createElement('input');
        clickRadio.type = 'radio';
        clickRadio.name = 'chess-board-click-drag';
        clickRadio.checked = !this.#drag;
        const clickLabel = document.createElement('label');
        clickLabel.replaceChildren(clickRadio, 'Click two squares to move');
        radioFieldset.replaceChildren(radioLegend, dragLabel, clickLabel);
        radioFieldset.addEventListener('change', () => {
            this.#drag = dragRadio.checked;
        });
        const autoPromoteCheckbox = document.createElement('input');
        autoPromoteCheckbox.type = 'checkbox';
        autoPromoteCheckbox.checked = this.#autoPromote;
        const autoPromoteLabel = document.createElement('label');
        autoPromoteLabel.replaceChildren(autoPromoteCheckbox, 'Auto-promote to Queen');
        autoPromoteCheckbox.addEventListener('change', () => this.#autoPromote = autoPromoteCheckbox.checked);
        this.style.setProperty('--darkSquare', '#7d4a8d');
        this.style.setProperty('--lightSquare', '#9f90b0');
        const colorFieldset = document.createElement('fieldset');
        const colorLegend = document.createElement('legend');
        colorLegend.textContent = 'Board color';
        const darkSquareInput = document.createElement('input');
        darkSquareInput.type = 'color';
        darkSquareInput.value = '#7d4a8d';
        darkSquareInput.addEventListener('input', () => this.style.setProperty('--darkSquare', darkSquareInput.value));
        const lightSquareInput = document.createElement('input');
        lightSquareInput.type = 'color';
        lightSquareInput.value = '#9f90b0';
        lightSquareInput.addEventListener('input', () => this.style.setProperty('--lightSquare', lightSquareInput.value));
        colorFieldset.replaceChildren(colorLegend, darkSquareInput, lightSquareInput);
        const settingsButton = document.createElement('button');
        settingsButton.type = 'button';
        settingsButton.textContent = 'Settings';
        settingsButton.addEventListener('click', () => settingsDialog.showModal());
        const settingsDialog = document.createElement('dialog');
        const settingsOk = document.createElement('button');
        settingsOk.style.justifySelf = 'end';
        settingsOk.type = 'button';
        settingsOk.textContent = 'OK';
        settingsOk.addEventListener('click', () => settingsDialog.close());
        settingsDialog.replaceChildren(radioFieldset, autoPromoteLabel, pieceSizeDiv, colorFieldset, settingsOk);
        mainButtons.replaceChildren(newAnalysisButton, playBotButton, loadFenButton, resignButton, flipBoardButton, settingsButton);
        controls.replaceChildren(this.#goToStartButton, this.#backButton, this.#forwardButton, this.#goToEndButton, this.#takebackButton);
        const panel = document.createElement('div');
        panel.className = 'panel';
        this.#notationDiv.className = 'notation';
        this.#notationDiv.addEventListener('click', (e) => {
            if (!(e.target instanceof HTMLButtonElement))
                return;
            const index = this.#notationButtons.indexOf(e.target);
            if (index < 0)
                return;
            this.goToPly(index + 1);
        });
        this.#fenDiv.className = 'fen-div';
        panel.replaceChildren(mainButtons, controls, this.#notationDiv, this.#fenDiv);
        this.#board.tabIndex = 0;
        this.#board.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight') {
                this.forward();
            }
            else if (e.key === 'ArrowLeft') {
                this.back();
            }
            else if (e.key === 'ArrowUp') {
                this.goToStart();
            }
            else if (e.key === 'ArrowDown') {
                this.goToEnd();
            }
        });
        this.replaceChildren(this.#board, panel, settingsDialog);
        this.#setUpPieces();
        this.#restartGame();
        this.#isInitialized = true;
    }
    get fen() {
        return this.#fenArray[this.#currentlyViewingIndex] ?? '';
    }
    #getFenReader(fen, isPromotion = false) {
        if (this.#FenReaders[fen])
            return this.#FenReaders[fen];
        const newFR = new FenReader(fen, isPromotion);
        this.#FenReaders[fen] = newFR;
        return newFR;
    }
    get isCurrent() {
        return this.#currentlyViewingIndex === this.#fenArray.length - 1 && !this.#isGameOver;
    }
    #loadFen(fen) {
        this.#isGameOver = false;
        this.#fenArray = [];
        this.#clearNotation();
        this.#currentlyViewingIndex = 0;
        this.#threeFoldRepetitionCounter = {};
        const fenReader = this.#getFenReader(fen);
        this.#updateDom(fenReader);
        this.#commitNewMove(fenReader);
        this.#updateDataset(fenReader);
    }
    #endGame() {
        this.#isGameOver = true;
    }
    #restartGame() {
        this.#endGame();
        this.#loadFen(FenReader.startingFen);
    }
    #flipBoard() {
        this.#isWhite = !this.#isWhite;
        this.#setUpPieces();
    }
    #setUpPieces() {
        this.#board.replaceChildren();
        const ranks = this.#isWhite ? '87654321' : '12345678';
        const files = this.#isWhite ? 'abcdefgh' : 'hgfedcba';
        for (const rank of ranks) {
            for (const file of files) {
                const square = this.#squaresObj[`${file}${rank}`];
                this.#board.append(square);
            }
        }
    }
    goToPly(fenIndex) {
        if (fenIndex < 0)
            return;
        if (fenIndex > this.#fenArray.length - 1)
            return;
        const newFen = this.#fenArray[fenIndex];
        const fenReader = this.#getFenReader(newFen);
        this.#updateDom(fenReader);
        this.#currentlyViewingIndex = fenIndex;
        this.#updateDataset(fenReader);
    }
    forward() {
        if (this.isCurrent)
            return;
        this.goToPly(this.#currentlyViewingIndex + 1);
    }
    back() {
        this.goToPly(this.#currentlyViewingIndex - 1);
    }
    goToStart() {
        this.goToPly(0);
    }
    goToEnd() {
        this.goToPly(this.#fenArray.length - 1);
    }
    takeback() {
        if (this.#fenArray.length < 2)
            return;
        this.#fenArray.pop();
        this.#notationArray.pop();
        this.#notationButtons.pop();
        const div = this.#notationDiv.lastElementChild;
        if (!div)
            return;
        div.lastElementChild?.remove();
        if (div.lastChild instanceof Text) {
            div.remove();
        }
        this.goToEnd();
    }
    async #tryMove(from, to) {
        const currentFenReader = this.#getFenReader(this.fen);
        let fenReader = currentFenReader.requestMove(from, to);
        if (fenReader === null)
            return false;
        if (fenReader.isPromotion) {
            const autoPromote = this.#autoPromote || (this.#isPlayingBot && this.#botColor === fenReader.inactiveColor);
            const promoteTo = autoPromote ? 'Q' : await this.#promotionDialog(fenReader.inactiveColor);
            fenReader = fenReader.requestPromotion(promoteTo);
            if (fenReader === null)
                return false;
        }
        this.#updateDom(fenReader);
        this.#commitNewMove(fenReader);
        this.#updateDataset(fenReader);
        const notation = this.#getNotation(from, to, currentFenReader, fenReader);
        this.#addNotation(notation);
        this.#currentlyViewingIndex = this.#fenArray.length - 1;
        return true;
    }
    #getNotation(from, to, currentFenReader, newFenReader) {
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const piece = currentFenReader.getPieceAt(from);
        if (!piece)
            return 'Error';
        const p = piece.toUpperCase();
        const isCapture = !!currentFenReader.getPieceAt(to);
        const isCheck = newFenReader.isCheck;
        const isCheckmate = newFenReader.isCheckmate;
        const checkString = isCheckmate ? '#' : isCheck ? '+' : '';
        const isCastleKingside = p === 'K' && fromFile === 'e' && toFile === 'g';
        const isCastleQueenside = p === 'K' && fromFile === 'e' && toFile === 'c';
        if (isCastleKingside)
            return `O-O${checkString}`;
        if (isCastleQueenside)
            return `O-O-O${checkString}`;
        if (p === 'P') {
            const isEnPassant = currentFenReader.enPassantTarget === to;
            const isPromotion = toRank === '1' || toRank === '8';
            const promotionString = isPromotion ? `=${newFenReader.getPieceAt(to)?.toUpperCase()}` : '';
            if (isCapture || isEnPassant) {
                return `${fromFile}x${to}${promotionString}${checkString}`;
            }
            return `${to}${promotionString}${checkString}`;
        }
        const piecesThatHitTarget = currentFenReader.getCoordinatesOfPieceTypeThatCanHitAnotherCoordinate(piece, to);
        if (piecesThatHitTarget.length < 1) {
            return 'error';
        }
        else if (piecesThatHitTarget.length === 1) {
            if (isCapture) {
                return `${p}x${to}${checkString}`;
            }
            return `${p}${to}${checkString}`;
        }
        const hasOneOnSameRank = piecesThatHitTarget.some(c => c !== from && c[1] === fromRank);
        const hasOneOnSameFile = piecesThatHitTarget.some(c => c !== from && c[0] === fromFile);
        const fileString = !hasOneOnSameFile || hasOneOnSameRank ? fromFile : '';
        const rankString = hasOneOnSameFile ? fromRank : '';
        if (isCapture) {
            return `${p}${fileString}${rankString}x${to}${checkString}`;
        }
        return `${p}${fileString}${rankString}${to}${checkString}`;
    }
    #buildPiece(pieceNotation) {
        const piece = document.createElement('img');
        const uppercase = pieceNotation.toUpperCase();
        const color = uppercase === pieceNotation ? 'w' : 'b';
        const set = 'alpha';
        piece.className = `p ${color}`;
        piece.src = `./${set}/${color}${uppercase}.svg`;
        let offsetX = 0;
        let offsetY = 0;
        let moveset = null;
        const clearActiveStyle = () => {
            for (const square of Object.values(this.#squaresObj)) {
                square.classList.remove('legal', 'active');
            }
        };
        const handleDown = (e) => {
            e.preventDefault();
            if (this.#isGameOver)
                return;
            if (!this.isCurrent)
                return;
            if (this.#isPlayingBot && color === this.#botColor)
                return;
            const from = this.#squaresMap.get(piece.parentElement);
            if (!from)
                return;
            const fenReader = this.#getFenReader(this.fen);
            if (color !== fenReader.activeColor)
                return;
            if (this.#drag) {
                piece.style.position = 'absolute';
                offsetX = piece.getBoundingClientRect().width / 2;
                offsetY = piece.getBoundingClientRect().height / 2;
                const left = e.clientX - offsetX + window.scrollX;
                const top = e.clientY - offsetY + window.scrollY;
                piece.style.left = `${left}px`;
                piece.style.top = `${top}px`;
                window.addEventListener('pointermove', handleMove);
                window.addEventListener('pointerup', handleUp, { once: true });
            }
            else {
                const pointerDown = async (e) => {
                    let target = e.target;
                    if (!(target instanceof HTMLElement))
                        return;
                    if (target.classList.contains('p')) {
                        target = target.parentElement;
                    }
                    if (!(target instanceof HTMLDivElement))
                        return;
                    const to = this.#squaresMap.get(target);
                    if (!to)
                        return;
                    const result = await this.#tryMove(from, to);
                    if (result) {
                        clearActiveStyle();
                    }
                    else {
                        clearActiveStyle();
                        setTimeout(() => {
                            this.addEventListener('pointerdown', pointerDown, { once: true });
                        }, 2);
                    }
                };
                setTimeout(() => {
                    this.addEventListener('pointerdown', pointerDown, { once: true });
                }, 2);
            }
            this.#squaresObj[from].classList.add('active');
            moveset = fenReader.getLegalMoves(from);
            for (const coordinate of moveset) {
                const square = this.#squaresObj[coordinate];
                square.classList.add('legal');
            }
        };
        const handleMove = (e) => {
            const left = e.clientX - offsetX + window.scrollX;
            const top = e.clientY - offsetY + window.scrollY;
            piece.style.left = `${left}px`;
            piece.style.top = `${top}px`;
        };
        const handleUp = (e) => {
            piece.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            clearActiveStyle();
            const from = this.#squaresMap.get(piece.parentElement);
            if (!from)
                return;
            this.#squaresObj[from].classList.remove('active');
            const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY)
                .find(el => el instanceof HTMLDivElement && this.#squaresMap.has(el));
            if (!hoveredSquare)
                return;
            const to = this.#squaresMap.get(hoveredSquare);
            if (!to)
                return;
            this.#tryMove(from, to);
        };
        piece.addEventListener('dragstart', (e) => e.preventDefault());
        piece.addEventListener('mousedown', (e) => e.preventDefault());
        piece.addEventListener('pointerdown', handleDown);
        return piece;
    }
    #addNotation(notation) {
        this.#notationArray.push(notation);
        const index = this.#notationArray.length;
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = notation;
        this.#notationButtons.push(button);
        if (index % 2 === 1) {
            const div = document.createElement('div');
            const n = `${(index / 2) + .5}. `;
            div.replaceChildren(n, button);
            this.#notationDiv.append(div);
        }
        else {
            this.#notationDiv.lastElementChild?.append(button);
        }
    }
    #clearNotation() {
        this.#notationArray = [];
        this.#notationButtons = [];
        this.#notationDiv.replaceChildren();
    }
    #updateDom(fenReader) {
        const isEmptyBoard = !this.fen;
        const currentFenReader = this.#getFenReader(isEmptyBoard ? FenReader.startingFen : this.fen);
        const activeColor = fenReader.activeColor;
        const isCheck = fenReader.isCheck;
        const isCheckmate = fenReader.isCheckmate;
        for (const rank of '12345678') {
            for (const file of 'abcdefgh') {
                const coordinate = `${file}${rank}`;
                const square = this.#squaresObj[coordinate];
                square.classList.remove('check', 'checkmate');
                const currentPiece = currentFenReader.getPieceAt(coordinate);
                const updatedPiece = fenReader.getPieceAt(coordinate);
                if (isCheck && ((activeColor === 'w' && updatedPiece === 'K') || (activeColor === 'b' && updatedPiece === 'k'))) {
                    square.classList.add('check');
                    if (isCheckmate)
                        square.classList.add('checkmate');
                }
                if (currentPiece === updatedPiece && !isEmptyBoard)
                    continue;
                square.replaceChildren(updatedPiece ? this.#buildPiece(updatedPiece) : '');
            }
        }
        this.#fenDiv.textContent = fenReader.fen;
    }
    #updateDataset(updatedFenReader) {
        const isCurrent = this.#fenArray.length - 1 === this.#fenArray.indexOf(updatedFenReader.fen);
        this.dataset.activeColor = isCurrent ? updatedFenReader.activeColor : '';
        if (this.#isGameOver)
            this.dataset.activeColor = '';
    }
    #commitNewMove(fenReader) {
        const piecePlacement = fenReader.piecePlacement;
        this.#threeFoldRepetitionCounter[piecePlacement] ??= 0;
        this.#threeFoldRepetitionCounter[piecePlacement] += 1;
        const isThreefoldRepetition = this.#threeFoldRepetitionCounter[piecePlacement] >= 3;
        this.#fenArray.push(fenReader.fen);
        if (isThreefoldRepetition) {
            this.#messageDialog('Draw: Threefold repetition');
            return this.#endGame();
        }
        if (fenReader.isCheckmate) {
            this.#messageDialog('Game over: Checkmate');
            return this.#endGame();
        }
        if (fenReader.isInsufficientMaterial) {
            this.#messageDialog('Draw: Insufficient material');
            return this.#endGame();
        }
        if (fenReader.isStalemate) {
            this.#messageDialog('Draw: Stalemate');
            return this.#endGame();
        }
        if (fenReader.is50MoveRule) {
            this.#messageDialog('Draw: Fifty move rule');
            return this.#endGame();
        }
    }
    #promotionDialog(color) {
        const { promise, resolve } = Promise.withResolvers();
        const promotionDialog = document.createElement('dialog');
        promotionDialog.autofocus = false;
        promotionDialog.className = 'promote';
        promotionDialog.addEventListener('cancel', () => {
            promotionDialog.remove();
            resolve('Q');
        });
        for (const p of 'QRBN') {
            const pieceButton = document.createElement('button');
            const pieceImg = document.createElement('img');
            const uppercase = p.toUpperCase();
            const set = 'alpha';
            pieceButton.type = 'button';
            pieceImg.className = `p`;
            pieceImg.src = `./${set}/${color}${uppercase}.svg`;
            pieceButton.replaceChildren(pieceImg);
            pieceButton.addEventListener('click', () => {
                promotionDialog.close();
                promotionDialog.remove();
                resolve(p);
            });
            promotionDialog.append(pieceButton);
        }
        this.append(promotionDialog);
        promotionDialog.showModal();
        return promise;
    }
    #loadFenDialog() {
        const { promise, resolve } = Promise.withResolvers();
        const dialog = document.createElement('dialog');
        dialog.addEventListener('cancel', () => {
            dialog.remove();
            resolve(null);
        });
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = 'Enter FEN';
        label.htmlFor = 'fen-input';
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'fen-input';
        input.required = true;
        div.replaceChildren(label, input);
        const buttonDiv = document.createElement('div');
        buttonDiv.style.display = 'flex';
        buttonDiv.style.justifyContent = 'end';
        const okButton = document.createElement('button');
        okButton.type = 'submit';
        okButton.textContent = 'Go';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
            resolve(null);
        });
        buttonDiv.replaceChildren(cancel, okButton);
        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            dialog.close();
            dialog.remove();
            resolve(input.value.trim());
        });
        form.replaceChildren(div, buttonDiv);
        dialog.replaceChildren(form);
        this.append(dialog);
        dialog.showModal();
        return promise;
    }
    #messageDialog(message) {
        const dialog = document.createElement('dialog');
        const div = document.createElement('div');
        const button = document.createElement('button');
        button.type = 'button';
        dialog.className = 'message';
        dialog.addEventListener('cancel', () => dialog.remove());
        button.addEventListener('click', () => dialog.remove());
        button.textContent = 'OK';
        div.textContent = message;
        dialog.replaceChildren(div, button);
        this.append(dialog);
        dialog.showModal();
    }
    async loadGame(game) {
    }
    async #playBotDialog() {
        const dialog = document.createElement('dialog');
        dialog.addEventListener('cancel', () => {
            dialog.remove();
        });
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = 'Color';
        label.htmlFor = 'color-select';
        const colorSelect = document.createElement('select');
        colorSelect.id = 'color-select';
        colorSelect.add(new Option('White', 'w', true));
        colorSelect.add(new Option('Black', 'b', false));
        colorSelect.required = true;
        div.replaceChildren(label, colorSelect);
        const buttonDiv = document.createElement('div');
        buttonDiv.style.display = 'flex';
        buttonDiv.style.justifyContent = 'end';
        buttonDiv.style.gap = '.4rem';
        const okButton = document.createElement('button');
        okButton.type = 'submit';
        okButton.textContent = 'Go';
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.addEventListener('click', () => {
            dialog.close();
            dialog.remove();
        });
        buttonDiv.replaceChildren(cancel, okButton);
        const form = document.createElement('form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            dialog.close();
            dialog.remove();
            this.#isWhite = colorSelect.value === 'w';
            this.#setUpPieces();
            this.#playBot();
        });
        form.replaceChildren(div, buttonDiv);
        dialog.replaceChildren(form);
        this.append(dialog);
        dialog.showModal();
    }
    #isPlayingBot = false;
    #botColor = null;
    async #playBot() {
        this.#restartGame();
        this.#botColor = this.#isWhite ? 'b' : 'w';
        this.#isPlayingBot = true;
        while (!this.#isGameOver) {
            console.log('Bot in progress');
            await new Promise(resolve => setTimeout(resolve, 1000));
            const latestFenReader = this.#getFenReader(this.#fenArray[this.#fenArray.length - 1]);
            if (latestFenReader.activeColor !== this.#botColor)
                continue;
            await new Promise(resolve => setTimeout(resolve, 1000));
            const move = this.#getBestMoveInPosition(latestFenReader);
            if (!move)
                break;
            this.#tryMove(move.from, move.to);
        }
        this.#isPlayingBot = false;
        this.#botColor = null;
    }
    #getBestMoveInPosition(fr) {
        const candidateMoves = fr.getAllLegalMovesForActiveColor();
        if (candidateMoves.size === 1)
            return [...candidateMoves][0];
        let bestMove = [...candidateMoves][Math.floor(Math.random() * candidateMoves.size)];
        let highestEval = 0;
        for (const move of candidateMoves) {
            const resultingPosition = fr.requestMove(move.from, move.to);
            if (!resultingPosition)
                continue;
            const evaluation = resultingPosition.evaluation;
            if ((this.#botColor === 'w' && evaluation > highestEval) || this.#botColor === 'b' && evaluation < highestEval) {
                highestEval = evaluation;
                bestMove = move;
            }
        }
        return bestMove;
    }
    ;
}
customElements.define('chess-board', ChessBoard);
const x = document.createElement('chess-board');
document.body.replaceChildren(x);
