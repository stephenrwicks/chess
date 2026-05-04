"use strict";
class FenReader {
    // Class instances of FenReader are designed to be immutable. 
    // We parse the string and derive game state, move legality, etc.
    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    #fen;
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
    get halfMoveClock() {
        return this.#fen.split(' ')[4];
    }
    get fullMoveNumber() {
        return this.#fen.split(' ')[5];
    }
    get isCheck() {
        const coordinateObject = this.coordinateObject;
        const king = this.activeColor === 'w' ? 'K' : 'k';
        const coordinate = Object.keys(coordinateObject)
            .find(c => coordinateObject[c] === king);
        if (!coordinate)
            return false;
        return this.#getIsSquareAttacked(coordinate);
    }
    get isCheckmate() {
        if (!this.isCheck)
            return false;
        return false;
        return !this.#getHasLegalMoves(this.activeColor);
    }
    get isStalemate() {
        if (this.isCheck)
            return false;
        return false;
        return !this.#getHasLegalMoves(this.activeColor);
    }
    get is50MoveRule() {
        return Number(this.halfMoveClock) >= 50;
    }
    get isInsufficientMaterial() {
        return false;
    }
    ;
    get inactiveColor() {
        return this.activeColor === 'w' ? 'b' : 'w';
    }
    // This is the worst method, would be good to reuse
    get coordinateObject() {
        const result = {};
        for (const file of 'abcdefgh') {
            for (const rank of '12345678') {
                const coordinate = `${file}${rank}`;
                result[coordinate] = this.#getPieceByCoordinate(coordinate);
            }
        }
        return result;
    }
    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    requestMove(from, to) {
        if (from === to)
            return null; // Not a move
        const piece = this.#getPieceByCoordinate(from);
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
            isCandidateMove = this.#getKingMovesWithCastling(from).has(to);
        }
        else if (p === 'q') {
            isCandidateMove = this.#getQueenMoves(from).has(to);
        }
        else if (p === 'r') {
            isCandidateMove = this.#getRookMoves(from).has(to);
        }
        else if (p === 'b') {
            isCandidateMove = this.#getBishopMoves(from).has(to);
        }
        else if (p === 'n') {
            isCandidateMove = this.#getKnightMoves(from).has(to);
        }
        else if (p === 'p') {
            isCandidateMove =
                this.#getPawnForwardMoves(from).has(to) ||
                    this.#getPawnCaptureMoves(from).has(to);
        }
        if (!isCandidateMove)
            return null;
        if (this.#detectCheck(from, to)) {
            // Move could be possible but puts the player in check,
            // or the player is currently in check and the move doesn't get out.
            // So we return null
            return null;
        }
        // The move is legal. Return a new instance
        return this.#generateNewFenReaderFromMove(from, to);
    }
    #getAllPieceLocations(color) {
        // Return an array like [['K','e1'], etc]
        // Go through and expand rank strings again. This is way more efficent for certain methods
        // Return some 2D array
        return [];
    }
    #getPieceByCoordinate(c) {
        console.log('getPieceByCoordinate');
        if (!c)
            return null;
        const file = c[0];
        if (!file)
            return null;
        const fileIndex = 'abcdefgh'.indexOf(file);
        if (fileIndex < 0)
            return null;
        const rank = c[1];
        if (!rank)
            return null;
        // Last rank first so we subtract
        const rankString = this.piecePlacement.split('/')[8 - Number(rank)];
        if (!rankString)
            return null;
        if (rankString === '8')
            return null; // Empty rank
        const expandedRank = this.#expandRank(rankString);
        const result = expandedRank[fileIndex];
        if (result === '0' || !result)
            return null;
        return result;
    }
    /** Determines which color is at a square (or returns null) */
    #getPieceColorAtCoordinate(c) {
        const piece = this.#getPieceByCoordinate(c);
        if (!piece)
            return null;
        if (piece.toLowerCase() === piece)
            return 'b';
        return 'w';
    }
    #getWhiteCanCastleKingside() {
        if (!this.castlingRights.includes('K'))
            return false;
        if (this.activeColor === 'b')
            return false;
        if (this.#getPieceByCoordinate('e1') !== 'K')
            return false;
        if (this.#getPieceByCoordinate('h1') !== 'R')
            return false;
        if (this.isCheck)
            return false;
        if (this.#getPieceByCoordinate('f1'))
            return false;
        if (this.#getPieceByCoordinate('g1'))
            return false;
        if (this.#getIsSquareAttacked('f1', 'b'))
            return false;
        if (this.#getIsSquareAttacked('g1', 'b'))
            return false;
        return true;
    }
    #getWhiteCanCastleQueenside() {
        if (!this.castlingRights.includes('Q'))
            return false;
        if (this.activeColor === 'b')
            return false;
        if (this.#getPieceByCoordinate('e1') !== 'K')
            return false;
        if (this.#getPieceByCoordinate('a1') !== 'R')
            return false;
        if (this.isCheck)
            return false;
        if (this.#getPieceByCoordinate('d1'))
            return false;
        if (this.#getPieceByCoordinate('c1'))
            return false;
        if (this.#getPieceByCoordinate('b1'))
            return false;
        if (this.#getIsSquareAttacked('d1', 'b'))
            return false;
        if (this.#getIsSquareAttacked('c1', 'b'))
            return false;
        if (this.#getIsSquareAttacked('b1', 'b'))
            return false;
        return true;
    }
    #getBlackCanCastleKingside() {
        if (!this.castlingRights.includes('k'))
            return false;
        if (this.activeColor === 'w')
            return false;
        if (this.#getPieceByCoordinate('e8') !== 'k')
            return false;
        if (this.#getPieceByCoordinate('h8') !== 'r')
            return false;
        if (this.isCheck)
            return false;
        if (this.#getPieceByCoordinate('f8'))
            return false;
        if (this.#getPieceByCoordinate('g8'))
            return false;
        if (this.#getIsSquareAttacked('f8', 'w'))
            return false;
        if (this.#getIsSquareAttacked('g8', 'w'))
            return false;
        return true;
    }
    #getBlackCanCastleQueenside() {
        if (!this.castlingRights.includes('q'))
            return false;
        if (this.activeColor === 'w')
            return false;
        if (this.#getPieceByCoordinate('e8') !== 'k')
            return false;
        if (this.#getPieceByCoordinate('a8') !== 'r')
            return false;
        if (this.isCheck)
            return false;
        if (this.#getPieceByCoordinate('d8'))
            return false;
        if (this.#getPieceByCoordinate('c8'))
            return false;
        if (this.#getPieceByCoordinate('b8'))
            return false;
        if (this.#getIsSquareAttacked('d8', 'w'))
            return false;
        if (this.#getIsSquareAttacked('c8', 'w'))
            return false;
        if (this.#getIsSquareAttacked('b8', 'w'))
            return false;
        return true;
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
            const colorOfPieceInTheWay = this.#getPieceColorAtCoordinate(coordinate);
            if (colorOfPieceInTheWay === null) {
                // Empty, keep going
                result.push(coordinate);
                continue;
            }
            // There is a piece
            if (color !== colorOfPieceInTheWay) {
                // It's the opposite color so we can capture it and stop
                result.push(coordinate);
            }
            break;
        }
        return result;
    }
    // In the following piece-specific methods, we ignore checks completely and assume we are not in check.
    // We handle that afterward in the "requestMove" method.
    // I am allowing the color to be toggled so that we can use these to see attacked squares as well
    #getKingMovesExceptCastling(startCoordinate, color = this.activeColor) {
        const result = new Set();
        // We will not include castling here because Kings can't attack via castling
        // And this method is used to check attacked squares
        for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft']) {
            const coordinate = this.#getAdjacentCoordinate(startCoordinate, direction);
            if (!coordinate)
                continue;
            if (this.#getPieceColorAtCoordinate(coordinate) === color)
                continue;
            result.add(coordinate);
        }
        return result;
    }
    #getKingMovesWithCastling(startCoordinate, color = this.activeColor) {
        const result = this.#getKingMovesExceptCastling(startCoordinate, color);
        if (color === 'w') {
            if (this.#getWhiteCanCastleKingside())
                result.add('g1');
            if (this.#getWhiteCanCastleQueenside())
                result.add('c1');
        }
        else {
            if (this.#getBlackCanCastleKingside())
                result.add('g8');
            if (this.#getBlackCanCastleQueenside())
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
            if (this.#getPieceColorAtCoordinate(coordinate) === color)
                continue;
            result.add(coordinate);
        }
        return result;
    }
    #getPawnForwardMoves(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const hasNotMoved = (startCoordinate[1] === '2' && color === 'w') || (startCoordinate[1] === '7' && color === 'b');
        const squareInFront = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'up' : 'down');
        const pieceInFront = squareInFront && this.#getPieceByCoordinate(squareInFront);
        if (squareInFront && !pieceInFront)
            result.add(squareInFront);
        // Double jump
        if (hasNotMoved && squareInFront && !pieceInFront) {
            const twoInFront = this.#getAdjacentCoordinate(squareInFront, color === 'w' ? 'up' : 'down');
            if (twoInFront && !this.#getPieceByCoordinate(twoInFront))
                result.add(twoInFront);
        }
        return result;
    }
    /** Captures and en passant */
    #getPawnCaptureMoves(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const oppositeColor = color === 'w' ? 'b' : 'w';
        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight && this.#getPieceColorAtCoordinate(squareUpRight) === oppositeColor)
            result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft && this.#getPieceColorAtCoordinate(squareUpLeft) === oppositeColor)
            result.add(squareUpLeft);
        const enPassantSquare = this.enPassantTarget;
        if (enPassantSquare === squareUpRight || enPassantSquare === squareUpLeft) {
            result.add(enPassantSquare);
        }
        return result;
    }
    /** Squares that pawns defend diagonally but can't necessarily move to */
    #getPawnControllingMoves(startCoordinate, color = this.activeColor) {
        const result = new Set();
        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight)
            result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft)
            result.add(squareUpLeft);
        return result;
    }
    #getHasLegalMoves(color) {
        // Brute force loop through every possible move and return true if it is legal
        for (const [coord, piece] of Object.entries(this.coordinateObject)) {
            if (!piece)
                continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((color === 'b' && isWhite))
                continue;
            if (color === 'w' && !isWhite)
                continue;
            const p = piece.toLowerCase();
            if (p === 'k') {
                const candidateMoves = this.#getKingMovesWithCastling(coord, color);
                for (const candidateMove of candidateMoves) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
            else if (p === 'q') {
                const candidateMoves = this.#getQueenMoves(coord, color);
                for (const candidateMove of candidateMoves) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
            else if (p === 'r') {
                const candidateMoves = this.#getRookMoves(coord, color);
                for (const candidateMove of candidateMoves) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
            else if (p === 'b') {
                const candidateMoves = this.#getBishopMoves(coord, color);
                for (const candidateMove of candidateMoves) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
            else if (p === 'n') {
                const candidateMoves = this.#getKnightMoves(coord, color);
                for (const candidateMove of candidateMoves) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
            else if (p === 'p') {
                for (const candidateMove of this.#getPawnForwardMoves(coord, color)) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
                for (const candidateMove of this.#getPawnCaptureMoves(coord, color)) {
                    if (!this.#detectCheck(coord, candidateMove))
                        return true;
                }
            }
        }
        return false;
    }
    #getIsSquareAttacked(c, color = this.inactiveColor) {
        // Go through every piece and check if it can hit a square
        // Color is the attacking color
        for (const [attackingCoordinate, piece] of Object.entries(this.coordinateObject)) {
            if (!piece)
                continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((color === 'b' && isWhite))
                continue;
            if (color === 'w' && !isWhite)
                continue;
            const p = piece.toLowerCase();
            if (p === 'k' && this.#getKingMovesExceptCastling(attackingCoordinate, color).has(c))
                return true;
            else if (p === 'q' && this.#getQueenMoves(attackingCoordinate, color).has(c))
                return true;
            else if (p === 'r' && this.#getRookMoves(attackingCoordinate, color).has(c))
                return true;
            else if (p === 'b' && this.#getBishopMoves(attackingCoordinate, color).has(c))
                return true;
            else if (p === 'n' && this.#getKnightMoves(attackingCoordinate, color).has(c))
                return true;
            else if (p === 'p' && this.#getPawnControllingMoves(attackingCoordinate, color).has(c))
                return true;
        }
        return false;
    }
    /** Get a new FenReader without changing moves and see if check is there.
     *  Use this to see if you are getting out of or moving into check before moving */
    #detectCheck(from, to) {
        const testFenReader = this.#generateNewFenReaderFromMove(from, to, false);
        return testFenReader.isCheck;
    }
    /** Gets a new FenReader. Doesn't test move legality.
     * We can opt to not change turns to check conditions after the reader is created (checks) */
    #generateNewFenReaderFromMove(from, to, changeTurns = true) {
        let [piecePlacement, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = this.fen.split(' ');
        const movingPiece = this.#getPieceByCoordinate(from);
        if (!movingPiece)
            throw new Error('no piece?');
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const fromFileIndex = 'abcdefgh'.indexOf(fromFile);
        const toFileIndex = 'abcdefgh'.indexOf(toFile);
        // Reset if we moved a pawn or if we land on a piece.
        const shouldReset50MoveClock = movingPiece.toLowerCase() === 'p' || !!this.#getPieceByCoordinate(to);
        const isWhiteCastleKingside = movingPiece === 'K' && from === 'e1' && to === 'g1';
        const isWhiteCastleQueenside = movingPiece === 'K' && from === 'e1' && to === 'c1';
        const isBlackCastleKingside = movingPiece === 'k' && from === 'e8' && to === 'g1';
        const isBlackCastleQueenside = movingPiece === 'k' && from === 'e8' && to === 'c8';
        const isEnPassant = (this.activeColor === 'w' && movingPiece === 'P' && to === enPassantTarget) ||
            (this.activeColor === 'b' && movingPiece === 'p' && to === enPassantTarget);
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
        let newEnpassantTarget = enPassantTarget;
        if (movingPiece === 'P' && fromRank === '2') {
            newEnpassantTarget = `${fromFile}3`;
        }
        else if (movingPiece === 'p' && fromRank === '7') {
            newEnpassantTarget = `${fromFile}6`;
        }
        else {
            newEnpassantTarget = '-';
        }
        if (changeTurns) {
            activeColor = activeColor === 'w' ? 'b' : 'w';
            halfMoveClock = shouldReset50MoveClock ? '0' : String(Number(halfMoveClock) + 1);
            if (this.activeColor === 'b')
                fullMoveNumber = String(Number(fullMoveNumber) + 1);
        }
        // Modify the fen string
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
        if (isEnPassant && enPassantTarget !== '-') {
            const enPassantFile = enPassantTarget[0];
            const enPassantFileIndex = 'abcdefgh'.indexOf(enPassantFile);
            // The pawn will always be 4 or 5
            const enPassantPawnRank = this.activeColor == 'w' ? '5' : '4';
            const enPassantRankArray = this.#expandRank(ranks[8 - Number(enPassantPawnRank)]);
            enPassantRankArray[enPassantFileIndex] = '0';
            ranks.splice(8 - Number(enPassantPawnRank), 1, this.#compressRank(enPassantRankArray));
        }
        const newPiecePlacement = ranks.join('/');
        const fen = `${newPiecePlacement} ${activeColor} ${castlingRights} ${newEnpassantTarget} ${halfMoveClock} ${fullMoveNumber}`;
        return new FenReader(fen);
    }
    /** Takes a fen rank string and normalizes it to 8 character array (adds zeros in place of numbers) */
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
}
class ChessBoard extends HTMLElement {
    #isInitialized = false;
    #squaresObj = {};
    #squaresMap = new Map();
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
    #threeFoldRepetitionCounter = {};
    #fenArray = []; // Game history
    #currentlyViewingIndex = -1;
    constructor() {
        super();
    }
    connectedCallback() {
        if (this.#isInitialized)
            return;
        this.draggable = false;
        let dark = false;
        for (const rank of '87654321') {
            for (const file of 'abcdefgh') {
                const square = document.createElement('div');
                square.draggable = false;
                if (dark)
                    square.classList.add('d');
                this.#squaresObj[`${file}${rank}`] = square;
                this.#squaresMap.set(square, `${file}${rank}`);
                this.append(square);
                dark = !dark;
            }
            dark = !dark;
        }
        this.addEventListener('request-move', (e) => this.#listen(e));
        this.#isInitialized = true;
    }
    #listen(e) {
        //if (this.#viewedFenIndex !== this.#fenArray.length - 1) return;
        const { fromSquare, toSquare } = e.detail;
        if (!fromSquare || !toSquare)
            return;
        if (fromSquare === toSquare)
            return;
        const from = this.#squaresMap.get(fromSquare);
        const to = this.#squaresMap.get(toSquare);
        if (!from || !to)
            return;
        const fenReader = new FenReader(this.fen);
        const result = fenReader.requestMove(from, to);
        if (result === null)
            return; // Illegal move
        this.#updateDom(result);
        this.#commitNewMove(result);
        this.#currentlyViewingIndex = this.#fenArray.length - 1;
    }
    ;
    get fen() {
        return this.#fenArray.at(-1) || '';
    }
    get fenReader() {
        return new FenReader(this.fen);
    }
    /** Removes current game */
    loadFen(fen) {
        this.#fenArray.length = 0;
        this.#currentlyViewingIndex = -1;
        this.#threeFoldRepetitionCounter = {};
        const fenReader = new FenReader(fen);
        this.#updateDom(fenReader);
        this.#commitNewMove(fenReader);
    }
    newGame() {
        this.loadFen(FenReader.startingFen);
    }
    goToPly(newFenIndex) {
        if (newFenIndex > this.#fenArray.length - 1)
            return;
        if (newFenIndex < -1)
            return;
        const newFen = this.#fenArray.at(newFenIndex);
        if (!newFen)
            return;
        this.#updateDom(new FenReader(newFen));
        this.#currentlyViewingIndex = newFenIndex;
    }
    forward() {
        //if (this.#currentlyViewingIndex >= this.#fenArray.length - 1) return;
        this.goToPly(this.#currentlyViewingIndex + 1);
    }
    back() {
        if (this.#currentlyViewingIndex <= 0)
            return;
        this.goToPly(this.#currentlyViewingIndex - 1);
    }
    goToLatest() {
        this.goToPly(this.#fenArray.length - 1);
    }
    /** Piece factory function. We don't care about keeping pieces in state */
    #buildPiece(pieceNotation) {
        const pieceDiv = document.createElement('div');
        pieceDiv.draggable = false;
        pieceDiv.textContent = this.#pieceSymbols[pieceNotation];
        const color = pieceNotation.toUpperCase() === pieceNotation ? 'w' : 'b';
        pieceDiv.className = `p ${color}`;
        let offsetX = 0;
        let offsetY = 0;
        const handleDown = (e) => {
            if (!this.#squaresMap.has(pieceDiv.parentElement))
                return;
            if (color !== this.fenReader.activeColor)
                return;
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
        const handleMove = (e) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            pieceDiv.style.left = `${left}px`;
            pieceDiv.style.top = `${top}px`;
        };
        const handleUp = (e) => {
            pieceDiv.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY)
                .find(el => el instanceof HTMLDivElement && this.#squaresMap.has(el));
            if (!hoveredSquare)
                return;
            pieceDiv.dispatchEvent(new CustomEvent('request-move', {
                detail: {
                    fromSquare: pieceDiv.parentElement,
                    toSquare: hoveredSquare,
                },
                bubbles: true,
            }));
        };
        pieceDiv.addEventListener('dragstart', (e) => e.preventDefault());
        pieceDiv.addEventListener('mousedown', (e) => e.preventDefault());
        pieceDiv.addEventListener('pointerdown', handleDown);
        return pieceDiv;
    }
    #updateDom(updatedFenReader) {
        // with coordinateObject it is actually faster to read that once,
        // and then replace every piece, rather than checking
        const updated = updatedFenReader.coordinateObject;
        for (const rank of '12345678') {
            for (const file of 'abcdefgh') {
                const c = `${file}${rank}`;
                const updatedPiece = updated[c];
                this.#squaresObj[c].replaceChildren(updatedPiece ? this.#buildPiece(updatedPiece) : '');
            }
        }
    }
    #commitNewMove(updatedFenReader) {
        const fen = updatedFenReader.fen;
        this.#fenArray.push(fen);
        if (updatedFenReader.isCheckmate) {
            alert('Game over: Checkmate');
            return this.#gameOver('cm');
        }
        if (updatedFenReader.isInsufficientMaterial) {
            alert('Draw: Insufficient material');
            return this.#gameOver('im');
        }
        if (updatedFenReader.isStalemate) {
            alert('Draw: Stalemate');
            return this.#gameOver('sm');
        }
        const piecePlacement = updatedFenReader.piecePlacement;
        if (!this.#threeFoldRepetitionCounter[piecePlacement])
            this.#threeFoldRepetitionCounter[piecePlacement] = 0;
        this.#threeFoldRepetitionCounter[piecePlacement] += 1;
        if (this.#threeFoldRepetitionCounter[piecePlacement] >= 3) {
            // Draw
            alert('Draw: Threefold repetition');
            return this.#gameOver('3fr');
        }
        if (updatedFenReader.is50MoveRule) {
            alert('Draw: Fifty move rule');
            return this.#gameOver('50mr');
        }
    }
    #gameOver(result) {
    }
}
customElements.define('chess-board', ChessBoard);
const x = new ChessBoard();
document.body.replaceChildren(x);
(() => {
    const div = document.createElement('div');
    div.style.display = 'grid';
    div.style.gridTemplateColumns = '1fr 1fr';
    div.style.gap = '2em';
    const button = document.createElement('button');
    button.textContent = 'New Game';
    button.onclick = () => x.newGame();
    const input = document.createElement('input');
    input.placeholder = 'Load FEN';
    input.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            x.loadFen(input.value);
        }
    });
    const back = document.createElement('button');
    const forward = document.createElement('button');
    back.textContent = '<';
    forward.textContent = '>';
    back.onclick = () => x.back();
    forward.onclick = () => x.forward();
    div.replaceChildren(button, input, back, forward);
    document.body.append(div);
})();
