import {
  addNodeChild,
  appendShapeCircle,
  appendShapeLineStyle,
  appendShapeLineTo,
  appendShapeMoveTo,
  attachPointerInput,
  clearShapeCommands,
  connectSignal,
  createApplication,
  createDisplayObject,
  createInputManager,
  createShape,
  invalidateNodeLocalTransform,
  invalidateNodeRender,
  startApplicationLoop,
} from '@flighthq/sdk';

import { container, render, scale } from './render';

const BOARD_X = 10;
const BOARD_Y = 10;
const CELL_SIZE = 50;
const BOARD_SIZE = CELL_SIZE * 3;
const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

type Player = 'X' | 'O';

const root = createDisplayObject();
root.scaleX = scale;
root.scaleY = scale;

const board = createShape();
appendShapeLineStyle(board, 4, 0x000000);
appendShapeMoveTo(board, 50, 0);
appendShapeLineTo(board, 50, 150);
appendShapeMoveTo(board, 100, 0);
appendShapeLineTo(board, 100, 150);
appendShapeMoveTo(board, 0, 50);
appendShapeLineTo(board, 150, 50);
appendShapeMoveTo(board, 0, 100);
appendShapeLineTo(board, 150, 100);
board.x = BOARD_X;
board.y = BOARD_Y;
invalidateNodeLocalTransform(board);
addNodeChild(root, board);

const tileShapes = Array.from({ length: 9 }, (_, index) => {
  const tile = createShape();
  tile.x = BOARD_X + (index % 3) * CELL_SIZE;
  tile.y = BOARD_Y + Math.floor(index / 3) * CELL_SIZE;
  invalidateNodeLocalTransform(tile);
  addNodeChild(root, tile);
  return tile;
});

const players: Array<Player | null> = Array(9).fill(null);
const winners: boolean[] = Array(9).fill(false);
let turn = 0;
let hasWinner = false;

function redrawTile(index: number): void {
  const tile = tileShapes[index];
  const player = players[index];

  clearShapeCommands(tile);
  if (player === null) {
    invalidateNodeRender(tile);
    return;
  }

  const color = winners[index] ? 0xff9900 : player === 'X' ? 0x990000 : 0x000099;
  appendShapeLineStyle(tile, 12, color);

  if (player === 'X') {
    appendShapeMoveTo(tile, 11, 11);
    appendShapeLineTo(tile, 39, 39);
    appendShapeMoveTo(tile, 11, 39);
    appendShapeLineTo(tile, 39, 11);
  } else {
    appendShapeCircle(tile, 25, 25, 14);
  }

  invalidateNodeRender(tile);
}

function resetBoard(): void {
  players.fill(null);
  winners.fill(false);
  turn = 0;
  hasWinner = false;

  for (let i = 0; i < tileShapes.length; i++) {
    redrawTile(i);
  }
}

function checkWinner(): void {
  for (const [a, b, c] of WINNING_LINES) {
    const player = players[a];
    if (player !== null && player === players[b] && player === players[c]) {
      hasWinner = true;
      winners[a] = true;
      winners[b] = true;
      winners[c] = true;
      redrawTile(a);
      redrawTile(b);
      redrawTile(c);
      break;
    }
  }
}

const input = createInputManager();
attachPointerInput(input, container);
connectSignal(input.onPointerDown, (data) => {
  const x = data.x - BOARD_X;
  const y = data.y - BOARD_Y;
  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) return;

  if (hasWinner) {
    resetBoard();
    return;
  }

  const column = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  const index = row * 3 + column;
  if (players[index] !== null) return;

  players[index] = turn % 2 === 0 ? 'X' : 'O';
  turn++;
  redrawTile(index);
  checkWinner();
});

const app = createApplication();
connectSignal(app.onRender, () => render(root));
startApplicationLoop(app);
