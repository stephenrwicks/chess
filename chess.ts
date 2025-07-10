type TFile = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type TRank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
type Coordinate = `${TFile}${TRank}`;
type TDirection = 'up' | 'upright' | 'right' | 'downright' | 'down' | 'downleft' | 'left' | 'upleft';


abstract class Piece extends HTMLElement {

    color: 'white' | 'black';
    currentCoordinate: Coordinate;
    #hasMoved = false;
    #board: Board | null = null;

    constructor(color: 'white' | 'black', coordinate: Coordinate, board: Board) {
        super();
        if (!color || !coordinate || !board) throw new Error('Illegal constructor.');
        this.#board = board;
        this.color = color;
        this.currentCoordinate = coordinate;
        this.className = `piece ${color}`;
        this.moveTo(this.board!.SQUARES.get(this.currentCoordinate)!); // Can we avoid the ! here
        let offsetX = 0;
        let offsetY = 0;
        let hoveredSquare: Square | null = null;
        const handleDown = (e: PointerEvent) => {
            if (this.board!.currentMove !== this.color) return;
            this.style.position = 'absolute';
            offsetX = this.getBoundingClientRect().width / 2;
            offsetY = this.getBoundingClientRect().height / 2;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            this.style.left = `${left}px`;
            this.style.top = `${top}px`;
            this.style.cursor = 'grabbing';
            this.#highlightLegalMoves();
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp, { once: true });
            if (this.square) this.square.classList.add('active');
        };
        const handleMove = (e: PointerEvent) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            this.style.left = `${left}px`;
            this.style.top = `${top}px`;
            hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY).find(el => el instanceof Square) as Square ?? null;
        };
        const handleUp = () => {
            this.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            for (const square of this.board!.SQUARES?.values()) {
                square.classList.remove('legal', 'active');
            }
            if (hoveredSquare) {
                if (!this.legalMoves?.has(hoveredSquare.coordinate)) return;
                this.moveTo(hoveredSquare);
                this.#hasMoved = true;
                this.board!.changeMove();
            }
            hoveredSquare = null;
        };

        this.addEventListener('pointerdown', handleDown);

    }

    abstract get legalMoves(): Set<Coordinate>;
    abstract get squaresAttacking(): Set<Coordinate>;

    get board() {
        return this.#board;
    }

    get square() {
        if (this.parentElement instanceof Square) return this.parentElement;
        return null;
    }

    #highlightLegalMoves() {
        if (!this.board) return;
        for (const coordinate of this.legalMoves) {
            const square = this.board.SQUARES.get(coordinate);
            if (!square) return;
            square.classList.add('legal');
        }
    }

    moveTo(square: Square) {
        if (!square) return;
        square.replaceChildren(this);
        this.currentCoordinate = square.coordinate;
    }

    get hasMoved() {
        return this.#hasMoved;
    }

    /** Gets legal rook/bishop moves in a given direction, including capture */
    getStraightLineMovesWithCapture(direction: TDirection): Coordinate[] {
        if (!this.board) return [];
        const coordinates: Coordinate[] = [];
        let current = this.currentCoordinate;
        while (true) {
            const coordinate = this.board.getAdjacentCoordinate(current, direction);
            if (!coordinate) break;
            const pieceAtCoordinate = this.board.getPieceByCoordinate(coordinate);
            if (pieceAtCoordinate?.color === this.color) break;
            coordinates.push(coordinate);
            if (pieceAtCoordinate) break;
            current = coordinate;
        }
        return coordinates;
    }

    get oppositeColor() {
        return this.color === 'white' ? 'black' : 'white';
    }

}

class King extends Piece {
    symbol = 'K';
    value = 0;

    constructor(color: 'white' | 'black', currentSquare: Coordinate, board: Board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♔' : '♚';
    }

