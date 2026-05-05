type Direction = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';
type PieceNotation = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'k' | 'q' | 'r' | 'b' | 'n' | 'p';

class FenReader {

    // Class instances of FenReader are designed to be immutable. 
    // We parse the string and derive game state, move legality, etc.
    // Any time something happens we create a new instance of this
    // The board and its pieces are designed to be dumb, 
    // and to just instantiate this object to figure out what's happening
    static startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    #fen: string;
    #coordinateObject: Record<string, PieceNotation | null> = {};
    #piecePlacement = '';
    #activeColor = '';
    #castlingRights = '';
    #enPassantTarget = '';
    #halfMoveClock = '';
    #fullMoveNumber = '';
    #isPromotion: boolean;

    constructor(fen: string = FenReader.startingFen, isPromotion = false) {
        this.#fen = fen;
        const split = fen.split(' ');
        if (split.length !== 6) throw new Error('Illegal FEN!');
        this.#piecePlacement = split[0];
        this.#activeColor = split[1];
        this.#castlingRights = split[2];
        this.#enPassantTarget = split[3];
        this.#halfMoveClock = split[4];
        this.#fullMoveNumber = split[5];
        for (const rank of '12345678') {
            const rankString = this.#piecePlacement.split('/')[8 - Number(rank)];
            const expandedRank = this.#expandRank(rankString);
            for (const file of 'abcdefgh') {
                const coordinate = `${file}${rank}`;
                const fileIndex = 'abcdefgh'.indexOf(file);
                if (fileIndex < 0) continue;
                const piece = expandedRank[fileIndex] === '0' ? null : expandedRank[fileIndex];
                this.#coordinateObject[coordinate] = piece as PieceNotation | null;
            }
        }
        Object.freeze(this.#coordinateObject);
        this.#isPromotion = isPromotion;
    }

    get fen() {
        return this.#fen;
    }

    get piecePlacement() {
        return this.#piecePlacement;
    }

    get activeColor() {
        if (!this.#activeColor) throw new Error('no active color found?');
        return this.#activeColor as 'w' | 'b';
    }

    get inactiveColor() {
        return this.activeColor === 'w' ? 'b' : 'w';
    }

    get isPromotion() {
        return this.#isPromotion;
    }

    get gameState() {
        const activeColor = this.activeColor;
        const inactiveColor = this.inactiveColor;
        const isCheck = this.#getIsCheck();
        const hasLegalMoves = this.#getActiveColorHasLegalMoves();
        return {
            activeColor,
            inactiveColor,
            isCheck,
            isCheckmate: isCheck && !hasLegalMoves,
            isStalemate: !isCheck && !hasLegalMoves,
            is50MoveRule: Number(this.#halfMoveClock) >= 50,
            isInsufficientMaterial: this.#getIsInsufficientMaterial(),
        };
    }



    getMoveset(from: string): Set<string> {
        const piece = this.getPieceAt(from);
        let moveset: Set<string> = new Set();
        if (!piece) return moveset;
        const p = piece.toLowerCase();
        if (p === 'k') moveset = this.#getKingMovesWithCastling(from);
        if (p === 'q') moveset = this.#getQueenMoves(from);
        if (p === 'r') moveset = this.#getRookMoves(from);
        if (p === 'b') moveset = this.#getBishopMoves(from);
        if (p === 'n') moveset = this.#getKnightMoves(from);
        if (p === 'p') moveset = this.#getPawnMoves(from);
        for (const to of moveset) {
            if (this.#detectCheck(from, to)) moveset.delete(to);
        }
        return moveset;
    }

    /**  On every move we just create a new instance. Immutable structure. Return null if move is illegal */
    requestMove(from: string, to: string): FenReader | null {
        if (!from || !to) return null;
        if (from === to) return null;
        const piece = this.getPieceAt(from);
        if (!piece) return null;
        const isWhitePiece = piece === piece.toUpperCase();
        if (isWhitePiece && this.#activeColor === 'b') return null;
        if (!isWhitePiece && this.#activeColor === 'w') return null;
        const moveset = this.getMoveset(from);
        if (!moveset.has(to)) return null;
        return this.#generateNewFenReaderFromMove(from, to);
    }

    /** Intermediate step that takes the current FenReader with a pawn on 1st/8th rank and returns a new FenReader */
    requestPromotion(to: 'Q' | 'R' | 'B' | 'N' = 'Q'): FenReader {
        const promotedPawnColor = this.inactiveColor;
        const rankIndex = promotedPawnColor === 'w' ? 0 : 7
        if (promotedPawnColor === 'b') to = to.toLowerCase() as typeof to;
        const ranks = this.piecePlacement.split('/');
        const rank = ranks[rankIndex];
        const pawnIndex = rank.toLowerCase().indexOf('p');
        if (pawnIndex < 0) throw new Error('promotion error');
        const expandedRank = this.#expandRank(rank);
        expandedRank[pawnIndex] = to;
        const compressed = this.#compressRank(expandedRank);
        ranks.splice(rankIndex, 1, compressed);
        const piecePlacement = ranks.join('/');
        const split = this.fen.split(' ');
        split[0] = piecePlacement;
        return new FenReader(split.join(' '));
    }

    getPieceAt(coordinate: string): PieceNotation | null {
        return this.#coordinateObject[coordinate];
    }

    #getIsCheck() {
        const coordinateObject = this.#coordinateObject;
        const king = this.activeColor === 'w' ? 'K' : 'k';
        const coordinate = Object.keys(coordinateObject)
            .find(c => coordinateObject[c] === king);
        if (!coordinate) return false;
        return this.#getIsSquareAttacked(coordinate);
    }

    #getIsInsufficientMaterial() {
        let whiteBishops = 0;
        let blackBishops = 0;
        let whiteKnights = 0;
        let blackKnights = 0;
        for (const piece of Object.values(this.#coordinateObject)) {
            if (!piece) continue;
            // Any pawn, queen, or rook is enough to force mate.
            if (piece.toLowerCase() === 'p') return false;
            if (piece.toLowerCase() === 'q') return false;
            if (piece.toLowerCase() === 'r') return false;
            if (piece === 'B') whiteBishops += 1;
            if (piece === 'b') blackBishops += 1;
            if (piece === 'N') whiteKnights += 1;
            if (piece === 'n') blackKnights += 1;
        }
        // Two bishops can force mate.
        // This is probably wrong without checking the colors the bishops are on.
        // If you underpromote to a second bishop it might be on the same color as the other one,
        // in which case mate is not possible?
        if (whiteBishops >= 2) return false;
        if (blackBishops >= 2) return false;
        // A bishop and a knight can force mate.
        if (whiteBishops >= 1 && whiteKnights >= 1) return false;
        if (blackBishops >= 1 && blackKnights >= 1) return false;
        // Technically two knights can mate, but they cannot force it.
        // Implementations of this rule seem mixed.
        // Here I make 3 knights the minimum to be sufficient. 
        // 3 knights should be able to force mate (though I've never seen it)
        if (whiteKnights >= 3) return false;
        if (blackKnights >= 3) return false;
        // If we got here, it's a draw
        return true;
    };


    /** Determines which color is at a square (or returns null) */
    #getPieceColorAt(coordinate: string): 'w' | 'b' | null {
        const piece = this.getPieceAt(coordinate);
        if (!piece) return null;
        if (piece.toLowerCase() === piece) return 'b';
        return 'w';
    }
    #getWhiteCanCastleKingside() {
        if (!this.#castlingRights.includes('K')) return false;
        if (this.activeColor === 'b') return false;
        if (this.getPieceAt('e1') !== 'K') return false;
        if (this.getPieceAt('h1') !== 'R') return false;
        if (this.#getIsCheck()) return false;
        if (this.getPieceAt('f1')) return false;
        if (this.getPieceAt('g1')) return false;
        if (this.#getIsSquareAttacked('f1', 'b')) return false;
        if (this.#getIsSquareAttacked('g1', 'b')) return false;
        return true;
    }
    #getWhiteCanCastleQueenside() {
        if (!this.#castlingRights.includes('Q')) return false;
        if (this.activeColor === 'b') return false;
        if (this.getPieceAt('e1') !== 'K') return false;
        if (this.getPieceAt('a1') !== 'R') return false;
        if (this.#getIsCheck()) return false;
        if (this.getPieceAt('d1')) return false;
        if (this.getPieceAt('c1')) return false;
        if (this.getPieceAt('b1')) return false;
        if (this.#getIsSquareAttacked('d1', 'b')) return false;
        if (this.#getIsSquareAttacked('c1', 'b')) return false;
        if (this.#getIsSquareAttacked('b1', 'b')) return false;
        return true;
    }
    #getBlackCanCastleKingside() {
        if (!this.#castlingRights.includes('k')) return false;
        if (this.activeColor === 'w') return false;
        if (this.getPieceAt('e8') !== 'k') return false;
        if (this.getPieceAt('h8') !== 'r') return false;
        if (this.#getIsCheck()) return false;
        if (this.getPieceAt('f8')) return false;
        if (this.getPieceAt('g8')) return false;
        if (this.#getIsSquareAttacked('f8', 'w')) return false;
        if (this.#getIsSquareAttacked('g8', 'w')) return false;
        return true;
    }
    #getBlackCanCastleQueenside() {
        if (!this.#castlingRights.includes('q')) return false;
        if (this.activeColor === 'w') return false;
        if (this.getPieceAt('e8') !== 'k') return false;
        if (this.getPieceAt('a8') !== 'r') return false;
        if (this.#getIsCheck()) return false;
        if (this.getPieceAt('d8')) return false;
        if (this.getPieceAt('c8')) return false;
        if (this.getPieceAt('b8')) return false;
        if (this.#getIsSquareAttacked('d8', 'w')) return false;
        if (this.#getIsSquareAttacked('c8', 'w')) return false;
        if (this.#getIsSquareAttacked('b8', 'w')) return false;
        return true;
    }

    #getAdjacentCoordinate(startCoordinate: string, direction: Direction): string | null {
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
        return `${file}${rank}`;
    }

    /** Get straight line regardless of legality. Does not include start */
    #getRayCoordinates(startCoordinate: string, direction: Direction): string[] {
        const result: string[] = [];
        let current = startCoordinate;
        while (true) {
            const coordinate = this.#getAdjacentCoordinate(current, direction);
            if (!coordinate) break;
            current = coordinate;
            result.push(coordinate);
        }
        return result;
    }

    #getRayMoves(startCoordinate: string, direction: Direction, color = this.activeColor): string[] {
        // Assume there is a queen on the start coordinate. How far can it go?
        // Color is necessary to determine capture possibility
        const ray = this.#getRayCoordinates(startCoordinate, direction);
        const result: string[] = [];
        for (const coordinate of ray) {
            // We don't have to check if we went off the board because getAdjacent does that.
            const colorOfPieceInTheWay = this.#getPieceColorAt(coordinate);
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

    #getKingMovesExceptCastling(startCoordinate: string, color = this.activeColor): Set<string> {
        const result: Set<string> = new Set();
        // We will not include castling here because Kings can't attack via castling
        // And this method is used to check attacked squares
        for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft'] as Direction[]) {
            const coordinate = this.#getAdjacentCoordinate(startCoordinate, direction);
            if (!coordinate) continue;
            if (this.#getPieceColorAt(coordinate) === color) continue;
            result.add(coordinate);
        }
        return result;
    }

    #getKingMovesWithCastling(startCoordinate: string, color = this.activeColor) {
        const result = this.#getKingMovesExceptCastling(startCoordinate, color);
        if (color === 'w') {
            if (this.#getWhiteCanCastleKingside()) result.add('g1');
            if (this.#getWhiteCanCastleQueenside()) result.add('c1');
        }
        else {
            if (this.#getBlackCanCastleKingside()) result.add('g8');
            if (this.#getBlackCanCastleQueenside()) result.add('c8');
        }
        return result;
    }

    #getQueenMoves(startCoordinate: string, color = this.activeColor): Set<string> {
        const rookMoves = this.#getRookMoves(startCoordinate, color);
        const bishopMoves = this.#getBishopMoves(startCoordinate, color);
        return new Set([...rookMoves, ...bishopMoves]);
    }

    #getRookMoves(startCoordinate: string, color = this.activeColor): Set<string> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'up', color),
            ...this.#getRayMoves(startCoordinate, 'down', color),
            ...this.#getRayMoves(startCoordinate, 'left', color),
            ...this.#getRayMoves(startCoordinate, 'right', color),
        ]);
    }

    #getBishopMoves(startCoordinate: string, color = this.activeColor): Set<string> {
        return new Set([
            ...this.#getRayMoves(startCoordinate, 'upright', color),
            ...this.#getRayMoves(startCoordinate, 'downright', color),
            ...this.#getRayMoves(startCoordinate, 'downleft', color),
            ...this.#getRayMoves(startCoordinate, 'upleft', color),
        ]);
    }

    #getKnightMoves(startCoordinate: string, color = this.activeColor): Set<string> {
        const result: Set<string> = new Set();
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
            if (!coordinate) continue;
            if (this.#getPieceColorAt(coordinate) === color) continue;
            result.add(coordinate);
        }

        return result;
    }

    #getPawnMoves(startCoordinate: string, color = this.activeColor): Set<string> {
        const result: Set<string> = new Set();
        const hasNotMoved = (startCoordinate[1] === '2' && color === 'w') || (startCoordinate[1] === '7' && color === 'b');
        const squareInFront = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'up' : 'down');
        const pieceInFront = squareInFront && this.getPieceAt(squareInFront);
        if (squareInFront && !pieceInFront) result.add(squareInFront);

        // Double jump
        if (hasNotMoved && squareInFront && !pieceInFront) {
            const twoInFront = this.#getAdjacentCoordinate(squareInFront, color === 'w' ? 'up' : 'down');
            if (twoInFront && !this.getPieceAt(twoInFront)) result.add(twoInFront);
        }

        const oppositeColor = color === 'w' ? 'b' : 'w';

        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight && this.#getPieceColorAt(squareUpRight) === oppositeColor) result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft && this.#getPieceColorAt(squareUpLeft) === oppositeColor) result.add(squareUpLeft);

        if (this.#enPassantTarget === squareUpRight || this.#enPassantTarget === squareUpLeft) {
            result.add(this.#enPassantTarget);
        }

        return result;
    }

    /** Squares that pawns defend diagonally but can't necessarily move to */
    #getPawnControllingSquares(startCoordinate: string, color = this.activeColor): Set<string> {
        const result: Set<string> = new Set();
        const squareUpRight = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upright' : 'downleft');
        if (squareUpRight) result.add(squareUpRight);
        const squareUpLeft = this.#getAdjacentCoordinate(startCoordinate, color === 'w' ? 'upleft' : 'downright');
        if (squareUpLeft) result.add(squareUpLeft);

        return result;
    }

    #getActiveColorHasLegalMoves() {
        // Check moveset length for every piece of active color
        for (const [coordinate, piece] of Object.entries(this.#coordinateObject)) {
            if (!piece) continue;
            const isWhitePiece = piece.toUpperCase() === piece;
            if ((this.activeColor === 'b' && isWhitePiece)) continue;
            if (this.activeColor === 'w' && !isWhitePiece) continue;
            const moveset = this.getMoveset(coordinate);
            if (moveset.size > 0) return true; // A move exists, early return true
        }
        return false;
    }

    #getIsSquareAttacked(c: string, color: 'w' | 'b' = this.inactiveColor) {
        // Go through every piece and check if it can hit a square
        // Color is the attacking color
        for (const [attackingCoordinate, piece] of Object.entries(this.#coordinateObject)) {
            if (!piece) continue;
            const isWhite = piece.toUpperCase() === piece;
            if ((color === 'b' && isWhite)) continue;
            if (color === 'w' && !isWhite) continue;
            const p = piece.toLowerCase();
            if (p === 'k' && this.#getKingMovesExceptCastling(attackingCoordinate, color).has(c)) return true;
            else if (p === 'q' && this.#getQueenMoves(attackingCoordinate, color).has(c)) return true;
            else if (p === 'r' && this.#getRookMoves(attackingCoordinate, color).has(c)) return true;
            else if (p === 'b' && this.#getBishopMoves(attackingCoordinate, color).has(c)) return true;
            else if (p === 'n' && this.#getKnightMoves(attackingCoordinate, color).has(c)) return true;
            else if (p === 'p' && this.#getPawnControllingSquares(attackingCoordinate, color).has(c)) return true;
        }
        return false;
    }

    /** Get a new FenReader without changing moves and see if check is there.
     *  Used to see if we are getting out of or moving into check before moving */
    #detectCheck(from: string, to: string): boolean {
        const testFenReader = this.#generateNewFenReaderFromMove(from, to, false);
        return testFenReader.#getIsCheck();
    }

    /** Gets a new FenReader. Doesn't test move legality. 
     * We can opt to not change turns to check conditions after the reader is created (checks) */
    #generateNewFenReaderFromMove(from: string, to: string, changeTurns = true): FenReader {
        let [piecePlacement, activeColor, castlingRights, enPassantTarget, halfMoveClock, fullMoveNumber] = this.fen.split(' ');

        let movingPiece = this.getPieceAt(from);

        if (!movingPiece) throw new Error('no piece?');
        const fromFile = from[0];
        const fromRank = from[1];
        const toFile = to[0];
        const toRank = to[1];
        const fromFileIndex = 'abcdefgh'.indexOf(fromFile);
        const toFileIndex = 'abcdefgh'.indexOf(toFile);

        // Reset if we moved a pawn or if we land on a piece.
        const shouldReset50MoveClock = movingPiece.toLowerCase() === 'p' || !!this.getPieceAt(to);

        const isWhiteCastleKingside = movingPiece === 'K' && from === 'e1' && to === 'g1';
        const isWhiteCastleQueenside = movingPiece === 'K' && from === 'e1' && to === 'c1';
        const isBlackCastleKingside = movingPiece === 'k' && from === 'e8' && to === 'g1';
        const isBlackCastleQueenside = movingPiece === 'k' && from === 'e8' && to === 'c8';
        const isEnPassant =
            (this.activeColor === 'w' && movingPiece === 'P' && to === enPassantTarget) ||
            (this.activeColor === 'b' && movingPiece === 'p' && to === enPassantTarget);

        const isPromotion =
            (this.activeColor === 'w' && movingPiece === 'P' && toRank === '8') ||
            (this.activeColor === 'b' && movingPiece === 'p' && toRank === '1');

        if (isWhiteCastleKingside || from === 'e1' || from === 'h1' || to === 'h1') castlingRights = castlingRights.replace('K', '');
        if (isBlackCastleKingside || from === 'e8' || from === 'h8' || to === 'h8') castlingRights = castlingRights.replace('k', '');
        if (isWhiteCastleQueenside || from === 'e1' || from === 'a8' || to === 'a8') castlingRights = castlingRights.replace('Q', '');
        if (isBlackCastleQueenside || from === 'e8' || from === 'a8' || to === 'a8') castlingRights = castlingRights.replace('q', '');
        if (castlingRights === '') castlingRights = '-';

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
            if (this.activeColor === 'b') fullMoveNumber = String(Number(fullMoveNumber) + 1);
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
            // The pawn we capture will always be on rank 4 or 5
            const enPassantPawnRank = this.activeColor == 'w' ? '5' : '4';
            const enPassantRankArray = this.#expandRank(ranks[8 - Number(enPassantPawnRank)]);
            enPassantRankArray[enPassantFileIndex] = '0';
            ranks.splice(8 - Number(enPassantPawnRank), 1, this.#compressRank(enPassantRankArray));
        }

        const newPiecePlacement = ranks.join('/');
        const fen = `${newPiecePlacement} ${activeColor} ${castlingRights} ${newEnpassantTarget} ${halfMoveClock} ${fullMoveNumber}`;

        const result = new FenReader(fen, isPromotion);
        return result;
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

class ChessBoard extends HTMLElement {

    #isInitialized = false;
    #squaresObj: Record<string, HTMLDivElement> = {};
    #squaresMap: Map<HTMLDivElement, string> = new Map();
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
    #currentlyViewingIndex = -1;
    #isGameOver = false;

    constructor() {
        super();
    }

    connectedCallback() {
        if (this.#isInitialized) return;
        let dark = false;
        for (const rank of '87654321') {
            for (const file of 'abcdefgh') {
                const square = document.createElement('div');
                if (dark) square.classList.add('d');
                this.#squaresObj[`${file}${rank}`] = square;
                this.#squaresMap.set(square, `${file}${rank}`);
                this.append(square);
                dark = !dark;
            }
            dark = !dark;
        }

        this.#isInitialized = true;
    }

    get fen() {
        return this.#fenArray.at(this.#currentlyViewingIndex) || '';
    }

    /** Removes current game */
    loadFen(fen: string) {
        this.#isGameOver = false;
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

    goToPly(newFenIndex: number) {
        if (newFenIndex > this.#fenArray.length - 1) return;
        if (newFenIndex < -1) return;
        const newFen = this.#fenArray.at(newFenIndex);
        if (!newFen) return;
        const newFenReader = new FenReader(newFen);
        this.#updateDom(newFenReader);
        this.#currentlyViewingIndex = newFenIndex;
        this.#updateDataset(newFenReader);
    }

    forward() {
        //if (this.#currentlyViewingIndex >= this.#fenArray.length - 1) return;
        this.goToPly(this.#currentlyViewingIndex + 1);
    }

    back() {
        if (this.#currentlyViewingIndex <= 0) return;
        this.goToPly(this.#currentlyViewingIndex - 1);
    }

    goToStart() {
        this.goToPly(0);
    }

    goToLatest() {
        this.goToPly(-1);
    }

    async #tryMove(from: string, to: string) {
        let updatedFenReader = new FenReader(this.fen).requestMove(from, to);
        if (updatedFenReader === null) return;

        if (updatedFenReader.isPromotion) {
            const choice = await this.#promotionDialog();
            updatedFenReader = updatedFenReader.requestPromotion(choice);
        }

        this.#updateDom(updatedFenReader);
        this.#commitNewMove(updatedFenReader);

        this.#currentlyViewingIndex = this.#fenArray.length - 1;
    }

    /** Piece factory function. We don't care about keeping pieces in state.
     * Currently any time a move happens I just destroy piece and recreate it. */
    #buildPiece(pieceNotation: PieceNotation) {
        const pieceDiv = document.createElement('div');
        pieceDiv.textContent = this.#pieceSymbols[pieceNotation];

        const color = pieceNotation.toUpperCase() === pieceNotation ? 'w' : 'b';
        pieceDiv.className = `p ${color}`;

        let offsetX = 0;
        let offsetY = 0;

        let moveset: Set<string> | null = null;

        const handleDown = (e: PointerEvent) => {
            if (this.#isGameOver) return;
            const from = this.#squaresMap.get(pieceDiv.parentElement as HTMLDivElement);
            if (!from) return;
            const fenReader = new FenReader(this.fen);
            if (color !== fenReader.activeColor) return;
            pieceDiv.style.position = 'absolute';
            offsetX = pieceDiv.getBoundingClientRect().width / 2;
            offsetY = pieceDiv.getBoundingClientRect().height / 2;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            pieceDiv.style.left = `${left}px`;
            pieceDiv.style.top = `${top}px`;
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp, { once: true });
            this.#squaresObj[from].classList.add('active');
            moveset = fenReader.getMoveset(from);
            for (const coordinate of moveset) {
                const square = this.#squaresObj[coordinate];
                square.classList.add('legal');
            }
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

            const from = this.#squaresMap.get(pieceDiv.parentElement as HTMLDivElement);
            const to = this.#squaresMap.get(hoveredSquare as HTMLDivElement);
            if (!from || !to) return;

            this.#squaresObj[from].classList.remove('active');
            for (const c of moveset || []) {
                const square = this.#squaresObj[c];
                square.classList.remove('legal');
            }
            this.#tryMove(from, to);
        };
        pieceDiv.addEventListener('dragstart', (e) => e.preventDefault());
        pieceDiv.addEventListener('mousedown', (e) => e.preventDefault());
        pieceDiv.addEventListener('pointerdown', handleDown);
        return pieceDiv;
    }

    #updateDom(updatedFenReader: FenReader) {
        const isEmptyBoard = this.fen === '';
        const currentFenReader = new FenReader(isEmptyBoard ? FenReader.startingFen : this.fen);
        const { activeColor, isCheck, isCheckmate } = updatedFenReader.gameState;
        for (const rank of '12345678') {
            for (const file of 'abcdefgh') {
                const coordinate = `${file}${rank}`;
                const square = this.#squaresObj[coordinate];
                square.classList.remove('check');
                const currentPiece = currentFenReader.getPieceAt(coordinate);
                const updatedPiece = updatedFenReader.getPieceAt(coordinate);
                if (isCheck && ((activeColor === 'w' && updatedPiece === 'K') || (activeColor === 'b' && updatedPiece === 'k'))) {
                    square.classList.add('check');
                }
                if (currentPiece === updatedPiece && !isEmptyBoard) continue;
                square.replaceChildren(updatedPiece ? this.#buildPiece(updatedPiece) : '')
            }
        }

    }

    #updateDataset(updatedFenReader: FenReader) {
        const isCurrent = this.#fenArray.length - 1 === this.#fenArray.indexOf(updatedFenReader.fen);
        this.dataset.activeColor = isCurrent ? updatedFenReader.activeColor : '';
        if (this.#isGameOver) this.dataset.activeColor = '';
    }

    #promotionDialog(): Promise<'Q' | 'R' | 'N' | 'B'> {
        return new Promise(resolve => {
            const result = prompt('?');
            if (result === 'Q' || result === 'R' || result === 'N' || result === 'B') resolve(result);
            resolve('Q');
        });
    }

    async #commitNewMove(updatedFenReader: FenReader) {
        const fen = updatedFenReader.fen;
        const gameState = updatedFenReader.gameState;

        this.#fenArray.push(fen);

        if (gameState.isCheckmate) {
            alert('Game over: Checkmate');
            return this.#gameOver('cm');
        }

        if (gameState.isInsufficientMaterial) {
            alert('Draw: Insufficient material');
            return this.#gameOver('im');
        }

        if (gameState.isStalemate) {
            alert('Draw: Stalemate');
            return this.#gameOver('sm');
        }

        const piecePlacement = updatedFenReader.piecePlacement;
        if (!this.#threeFoldRepetitionCounter[piecePlacement]) this.#threeFoldRepetitionCounter[piecePlacement] = 0;
        this.#threeFoldRepetitionCounter[piecePlacement] += 1;
        if (this.#threeFoldRepetitionCounter[piecePlacement] >= 3) {
            // Draw
            alert('Draw: Threefold repetition');
            return this.#gameOver('3fr');
        }

        if (gameState.is50MoveRule) {
            alert('Draw: Fifty move rule');
            return this.#gameOver('50mr');
        }

        this.#updateDataset(updatedFenReader);
    }

    #gameOver(result: string) {
        this.#isGameOver = true;
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
    })
    const back = document.createElement('button');
    const forward = document.createElement('button');
    back.textContent = '<';
    forward.textContent = '>';
    back.onclick = () => x.back();
    forward.onclick = () => x.forward();
    div.replaceChildren(button, input, back, forward);
    document.body.append(div);
})();
