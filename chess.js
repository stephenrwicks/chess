"use strict";
class Piece extends HTMLElement {
    color;
    currentCoordinate;
    initialCoordinate;
    legalMoves = new Set();
    constructor(color, coordinate) {
        super();
        this.color = color;
        this.initialCoordinate = coordinate;
        this.currentCoordinate = coordinate;
        this.className = `piece ${color}`;
        this.moveTo(squareMap.get(this.currentCoordinate));
        let offsetX = 0;
        let offsetY = 0;
        let hoveredSquare = null;
        const handleDown = (e) => {
            this.style.position = 'absolute';
            offsetX = this.getBoundingClientRect().width / 2;
            offsetY = this.getBoundingClientRect().height / 2;
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            this.style.left = `${left}px`;
            this.style.top = `${top}px`;
            this.style.cursor = 'grabbing';
            window.addEventListener('pointermove', handleMove);
            window.addEventListener('pointerup', handleUp, { once: true });
            //squareMap.get(this.currentCoordinate)!.style.backgroundColor = 'hsla(160, 100.00%, 20.00%, 0.80)';
        };
        const handleMove = (e) => {
            const left = e.clientX - offsetX;
            const top = e.clientY - offsetY;
            this.style.left = `${left}px`;
            this.style.top = `${top}px`;
            hoveredSquare = document.elementsFromPoint(e.clientX, e.clientY).find(el => el instanceof Square) ?? null;
        };
        const handleUp = () => {
            this.removeAttribute('style');
            window.removeEventListener('pointermove', handleMove);
            if (hoveredSquare) {
                if (!this.isLegalMove(hoveredSquare.coordinate))
                    return;
                this.moveTo(hoveredSquare);
            }
            hoveredSquare = null;
            //squareMap.get(this.currentCoordinate)!.removeAttribute('style');
        };
        this.addEventListener('pointerdown', handleDown);
    }
    moveTo(square) {
        if (!square)
            return false;
        square.replaceChildren(this);
        this.currentCoordinate = square.coordinate;
        return true;
    }
    get hasMoved() {
        return this.currentCoordinate !== this.initialCoordinate;
    }
    destroy() {
        this.remove();
        this.onclick = null;
    }
}
class King extends Piece {
    symbol = 'K';
    value = 0;
    icon = '♚';
    constructor(color, currentSquare) {
        super(color, currentSquare);
        this.textContent = this.icon;
    }
    // getPotentialMoves(): Set<Coordinate> {
    //     return new Set([
    //         getAdjacentCoordinate(this.currentCoordinate, 'up'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'upright'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'right'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'downright'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'down'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'downleft'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'left'),
    //         getAdjacentCoordinate(this.currentCoordinate, 'upleft'),
    //     ].filter(c => c !== null));
    // }
    updateLegalMoves() {
        this.legalMoves.clear();
    }
    get canCastleKingside() {
        if (this.hasMoved)
            return false;
        if (this.color === 'white' && !!getPieceByCoordinate('f1'))
            return false;
        if (this.color === 'white' && !!getPieceByCoordinate('g1'))
            return false;
        if (this.color === 'black' && !!getPieceByCoordinate('f8'))
            return false;
        if (this.color === 'black' && !!getPieceByCoordinate('g8'))
            return false;
        // rook on h1 / h8 has moved
        // squares not blocked and not attacked
        return true;
    }
}
class Queen extends Piece {
    symbol = 'Q';
    value = 9;
    icon = '♛';
    constructor(color, currentSquare) {
        super(color, currentSquare);
        this.textContent = this.icon;
    }
}
class Rook extends Piece {
    symbol = 'R';
    value = 5;
    icon = '♜';
    constructor(color, currentSquare) {
        super(color, currentSquare);
        this.textContent = this.icon;
    }
    updateLegalMoves() {
    }
}
class Bishop extends Piece {
    symbol = 'B';
    value = 3;
    icon = '♝';
    constructor(color, currentSquare) {
        super(color, currentSquare);
        this.textContent = this.icon;
    }
}
class Knight extends Piece {
    symbol = 'N';
    value = 3;
    icon = '♞';
    constructor(color, currentSquare) {
        super(color, currentSquare);
        this.textContent = this.icon;
    }
    isLegalMove(coordinate) {
        const pieceAtCoordinate = getPieceByCoordinate(coordinate);
        if (pieceAtCoordinate && pieceAtCoordinate.color === this.color)
            return false;
        const moveSet = new Set();
        const upLeft = getAdjacentCoordinate(this.currentCoordinate, 'upleft');
        const upTwoLeftOne = upLeft && getAdjacentCoordinate(upLeft, 'up');
        upTwoLeftOne && moveSet.add(upTwoLeftOne);
        const upRight = getAdjacentCoordinate(this.currentCoordinate, 'upright');
        const upTwoRightOne = upRight && getAdjacentCoordinate(upRight, 'up');
        upTwoRightOne && moveSet.add(upTwoRightOne);
        const right = getAdjacentCoordinate(this.currentCoordinate, 'right');
        const rightTwoUpOne = right && getAdjacentCoordinate(right, 'upright');
        rightTwoUpOne && moveSet.add(rightTwoUpOne);
        const rightTwoDownOne = right && getAdjacentCoordinate(right, 'downright');
        rightTwoDownOne && moveSet.add(rightTwoDownOne);
        const downRight = getAdjacentCoordinate(this.currentCoordinate, 'downright');
        const downTwoRightOne = downRight && getAdjacentCoordinate(downRight, 'down');
        downTwoRightOne && moveSet.add(downTwoRightOne);
        const downLeft = getAdjacentCoordinate(this.currentCoordinate, 'downleft');
        const downTwoLeftOne = downLeft && getAdjacentCoordinate(downLeft, 'down');
        downTwoLeftOne && moveSet.add(downTwoLeftOne);
        const left = getAdjacentCoordinate(this.currentCoordinate, 'left');
        const leftTwoUpOne = left && getAdjacentCoordinate(left, 'upleft');
        leftTwoUpOne && moveSet.add(leftTwoUpOne);
        const leftTwoDownOne = left && getAdjacentCoordinate(left, 'downleft');
        leftTwoDownOne && moveSet.add(leftTwoDownOne);
        if (!moveSet.has(coordinate))
            return false;
        return true;
    }
}
class Pawn extends Piece {
    symbol = null;
    value = 1;
    icon = '♟';
    constructor(color, coordinate) {
        super(color, coordinate);
        this.textContent = this.icon;
    }
    isLegalMove(coordinate) {
        const pieceAtCoordinate = getPieceByCoordinate(coordinate);
        if (pieceAtCoordinate && pieceAtCoordinate.color === this.color)
            return false;
        const moveSet = new Set();
        if (this.color === 'white') {
            const up = getAdjacentCoordinate(this.currentCoordinate, 'up');
            if (up)
                moveSet.add(up);
            if (up && !this.hasMoved) {
                const upTwo = getAdjacentCoordinate(up, 'up');
                if (upTwo && areTwoCoordinatesConnecting(this.currentCoordinate, upTwo))
                    moveSet.add(upTwo);
            }
        }
        if (this.color === 'black') {
            const down = getAdjacentCoordinate(this.currentCoordinate, 'down');
            if (down)
                moveSet.add(down);
            if (down && !this.hasMoved) {
                const downTwo = getAdjacentCoordinate(down, 'down');
                if (downTwo && areTwoCoordinatesConnecting(this.currentCoordinate, downTwo))
                    moveSet.add(downTwo);
            }
        }
        if (moveSet.has(coordinate)) {
            const pieceAtCoordinate = getPieceByCoordinate(coordinate);
            if (!pieceAtCoordinate)
                return true;
            return true;
        }
        return moveSet.has(coordinate);
    }
    promote() {
    }
}
class Square extends HTMLElement {
    coordinate;
    constructor(coordinate) {
        super();
        this.coordinate = coordinate;
        this.dataset.coordinate = coordinate;
    }
    get piece() {
        return this.firstElementChild ?? null;
    }
    clear() {
        this.replaceChildren();
    }
}
customElements.define('sw-king', King);
customElements.define('sw-queen', Queen);
customElements.define('sw-rook', Rook);
customElements.define('sw-bishop', Bishop);
customElements.define('sw-knight', Knight);
customElements.define('sw-pawn', Pawn);
customElements.define('sw-square', Square);
const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
const squareMap = new Map();
const getPieceByCoordinate = (coordinate) => squareMap.get(coordinate)?.piece ?? null;
const board = document.createElement('div');
board.className = 'board';
/**
 * Determine if two coordinates are in a straight line and there's nothing blocking between them
 */