    get legalMoves(): Set<Coordinate> {
        if (!this.board) return new Set();
        const moveSet: Set<Coordinate> = new Set();
        if ((this.color === 'white' && this.board.isWhiteInCheck) || (this.color === 'black' && this.board.isBlackInCheck)) {
            // This modifies the legal moves for everything, so...
        }
        else {
            const castleKingside = this.getCastleKingside();
            const castleQueenside = this.getCastleQueenside();
            if (castleKingside) moveSet.add(castleKingside);
            if (castleQueenside) moveSet.add(castleQueenside);
            for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft'] as TDirection[]) {
                const potentialCoordinate = this.board.getAdjacentCoordinate(this.currentCoordinate, direction);
                if (!potentialCoordinate) continue;
                if (this.board.getPieceByCoordinate(potentialCoordinate)?.color === this.color) continue;
                // This is probably not necessary, since we have to check if any given move puts king in check
                if (this.board.isCoordinateAttacked(potentialCoordinate, this.oppositeColor)) continue;
                moveSet.add(potentialCoordinate);
            }
        }

        return moveSet;
    }

    get squaresAttacking(): Set<Coordinate> {
        if (!this.board) return new Set();
        const moveSet: Set<Coordinate> = new Set();
        for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft'] as TDirection[]) {
            const coordinate = this.board.getAdjacentCoordinate(this.currentCoordinate, direction);
            if (coordinate) moveSet.add(coordinate);
        }
        return moveSet;
    }

    // These two/three might belong on the board, not king

    get isInCheck() {
        if (!this.board) return false;
        return (this.color === 'white' && this.board.isWhiteInCheck || this.color === 'black' && this.board.isBlackInCheck);
    }

    get checkingPieces(): Piece[] {
        if (!this.board) return [];
        return this.board.getRemainingPieces(this.oppositeColor)
            .filter(piece => piece.squaresAttacking.has(this.currentCoordinate));
    }

    get isInCheckmate() {
        if (!this.board) return false;
        if (!this.isInCheck) return false;
        return this.board.getRemainingPieces(this.color).every(piece => piece.legalMoves.size === 0);
    }

    getCastleKingside(): Coordinate | false {
        if (!this.board) return false;
        if (this.hasMoved) return false;
        if (this.isInCheck) return false;
        const rank = this.color === 'white' ? '1' : '8';
        if (!!this.board.getPieceByCoordinate(`f${rank}`)) return false;
        if (!!this.board.getPieceByCoordinate(`g${rank}`)) return false;
        const rook = this.board.getPieceByCoordinate(`h${rank}`);
        if (!rook || rook.hasMoved) return false;
        if (this.board?.isCoordinateAttacked(`f${rank}`, this.oppositeColor)) return false;
        if (this.board?.isCoordinateAttacked(`g${rank}`, this.oppositeColor)) return false;
        return `g${rank}`;
    }

    getCastleQueenside(): Coordinate | false {
        if (!this.board) return false;
        if (this.hasMoved) return false;
        if (this.isInCheck) return false;
        const rank = this.color === 'white' ? '1' : '8';
        if (!!this.board.getPieceByCoordinate(`d${rank}`)) return false;
        if (!!this.board.getPieceByCoordinate(`c${rank}`)) return false;
        if (!!this.board.getPieceByCoordinate(`b${rank}`)) return false;
        const rook = this.board.getPieceByCoordinate(`a${rank}`);
        if (!rook || rook.hasMoved) return false;
        if (this.board?.isCoordinateAttacked(`d${rank}`, this.oppositeColor)) return false;
        if (this.board?.isCoordinateAttacked(`c${rank}`, this.oppositeColor)) return false;
        return `c${rank}`;
    }

    moveTo(square: Square) {
        if (!this.board) return;
        if (this.currentCoordinate === 'e1' && square.coordinate === 'g1') {
            const f1 = this.board.SQUARES.get('f1');
            if (!f1) return;
            this.board.getPieceByCoordinate('h1')?.moveTo(f1);
        }
        else if (this.currentCoordinate === 'e8' && square.coordinate === 'g8') {
            const f8 = this.board.SQUARES.get('f8');
            if (!f8) return;
            this.board.getPieceByCoordinate('h8')?.moveTo(f8);
        }
        else if (this.currentCoordinate === 'e1' && square.coordinate === 'c1') {
            const d1 = this.board.SQUARES.get('d1');
            if (!d1) return;
            this.board.getPieceByCoordinate('a1')?.moveTo(d1);
        }
        else if (this.currentCoordinate === 'e8' && square.coordinate === 'c8') {
            const d8 = this.board.SQUARES.get('d8');
            if (!d8) return;
            this.board.getPieceByCoordinate('a8')?.moveTo(d8);
        }
        super.moveTo(square);
    }
}

