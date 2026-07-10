import Sprite from 'openfl/display/Sprite';
import MouseEvent from 'openfl/events/MouseEvent';
import Player from './Player';
import Tile from './Tile';

class Main extends Sprite {
  private static readonly WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  private readonly tiles: Tile[] = [];
  private turn = 0;
  private winner = false;

  public constructor() {
    super();

    const board = new Sprite();
    board.graphics.lineStyle(4, 0x000000);
    board.graphics.moveTo(50, 0);
    board.graphics.lineTo(50, 150);
    board.graphics.moveTo(100, 0);
    board.graphics.lineTo(100, 150);
    board.graphics.moveTo(0, 50);
    board.graphics.lineTo(150, 50);
    board.graphics.moveTo(0, 100);
    board.graphics.lineTo(150, 100);
    board.x = 10;
    board.y = 10;
    this.addChild(board);

    let currentX = 0;
    let currentY = 0;

    for (let i = 0; i < 9; i++) {
      const tile = new Tile();
      tile.x = currentX * 50;
      tile.y = currentY * 50;
      tile.addEventListener(MouseEvent.MOUSE_DOWN, this.tile_onClick);
      board.addChild(tile);
      this.tiles.push(tile);
      currentX++;

      if (currentX > 2) {
        currentX = 0;
        currentY++;
      }
    }
  }

  private checkWinner(): void {
    for (const [a, b, c] of Main.WINNING_LINES) {
      const tileA = this.tiles[a]!;
      const tileB = this.tiles[b]!;
      const tileC = this.tiles[c]!;

      if (tileA.player !== null && tileA.player === tileB.player && tileA.player === tileC.player) {
        this.winner = true;
        tileA.winner = true;
        tileB.winner = true;
        tileC.winner = true;
        break;
      }
    }
  }

  private resetBoard(): void {
    for (const tile of this.tiles) {
      tile.player = null;
      tile.winner = false;
    }

    this.turn = 0;
    this.winner = false;
  }

  private tile_onClick = (event: MouseEvent): void => {
    if (this.winner) {
      this.resetBoard();
      return;
    }

    const tile = event.currentTarget as Tile;
    if (tile.player !== null) {
      return;
    }

    tile.player = this.turn % 2 === 0 ? Player.X : Player.O;
    this.turn++;
    this.checkWinner();
  };
}

export default Main;