const areTwoCoordinatesConnecting = (a, b) => {
    return true;
};
const getAdjacentCoordinate = (startCoordinate, direction) => {
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
};
for (const rank of ranks) {
    for (const file of files) {
        const square = new Square(`${file}${rank}`);
        squareMap.set(`${file}${rank}`, square);
        board.append(square);
    }
}
const remainingPieces = new Set();
remainingPieces.add(new Rook('white', 'a1'));
remainingPieces.add(new Knight('white', 'b1'));
remainingPieces.add(new Bishop('white', 'c1'));
remainingPieces.add(new Queen('white', 'd1'));
remainingPieces.add(new King('white', 'e1'));
remainingPieces.add(new Bishop('white', 'f1'));
remainingPieces.add(new Knight('white', 'g1'));
remainingPieces.add(new Rook('white', 'h1'));
remainingPieces.add(new Rook('black', 'a8'));
remainingPieces.add(new Knight('black', 'b8'));
remainingPieces.add(new Bishop('black', 'c8'));
remainingPieces.add(new Queen('black', 'd8'));
remainingPieces.add(new King('black', 'e8'));
remainingPieces.add(new Bishop('black', 'f8'));
remainingPieces.add(new Knight('black', 'g8'));
remainingPieces.add(new Rook('black', 'h8'));
for (const file of files) {
    remainingPieces.add(new Pawn('white', `${file}2`));
    remainingPieces.add(new Pawn('black', `${file}7`));
}
const isCoordinateAttacked = (coordinate, attackingColor) => {
    for (const piece of remainingPieces) {
    }
};
document.body.replaceChildren(board);