class Queen extends Piece {
    symbol = 'Q';
    value = 9;

    constructor(color: 'white' | 'black', currentSquare: Coordinate, board: Board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♕' : '♛';
    }

    get legalMoves() {
        return new Set([
            ...this.getStraightLineMovesWithCapture('up'),
            ...this.getStraightLineMovesWithCapture('upright'),
            ...this.getStraightLineMovesWithCapture('right'),
            ...this.getStraightLineMovesWithCapture('downright'),
            ...this.getStraightLineMovesWithCapture('down'),
            ...this.getStraightLineMovesWithCapture('downleft'),
            ...this.getStraightLineMovesWithCapture('left'),
            ...this.getStraightLineMovesWithCapture('upleft')
        ]);
    }

    get squaresAttacking() {
        return this.legalMoves;
    }

}

class Rook extends Piece {
    symbol = 'R';
    value = 5;

    constructor(color: 'white' | 'black', currentSquare: Coordinate, board: Board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♖' : '♜';
    }

    get legalMoves() {
        return new Set([
            ...this.getStraightLineMovesWithCapture('up'),
            ...this.getStraightLineMovesWithCapture('down'),
            ...this.getStraightLineMovesWithCapture('left'),
            ...this.getStraightLineMovesWithCapture('right')
        ]);
    }

    get squaresAttacking() {
        return this.legalMoves;
    }
}

class Bishop extends Piece {
    symbol = 'B';
    value = 3;

    constructor(color: 'white' | 'black', currentSquare: Coordinate, board: Board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♗' : '♝';
    }

    get legalMoves() {
        return new Set([
            ...this.getStraightLineMovesWithCapture('upright'),
            ...this.getStraightLineMovesWithCapture('downright'),
            ...this.getStraightLineMovesWithCapture('downleft'),
            ...this.getStraightLineMovesWithCapture('upleft')
        ]);
    }

    get squaresAttacking() {
        return this.legalMoves;
    }

}

class Knight extends Piece {
    symbol = 'N';
    value = 3;

    constructor(color: 'white' | 'black', currentSquare: Coordinate, board: Board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♘' : '♞';
    }

    get legalMoves() {
        if (!this.board) return new Set() as Set<Coordinate>;
        const moveSet: Set<Coordinate> = new Set();
        const upLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upleft');
        const upTwoLeftOne = upLeft && this.board.getAdjacentCoordinate(upLeft, 'up');
        if (upTwoLeftOne) moveSet.add(upTwoLeftOne);
        const upRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upright');
        const upTwoRightOne = upRight && this.board.getAdjacentCoordinate(upRight, 'up');
        if (upTwoRightOne) moveSet.add(upTwoRightOne);
        const right = this.board.getAdjacentCoordinate(this.currentCoordinate, 'right');
        const rightTwoUpOne = right && this.board.getAdjacentCoordinate(right, 'upright');
        if (rightTwoUpOne) moveSet.add(rightTwoUpOne);
        const rightTwoDownOne = right && this.board.getAdjacentCoordinate(right, 'downright');
        if (rightTwoDownOne) moveSet.add(rightTwoDownOne);
        const downRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downright');
        const downTwoRightOne = downRight && this.board.getAdjacentCoordinate(downRight, 'down');
        if (downTwoRightOne) moveSet.add(downTwoRightOne);
        const downLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downleft');
        const downTwoLeftOne = downLeft && this.board.getAdjacentCoordinate(downLeft, 'down');
        if (downTwoLeftOne) moveSet.add(downTwoLeftOne);
        const left = this.board.getAdjacentCoordinate(this.currentCoordinate, 'left');
        const leftTwoUpOne = left && this.board.getAdjacentCoordinate(left, 'upleft');
        if (leftTwoUpOne) moveSet.add(leftTwoUpOne);
        const leftTwoDownOne = left && this.board.getAdjacentCoordinate(left, 'downleft');
        if (leftTwoDownOne) moveSet.add(leftTwoDownOne);
        for (const coordinate of moveSet) {
            if (this.board.getPieceByCoordinate(coordinate)?.color === this.color) moveSet.delete(coordinate);
        }
        return moveSet;
    }

