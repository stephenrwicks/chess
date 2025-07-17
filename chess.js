"use strict";
class Piece extends HTMLElement {
    color;
    #hasMoved = false;
    #board = null;
    symbol = '';
    isActive = false;
    constructor(color, coordinate, board) {
        super();
        if (!color || !coordinate || !board)
            throw new Error('Illegal constructor.');
        this.#board = board;
        this.color = color;
        this.className = `piece ${color}`;
        // Should the pieces place themselves, or should the board place the pieces?
        // loadFen() could simply load the default
        board.squares.get(coordinate)?.replaceChildren(this);
        let offsetX = 0;
        let offsetY = 0;
        const handleDown = (e) => {
            if (this.board.currentMove !== this.color)
                return;
            this.isActive = true;
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
            if (this.square)
                this.square.classList.add('active');
        };
        const handleMove = (e) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            this.style.left = `${left}px`;
            this.style.top = `${top}px`;
        };
        const handleUp = (e) => {
            const hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY).find(el => el instanceof Square) ?? null;
            this.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            for (const square of this.board.squares?.values()) {
                square.classList.remove('legal', 'active');
            }
            if (hoveredSquare) {
                if (!this.legalMoves?.has(hoveredSquare.coordinate)) {
                    this.isActive = false;
                    return;
                }
                this.moveTo(hoveredSquare);
                this.#hasMoved = true;
                this.board.changeMove();
            }
            this.isActive = false;
        };
        this.addEventListener('pointerdown', handleDown);
    }
    get currentCoordinate() {
        return this.square?.coordinate ?? '';
    }
    squaresAttackingMemo = null;
    // Even better would be to memoize the moves for the given position per piece
    legalMovesMemo = null;
    get legalMoves() {
        if (this.legalMovesMemo)
            return this.legalMovesMemo;
        const moveSet = this.squaresAttacking;
        if (!this.board)
            return moveSet;
        this.board.removeMovesThatPutPlayerIntoCheck(moveSet, this.color);
        console.log('x');
        this.legalMovesMemo = moveSet;
        return moveSet;
    }
    get board() {
        return this.#board;
    }
    get square() {
        if (this.parentElement instanceof Square)
            return this.parentElement;
        return null;
    }
    #highlightLegalMoves() {
        if (!this.board)
            return;
        for (const coordinate of this.legalMoves) {
            const square = this.board.squares.get(coordinate);
            if (!square)
                return;
            square.classList.add('legal');
        }
    }
    moveTo(square) {
        if (!square || !this.board)
            return;
        this.board.moveList.push(this.getMoveNotation(square.coordinate));
        square.replaceChildren(this);
    }
    getMoveNotation(coordinate) {
        if (!this.board)
            return {};
        // if castling just return? will have to also check check/mate
        const isCapture = this.board.getPieceByCoordinate(coordinate)?.color === this.oppositeColor;
        // This does not work right now because we are determining the check only after the move happens, and this occurs before
        // If I uncover a good way to do a "preflight" check for check/mates, this might work here too. Otherwise I have to come up with another solution
        // const isCheck = (this.board.isWhiteInCheck && !this.board.isWhiteInCheckmate) || (this.board.isBlackInCheck && !this.board.isBlackInCheckmate);
        // const isCheckmate = this.board.isWhiteInCheckmate || this.board.isBlackInCheckmate;
        let notation = '';
        notation += this.symbol;
        if (isCapture) {
            if (this instanceof Pawn)
                notation += this.currentCoordinate[0];
            notation += 'x';
        }
        notation += coordinate;
        // if (isCheck) notation += '+';
        // if (isCheckmate) notation += '#';
        return { piece: this, coordinate, notation };
    }
    get hasMoved() {
        return this.#hasMoved;
    }
    /** Gets legal rook/bishop moves in a given direction, including capture */
    getStraightLineMoves(direction) {
        const coordinates = [];
        if (!this.board)
            return coordinates;
        let current = this.currentCoordinate;
        // Looping here to get straight line one square at a time.
        // Jump out of the loop when we hit something we can't capture
        while (true) {
            const coordinate = this.board.getAdjacentCoordinate(current, direction);
            if (!coordinate)
                break;
            const pieceAtCoordinate = this.board.getPieceByCoordinate(coordinate);
            // Break here if the piece is the same color as the moving piece only if it is this player's turn
            // So a rook/bishop/queen can't capture its own piece, but it can defend it from king capturing it
            if (pieceAtCoordinate?.color === this.color && this.board.currentMove === this.color)
                break;
            coordinates.push(coordinate);
            // If a piece is determining its legal moves, it needs to know if it is exposing the king.
            // So here we "see through" (by excluding) the active piece, i.e., the piece you are currently dragging,
            // to find out if a rook/bishop/queen will hit the king, before you play the move
            if (pieceAtCoordinate && !pieceAtCoordinate.isActive)
                break;
            // See through en passantable pawn
            if (this.board.enPassantablePawn?.color === this.color && pieceAtCoordinate !== this.board.enPassantablePawn && pieceAtCoordinate && !pieceAtCoordinate.isActive) {
            }
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
    constructor(color, currentSquare, board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♔' : '♚';
    }
    get legalMoves() {
        const moveSet = this.squaresAttacking;
        if (!this.board)
            return moveSet;
        for (const coordinate of moveSet) {
            if (this.board.isCoordinateAttacked(coordinate, this.oppositeColor))
                moveSet.delete(coordinate);
        }
        if (this.board.currentMove === this.color) {
            const castleKingside = this.castleKingsideCoordinate;
            const castleQueenside = this.castleQueensideCoordinate;
            if (castleKingside)
                moveSet.add(castleKingside);
            if (castleQueenside)
                moveSet.add(castleQueenside);
        }
        return moveSet;
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set();
        if (!this.board)
            return moveSet;
        for (const direction of ['up', 'upright', 'right', 'downright', 'down', 'downleft', 'left', 'upleft']) {
            const coordinate = this.board.getAdjacentCoordinate(this.currentCoordinate, direction);
            if (!coordinate)
                continue;
            if (this.board.getPieceByCoordinate(coordinate)?.color === this.color)
                continue;
            moveSet.add(coordinate);
        }
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
    get castleKingsideCoordinate() {
        if (!this.board)
            return null;
        if (this.hasMoved)
            return null;
        if (this.board.isInCheck(this.color))
            return null;
        const rank = this.color === 'white' ? '1' : '8';
        if (!!this.board.getPieceByCoordinate(`f${rank}`))
            return null;
        if (!!this.board.getPieceByCoordinate(`g${rank}`))
            return null;
        const rook = this.board.getPieceByCoordinate(`h${rank}`);
        if (!rook || rook.hasMoved)
            return null;
        if (this.board.isCoordinateAttacked(`f${rank}`, this.oppositeColor))
            return null;
        if (this.board.isCoordinateAttacked(`g${rank}`, this.oppositeColor))
            return null;
        return `g${rank}`;
    }
    get castleQueensideCoordinate() {
        if (!this.board)
            return null;
        if (this.hasMoved)
            return null;
        if (this.board.isInCheck(this.color))
            return null;
        const rank = this.color === 'white' ? '1' : '8';
        if (!!this.board.getPieceByCoordinate(`d${rank}`))
            return null;
        if (!!this.board.getPieceByCoordinate(`c${rank}`))
            return null;
        if (!!this.board.getPieceByCoordinate(`b${rank}`))
            return null;
        const rook = this.board.getPieceByCoordinate(`a${rank}`);
        if (!rook || rook.hasMoved)
            return null;
        if (this.board.isCoordinateAttacked(`d${rank}`, this.oppositeColor))
            return null;
        if (this.board.isCoordinateAttacked(`c${rank}`, this.oppositeColor))
            return null;
        return `c${rank}`;
    }
    moveTo(square) {
        if (!this.board)
            return;
        if (this.currentCoordinate === 'e1' && square.coordinate === 'g1') {
            const f1 = this.board.squares.get('f1');
            if (!f1)
                return;
            this.board.getPieceByCoordinate('h1')?.moveTo(f1);
        }
        else if (this.currentCoordinate === 'e8' && square.coordinate === 'g8') {
            const f8 = this.board.squares.get('f8');
            if (!f8)
                return;
            this.board.getPieceByCoordinate('h8')?.moveTo(f8);
        }
        else if (this.currentCoordinate === 'e1' && square.coordinate === 'c1') {
            const d1 = this.board.squares.get('d1');
            if (!d1)
                return;
            this.board.getPieceByCoordinate('a1')?.moveTo(d1);
        }
        else if (this.currentCoordinate === 'e8' && square.coordinate === 'c8') {
            const d8 = this.board.squares.get('d8');
            if (!d8)
                return;
            this.board.getPieceByCoordinate('a8')?.moveTo(d8);
        }
        super.moveTo(square);
    }
}
class Queen extends Piece {
    symbol = 'Q';
    value = 9;
    constructor(color, currentSquare, board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♕' : '♛';
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set([
            ...this.getStraightLineMoves('up'),
            ...this.getStraightLineMoves('upright'),
            ...this.getStraightLineMoves('right'),
            ...this.getStraightLineMoves('downright'),
            ...this.getStraightLineMoves('down'),
            ...this.getStraightLineMoves('downleft'),
            ...this.getStraightLineMoves('left'),
            ...this.getStraightLineMoves('upleft')
        ]);
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
}
class Rook extends Piece {
    symbol = 'R';
    value = 5;
    constructor(color, currentSquare, board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♖' : '♜';
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set([
            ...this.getStraightLineMoves('up'),
            ...this.getStraightLineMoves('down'),
            ...this.getStraightLineMoves('left'),
            ...this.getStraightLineMoves('right')
        ]);
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
}
class Bishop extends Piece {
    symbol = 'B';
    value = 3;
    constructor(color, currentSquare, board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♗' : '♝';
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set([
            ...this.getStraightLineMoves('upright'),
            ...this.getStraightLineMoves('downright'),
            ...this.getStraightLineMoves('downleft'),
            ...this.getStraightLineMoves('upleft')
        ]);
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
}
class Knight extends Piece {
    symbol = 'N';
    value = 3;
    constructor(color, currentSquare, board) {
        super(color, currentSquare, board);
        this.textContent = this.color === 'white' ? '♘' : '♞';
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set();
        if (!this.board)
            return moveSet;
        const upLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upleft');
        const upTwoLeftOne = upLeft && this.board.getAdjacentCoordinate(upLeft, 'up');
        if (upTwoLeftOne)
            moveSet.add(upTwoLeftOne);
        const upRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upright');
        const upTwoRightOne = upRight && this.board.getAdjacentCoordinate(upRight, 'up');
        if (upTwoRightOne)
            moveSet.add(upTwoRightOne);
        const right = this.board.getAdjacentCoordinate(this.currentCoordinate, 'right');
        const rightTwoUpOne = right && this.board.getAdjacentCoordinate(right, 'upright');
        if (rightTwoUpOne)
            moveSet.add(rightTwoUpOne);
        const rightTwoDownOne = right && this.board.getAdjacentCoordinate(right, 'downright');
        if (rightTwoDownOne)
            moveSet.add(rightTwoDownOne);
        const downRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downright');
        const downTwoRightOne = downRight && this.board.getAdjacentCoordinate(downRight, 'down');
        if (downTwoRightOne)
            moveSet.add(downTwoRightOne);
        const downLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downleft');
        const downTwoLeftOne = downLeft && this.board.getAdjacentCoordinate(downLeft, 'down');
        if (downTwoLeftOne)
            moveSet.add(downTwoLeftOne);
        const left = this.board.getAdjacentCoordinate(this.currentCoordinate, 'left');
        const leftTwoUpOne = left && this.board.getAdjacentCoordinate(left, 'upleft');
        if (leftTwoUpOne)
            moveSet.add(leftTwoUpOne);
        const leftTwoDownOne = left && this.board.getAdjacentCoordinate(left, 'downleft');
        if (leftTwoDownOne)
            moveSet.add(leftTwoDownOne);
        // Can defend own piece from king, but can't capture own piece, so we check the current move
        // I have to check if this still works if moving the knight would put the king in check on the next move
        if (this.board.currentMove === this.color) {
            for (const coordinate of moveSet) {
                if (this.board.getPieceByCoordinate(coordinate)?.color === this.color)
                    moveSet.delete(coordinate);
            }
        }
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
}
class Pawn extends Piece {
    value = 1;
    constructor(color, coordinate, board) {
        super(color, coordinate, board);
        this.textContent = this.color === 'white' ? '♙' : '♟';
    }
    get legalMoves() {
        if (this.legalMovesMemo)
            return this.legalMovesMemo;
        const moveSet = new Set();
        if (!this.board)
            return moveSet;
        const w = this.color === 'white';
        const oneInFront = this.board.getAdjacentCoordinate(this.currentCoordinate, w ? 'up' : 'down');
        const pieceInFront = oneInFront && this.board.getPieceByCoordinate(oneInFront);
        if (oneInFront && !pieceInFront)
            moveSet.add(oneInFront);
        const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, w ? 'upright' : 'downleft');
        if (oneUpRight && this.board.getPieceByCoordinate(oneUpRight)?.color === this.oppositeColor)
            moveSet.add(oneUpRight);
        const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, w ? 'upleft' : 'downright');
        if (oneUpLeft && this.board.getPieceByCoordinate(oneUpLeft)?.color === this.oppositeColor)
            moveSet.add(oneUpLeft);
        // Double jump
        if (oneInFront && !pieceInFront && !this.hasMoved) {
            const twoInFront = this.board.getAdjacentCoordinate(oneInFront, w ? 'up' : 'down');
            if (twoInFront && !this.board.getPieceByCoordinate(twoInFront))
                moveSet.add(twoInFront);
        }
        // En passant
        if (this.board.enPassantablePawn?.color === this.oppositeColor) {
            const oneLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, w ? 'left' : 'right');
            const oneRight = this.board.getAdjacentCoordinate(this.currentCoordinate, w ? 'right' : 'left');
            const pieceLeft = oneLeft && this.board.getPieceByCoordinate(oneLeft);
            const pieceRight = oneRight && this.board.getPieceByCoordinate(oneRight);
            if (pieceLeft === this.board.enPassantablePawn && oneUpLeft) {
                moveSet.add(oneUpLeft);
                this.board.enPassantCoordinate = oneUpLeft;
            }
            else if (pieceRight === this.board.enPassantablePawn && oneUpRight) {
                moveSet.add(oneUpRight);
                this.board.enPassantCoordinate = oneUpRight;
            }
        }
        this.board.removeMovesThatPutPlayerIntoCheck(moveSet, this.color);
        this.legalMovesMemo = moveSet;
        return moveSet;
    }
    get squaresAttacking() {
        if (this.squaresAttackingMemo)
            return this.squaresAttackingMemo;
        const moveSet = new Set();
        if (!this.board)
            return moveSet;
        if (this.color === 'white') {
            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upright');
            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'upleft');
            if (oneUpRight)
                moveSet.add(oneUpRight);
            if (oneUpLeft)
                moveSet.add(oneUpLeft);
        }
        else {
            const oneUpRight = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downleft');
            const oneUpLeft = this.board.getAdjacentCoordinate(this.currentCoordinate, 'downright');
            if (oneUpRight)
                moveSet.add(oneUpRight);
            if (oneUpLeft)
                moveSet.add(oneUpLeft);
        }
        this.squaresAttackingMemo = moveSet;
        return moveSet;
    }
    moveTo(square) {
        if (!this.board)
            return;
        const oldRank = Number(this.currentCoordinate[1]);
        super.moveTo(square);
        const rank = Number(square.coordinate[1]);
        if (this.color === 'white' && rank === 8 || this.color === 'black' && rank === 1) {
            this.replaceWith(new Queen(this.color, square.coordinate, this.board)); // Promotion dialog
        }
        const isTwoSquares = Math.abs(Number(rank) - Number(oldRank)) > 1;
        if (isTwoSquares)
            this.board.enPassantablePawn = this;
        // If en passant is possible, and a pawn is moving to that square, it must be en passant, because the square is empty
        const isEnPassant = square.coordinate === this.board.enPassantCoordinate;
        if (isEnPassant) {
            this.board.enPassantablePawn?.remove();
        }
    }
    promote() {
    }
}
class Square extends HTMLElement {
    coordinate;
    constructor(coordinate) {
        super();
        this.coordinate = coordinate;
        if (['a1', 'b2', 'c1', 'd2', 'e1', 'f2', 'g1', 'h2', 'a3', 'b4', 'c3', 'd4', 'e3', 'f4', 'g3', 'h4',
            'a5', 'b6', 'c5', 'd6', 'e5', 'f6', 'g5', 'h6', 'a7', 'b8', 'c7', 'd8', 'e7', 'f8', 'g7', 'h8'].includes(coordinate)) {
            this.classList.add('dark');
        }
    }
    get piece() {
        if (this.firstElementChild instanceof Piece)
            return this.firstElementChild;
        return null;
    }
    get board() {
        const board = this.closest('sw-board');
        if (board instanceof Board)
            return board;
        return null;
    }
}
// Emit custom events to pass pieces outside the board
class Board extends HTMLElement {
    squares = new Map();
    currentMove = 'white';
    moveList = [];
    enPassantablePawn = null;
    enPassantCoordinate = null;
    #threeFoldRepetitionCounter = new Map();
    #whiteKing = null;
    #blackKing = null;
    constructor() {
        super();
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
        for (const rank of ranks) {
            for (const file of files) {
                const square = new Square(`${file}${rank}`);
                this.squares.set(`${file}${rank}`, square);
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
        this.replaceChildren(...this.squares.values());
        this.dataset.toMove = this.currentMove;
    }
    getAdjacentCoordinate(startCoordinate, direction) {
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
    getDirectionBetweenTwoCoordinates(a, b) {
        const fileA = a[0];
        const rankA = a[1];
        const fileB = b[0];
        const rankB = b[1];
        const isUp = Number(rankA) < Number(rankB);
        const isDown = Number(rankA) > Number(rankB);
        const isLeft = fileA.charCodeAt(0) - fileB.charCodeAt(0) > 0;
        const isRight = fileA.charCodeAt(0) - fileB.charCodeAt(0) < 0;
        let direction = '';
        if (isUp)
            direction += 'up';
        else if (isDown)
            direction += 'down';
        if (isLeft)
            direction += 'left';
        else if (isRight)
            direction += 'right';
        return direction;
    }
    get squaresThatBlockOrRemoveCheckingPiece() {
        const king = this.currentMove === 'white' ? this.#whiteKing : this.#blackKing;
        if (!king)
            return null;
        if (!this.isInCheck(this.currentMove))
            return null;
        const moveSet = new Set();
        const checkingPieces = this.getRemainingPieces(this.currentMove === 'white' ? 'black' : 'white').filter(p => p.squaresAttacking.has(king.currentCoordinate));
        if (checkingPieces.length > 1)
            return moveSet; // Double check. Return immediately, can't be removed or blocked
        for (const piece of checkingPieces) {
            moveSet.add(piece.currentCoordinate); // Add square that captures piece
            if (piece instanceof Queen || piece instanceof Rook || piece instanceof Bishop) {
                // Allow blocking. You can't block a pawn or knight
                const direction = this.getDirectionBetweenTwoCoordinates(piece.currentCoordinate, king.currentCoordinate);
                for (const coordinate of piece.getStraightLineMoves(direction))
                    moveSet.add(coordinate);
            }
        }
        moveSet.delete(king.currentCoordinate);
        return moveSet;
    }
    getPieceByCoordinate(coordinate) {
        return this.squares.get(coordinate)?.piece ?? null;
    }
    getRemainingPieces(color) {
        const pieces = [];
        for (const sq of this.squares.values()) {
            if (sq.piece instanceof Piece && sq.piece.color === color)
                pieces.push(sq.piece);
        }
        return pieces;
    }
    isCoordinateAttacked(coordinate, attackingColor) {
        return this.getRemainingPieces(attackingColor).some(piece => piece.squaresAttacking.has(coordinate));
    }
    removeMovesThatPutPlayerIntoCheck(moveSet, color) {
        // Rare situation where en passant would move a player into check, and cannot be played.
        // How to handle that?
        const forcedMoves = this.squaresThatBlockOrRemoveCheckingPiece;
        if (forcedMoves) {
            for (const move of moveSet) {
                // We are in check. Delete moves that aren't in the forced move list.
                if (!forcedMoves.has(move))
                    moveSet.delete(move);
            }
        }
        else {
            const king = color === 'white' ? this.#whiteKing : this.#blackKing;
            if (!king)
                return;
            // Delete move if it exposes king.
            for (const move of moveSet) {
                for (const piece of this.getRemainingPieces(color === 'white' ? 'black' : 'white')) {
                    if (piece.squaresAttacking.has(king.currentCoordinate))
                        moveSet.delete(move);
                }
            }
        }
    }
    isInCheck(color) {
        if (this.currentMove !== color)
            return false;
        const king = color === 'white' ? this.#whiteKing : this.#blackKing;
        if (!king)
            return false;
        return this.isCoordinateAttacked(king.currentCoordinate, king.oppositeColor);
    }
    isInCheckmate(color) {
        const king = color === 'white' ? this.#whiteKing : this.#blackKing;
        if (!king)
            return false;
        if (!this.isInCheck(color))
            return false;
        return this.getRemainingPieces(color).every(p => p.legalMoves.size === 0);
    }
    isStalemate() {
        return !this.isInCheck(this.currentMove) && this.getRemainingPieces(this.currentMove).every(p => p.legalMoves.size === 0);
    }
    isInsufficientMaterial() {
    }
    isThreefoldRepetition() {
        // const fen = this.getFen();
        // let numberOfReps = this.#threeFoldRepetitionCounter.get(this.getFen()) ?? 0;
        // numberOfReps++;
        // this.#threeFoldRepetitionCounter.set(fen, numberOfReps);
        // return numberOfReps >= 3;
        return false;
    }
    changeMove() {
        this.currentMove = this.currentMove === 'white' ? 'black' : 'white';
        this.dataset.toMove = this.currentMove;
        this.clear();
        if (this.isThreefoldRepetition()) {
        }
        else if (this.isInCheckmate(this.currentMove)) {
            const king = this.currentMove === 'white' ? this.#whiteKing : this.#blackKing;
            if (!king)
                return;
            king.square?.classList.add('checkmate');
        }
        else if (this.isInCheck(this.currentMove)) {
            const king = this.currentMove === 'white' ? this.#whiteKing : this.#blackKing;
            if (!king)
                return;
            king.square?.classList.add('check');
        }
        // Always null out en passant if it's the same color as the new move
        if (!(this.enPassantablePawn?.color === (this.currentMove === 'white' ? 'black' : 'white'))) {
            this.enPassantablePawn = null;
            this.enPassantCoordinate = null;
        }
    }
    clear() {
        for (const square of this.squares.values()) {
            square.classList.remove('legal', 'active', 'check', 'checkmate');
            if (square.piece) {
                square.piece.legalMovesMemo = null;
                square.piece.squaresAttackingMemo = null;
            }
        }
    }
    back() {
    }
    forward() {
    }
    loadFen(fen) {
        for (const square of this.squares.values()) {
            square.replaceChildren();
        }
    }
    getFen() {
        return '';
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