    get squaresAttacking() {
        return this.legalMoves;
    }


}

class Pawn extends Piece {
    symbol = '';
    value = 1;

    constructor(color: 'white' | 'black', coordinate: Coordinate, board: Board) {
        super(color, coordinate, board);
        this.textContent = this.color === 'white' ? '♙' : '♟';
    }

    get legalMoves() {
        const moveSet: Set<Coordinate> = new Set();
        if (!this.board) return moveSet;
        // Needs en passant which is contextually aware
        // Just checks if the global enpassantable pawn is next to it

        if (this.color === 'white') {
            const oneInFront = this.board.getAdjacentCoordinate(this.currentCoordinate, 'up');
            const pieceInFront = oneInFront && this.board.getPieceByCoordinate(oneInFront);
            if (oneInFront && !pieceInFront) moveSet.add(oneInFront);

            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upright');
            if (oneUpRight && this.board.getPieceByCoordinate(oneUpRight)?.color === 'black') moveSet.add(oneUpRight);

            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upleft');
            if (oneUpLeft && this.board.getPieceByCoordinate(oneUpLeft)?.color === 'black') moveSet.add(oneUpLeft);

            if (oneInFront && !pieceInFront && !this.hasMoved) {
                const twoInFront = this.board.getAdjacentCoordinate(oneInFront, 'up');
                if (twoInFront && !this.board.getPieceByCoordinate(twoInFront)) moveSet.add(twoInFront);
            }
        }
        else {
            const oneInFront = this.board.getAdjacentCoordinate(this.currentCoordinate, 'down');
            const pieceInFront = oneInFront && this.board.getPieceByCoordinate(oneInFront);
            if (oneInFront && !pieceInFront) moveSet.add(oneInFront);

            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downleft');
            if (oneUpRight && this.board.getPieceByCoordinate(oneUpRight)?.color === 'white') moveSet.add(oneUpRight);

            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downright');
            if (oneUpLeft && this.board.getPieceByCoordinate(oneUpLeft)?.color === 'white') moveSet.add(oneUpLeft);

            if (oneInFront && !pieceInFront && !this.hasMoved) {
                const twoInFront = this.board.getAdjacentCoordinate(oneInFront, 'down');
                if (twoInFront && !this.board.getPieceByCoordinate(twoInFront)) moveSet.add(twoInFront);
            }
        }



        return moveSet;
    }

    get squaresAttacking(): Set<Coordinate> {
        const moveSet: Set<Coordinate> = new Set();
        if (!this.board) return moveSet;
        if (this.color === 'white') {
            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upright');
            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upleft');
            if (oneUpRight) moveSet.add(oneUpRight)
            if (oneUpLeft) moveSet.add(oneUpLeft)
        }
        else {
            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downleft');
            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downright');
            if (oneUpRight) moveSet.add(oneUpRight)
            if (oneUpLeft) moveSet.add(oneUpLeft)
        }
        return moveSet;
    }

    moveTo(square: Square) {
        if (!this.board) return;
        super.moveTo(square);
        const rank = square.coordinate[1];
        if (this.color === 'white' && rank === '8' || this.color === 'black' && rank === '1') {
            this.replaceWith(new Queen(this.color, square.coordinate, this.board)); // Promotion dialog
        }
    }

    promote() {

    }

}

class Square extends HTMLElement {

    coordinate: Coordinate;

    constructor(coordinate: Coordinate) {
        super();
        this.coordinate = coordinate;
        if (['a1', 'b2', 'c1', 'd2', 'e1', 'f2', 'g1', 'h2', 'a3', 'b4', 'c3', 'd4', 'e3', 'f4', 'g3', 'h4',
            'a5', 'b6', 'c5', 'd6', 'e5', 'f6', 'g5', 'h6', 'a7', 'b8', 'c7', 'd8', 'e7', 'f8', 'g7', 'h8'].includes(coordinate)) {
            this.classList.add('dark');
        }
    }

    get piece(): Piece | null {
        if (this.firstElementChild instanceof Piece) return this.firstElementChild;
        return null;
    }

    get board() {
        const board = this.closest('sw-board');
        if (board instanceof Board) return board;
        return null;
    }

    clear() {
        this.replaceChildren();
    }
}

class Board extends HTMLElement {

    SQUARES: Map<Coordinate, Square> = new Map();

    currentMove: 'white' | 'black' = 'white';
    moveList: string[][] = [];
    enPassantablePawn: Pawn | null = null;
    #whiteKing: King | null = null;
    #blackKing: King | null = null;

    constructor() {
        super();
        const files: TFile[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks: TRank[] = ['8', '7', '6', '5', '4', '3', '2', '1'];
        for (const rank of ranks) {
            for (const file of files) {
                const square = new Square(`${file}${rank}`);
                this.SQUARES.set(`${file}${rank}`, square);
            }
        }
        this.#whiteKing = new King('white', 'e1', this);
        this.#blackKing = new King('black', 'e8', this);
        new Queen('white', 'd1', this);
        new Queen('black', 'd8', this);
        new Rook('white', 'a1', this);
        new Rook('white', 'h1', this);
        new Rook('black', 'a8', this);
        new Rook('black', 'h8', this);
        new Bishop('white', 'c1', this);
        new Bishop('white', 'f1', this);
        new Bishop('black', 'c8', this);
        new Bishop('black', 'f8', this);
        new Knight('white', 'b1', this);
        new Knight('white', 'g1', this);
        new Knight('black', 'b8', this);
        new Knight('black', 'g8', this);
        for (const file of files) {
            new Pawn('white', `${file}2`, this);
            new Pawn('black', `${file}7`, this);
        }
    }


    connectedCallback() {
        this.replaceChildren(...this.SQUARES.values());
        this.dataset.toMove = this.currentMove;
    }

    getAdjacentCoordinate(startCoordinate: Coordinate, direction: TDirection): Coordinate | null {
        let file = startCoordinate[0] as TFile;
        let rank = startCoordinate[1] as TRank;
        if (direction.includes('left')) {
            if (file === 'a') return null;
            file = String.fromCharCode(file.charCodeAt(0) - 1) as TFile;
        }
        if (direction.includes('right')) {
            if (file === 'h') return null;
            file = String.fromCharCode(file.charCodeAt(0) + 1) as TFile;
        }
        if (direction.includes('up')) {
            if (rank === '8') return null;
            rank = String(Number(rank) + 1) as TRank;
        }
        if (direction.includes('down')) {
            if (rank === '1') return null;
            rank = String(Number(rank) - 1) as TRank;
        }
        return `${file}${rank}`;
    }

    getPieceByCoordinate(coordinate: Coordinate) {
        return this.SQUARES.get(coordinate)?.piece ?? null;
    }

    getRemainingPieces(color: 'white' | 'black'): Piece[] {
        return [...this.SQUARES.values()].map(sq => sq.piece).filter(p => (p instanceof Piece) && p.color === color) as Piece[];
    }

    isCoordinateAttacked(coordinate: Coordinate, attackingColor: 'white' | 'black') {
        return this.getRemainingPieces(attackingColor).some(piece => piece.squaresAttacking.has(coordinate));
    }

    get isWhiteInCheck() {
        if (this.currentMove === 'black') return false;
        return this.isCoordinateAttacked(this.#whiteKing!.currentCoordinate, 'black');
    }

    get isBlackInCheck() {
        if (this.currentMove === 'white') return false;
        return this.isCoordinateAttacked(this.#blackKing!.currentCoordinate, 'white');
    }

    changeMove() {
        this.currentMove = this.currentMove === 'white' ? 'black' : 'white';
        this.dataset.toMove = this.currentMove;
    }

    /** Any possible move must be tested to see if it exposes the king to check in order to determine if it's legal */
    doesMovePutPlayerIntoCheck() {

    }

}


customElements.define('sw-king', King);
customElements.define('sw-queen', Queen);
customElements.define('sw-rook', Rook);
customElements.define('sw-bishop', Bishop);
customElements.define('sw-knight', Knight);
customElements.define('sw-pawn', Pawn);
customElements.define('sw-square', Square);
customElements.define('sw-board', Board);

