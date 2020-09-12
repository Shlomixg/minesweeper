'use strict';

/* --- Global Variables --- */

var MINE_IMG = '<img class="mine" src="img/mine.png" />';
var MINE_EXPLODED_IMG = '<img class="mine" src="img/mine-exploded.png" />';
var NOT_MINE_IMG = '<img class="mine" src="img/not-mine.png" />';
var FLAG_IMG = '<img class="flag" src="img/flag.png" />';

var STATUS_OK_IMG = '<img src="img/ok.png" />';
var STATUS_LOST_IMG = '<img src="img/lost.png" />';
var STATUS_WON_IMG = '<img src="img/won.png" />';

var gBoard = [];
var gLevel = { SIZE: 6, MINES: null, LEVEL: 2 };
var gState;
var gMinesCoor = [];
var gStartTime;
var gTimer;

var gElTimer = document.querySelector('.timer');

/* --- Functions --- */

/**
 * Init the game: creating board according to user pick
 * @param {int} size
 */
function initGame(size) {
  if (size === undefined) size = gLevel.SIZE;
  let MinesCount = 0;
  if (size === 4) MinesCount = getRandomInteger(1, 4);
  if (size === 6) MinesCount = getRandomInteger(4, 8);
  if (size === 8) MinesCount = getRandomInteger(10, 16);
  if (size === 12) MinesCount = getRandomInteger(24, 32);
  if (size === 16) MinesCount = getRandomInteger(90, 100);
  if (size === 20) MinesCount = 160;

  gLevel = { SIZE: size, MINES: MinesCount };
  gMinesCoor = [];
  gStartTime = 0;
  clearInterval(gTimer);
  gState = { isGameOn: false, shownCount: 0, markedCount: 0, secsPassed: 0 };

  gBoard = buildBoard();
  renderBoard(gBoard);

  // Reset the indicators for the player
  let elStatus = document.querySelector('.emoji-status');
  elStatus.innerHTML = STATUS_OK_IMG;

  let elMinesCount = document.querySelector('.mines-counter');
  let minesCount = gLevel.MINES - gState.markedCount;
  elMinesCount.textContent = minesCount;

  let elTimer = document.querySelector('.timer');
  elTimer.textContent = '000';

  displayLevelRecord();
}

/**
 * Creating the board
 */
// TODO: Improve if else statement
function buildBoard() {
  let boardLength = gLevel.SIZE;
  if (gLevel.SIZE === 16) boardLength = 32;
  else if (gLevel.SIZE === 20) boardLength = 40;
  let board = [];
  for (let i = 0; i < gLevel.SIZE; i++) {
    board[i] = [];
    for (let j = 0; j < boardLength; j++) {
      board[i][j] = { isMined: false, isFlagged: false, isShown: false, nearbyMines: 0 };
    }
  }
  return board;
}

/**
 * Rendering the board
 * @param {array} board
 */
function renderBoard(board) {
  let strHTML = '';
  for (let i = 0; i < gLevel.SIZE; i++) {
    strHTML += '<tr>\n';
    for (let j = 0; j < board[i].length; j++) {
      let cellClass = getClassName({ i: i, j: j });
      strHTML += `\t<td class="cell ${cellClass}" onclick="cellClicked(this, ${i} , ${j})"`;
      strHTML += `oncontextmenu="cellMarked(this, ${i} , ${j}); return false;">\n`;
      strHTML += '\t</td>\n';
    }
    strHTML += '</tr>\n';
  }
  let elBoard = document.querySelector('.board');
  elBoard.innerHTML = strHTML;
}

/**
 * Clicking on specific cell
 * @param {Element} elCell
 * @param {int} i
 * @param {int} j
 */
function cellClicked(elCell, i, j) {
  if (!gState.isGameOn && gState.shownCount === 0 && gState.markedCount === 0)
    firstClicked(gBoard, i, j);
  if (!gState.isGameOn || gBoard[i][j].isFlagged) return;

  if (gBoard[i][j].isMined) {
    gState.isGameOn = false;
    let elStatus = document.querySelector('.emoji-status');
    elStatus.innerHTML = STATUS_LOST_IMG;
    showMines(gBoard, i, j);
    return;
  } else if (!gBoard[i][j].isShown) {
    gBoard[i][j].isShown = true;
    gState.shownCount++;
    elCell.classList.add('shownCell');
    if (gBoard[i][j].nearbyMines !== 0) {
      elCell.innerHTML = `<img class="count-mines" src="img/${gBoard[i][j].nearbyMines}.png" />`;
      checkGameOver();
      return;
    }
    expandShown(gBoard, i, j);
    checkGameOver();
  }
}

/**
 * First click - trigger the game start and then place the mines
 * This is to avoid from clicking on mine on the first click
 * @param {array} board
 * @param {int} i
 * @param {int} j
 */
function firstClicked(board, i, j) {
  putMines(board, i, j);
  setMinesNegsCount(board);
  gState.isGameOn = true;
  gStartTime = Date.now();
  gTimer = setInterval(setTimer, 1000);
}

/**
 * Counts the neighbours which mined and set number to every cell
 * @param {array} board
 */
function setMinesNegsCount(board) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      let currCell = board[i][j];
      currCell.nearbyMines = countMines(board, i, j);
    }
  }
}

/**
 * Counts mines around specific cell
 * @param {array} board
 * @param {int} cellRow
 * @param {*int} cellCol
 */
function countMines(board, cellRow, cellCol) {
  let count = 0;
  for (let i = cellRow - 1; i < cellRow + 2; i++) {
    for (let j = cellCol - 1; j < cellCol + 2; j++) {
      if (i < 0 || i > board.length - 1) break;
      if ((i === cellRow && j === cellCol) || j < 0 || j > board[i].length - 1) continue;
      if (board[i][j].isMined) count++;
    }
  }
  return count;
}

/**
 *
 * @param {array} board
 * @param {int} i
 * @param {int} j
 */
function expandShown(board, i, j) {
  if (i < 0 || i > board.length - 1 || j < 0 || j > board[i].length - 1) return;

  for (let row = i - 1; row < i + 2; row++) {
    if (row >= board.length || row < 0) continue;
    for (let col = j - 1; col < j + 2; col++) {
      if (col >= board[row].length || col < 0 || board[row][col].isShown) continue;
      let currCell = board[row][col];
      if (currCell.isFlagged) continue;
      currCell.isShown = true;
      let elCurrCell = document.querySelector('.' + getClassName({ i: row, j: col }));
      elCurrCell.classList.add('shownCell');
      if (currCell.nearbyMines === 0) {
        gState.shownCount++;
        expandShown(board, row, col);
      }
      if (currCell.nearbyMines > 0) {
        elCurrCell.innerHTML = `<img class="count-mines" src="img/${currCell.nearbyMines}.png" />`;
        gState.shownCount++;
      }
    }
  }
}

/**
 * Flagging Cell
 * @param {Element} elCell
 * @param {int} i
 * @param {int} j
 */
function cellMarked(elCell, i, j) {
  if (!gState.isGameOn || gBoard[i][j].isShown) return;

  // Marking \ Unmarking flag
  if (gBoard[i][j].isFlagged) {
    elCell.innerHTML = '';
    gState.markedCount--;
  } else {
    elCell.innerHTML = FLAG_IMG;
    gState.markedCount++;
  }
  gBoard[i][j].isFlagged = !gBoard[i][j].isFlagged;

  let elMinesCount = document.querySelector('.mines-counter');
  elMinesCount.textContent = gLevel.MINES - gState.markedCount;
  checkGameOver();
}

/**
 * Checking if the game is over (all cells clicked & all mines flagged).
 * If so, then show the time & change the icon
 */
function checkGameOver() {
  if (checkCellsClicked() && checkMinesFlagged()) {
    gState.isGameOn = false;
    let elStatus = document.querySelector('.emoji-status');
    elStatus.innerHTML = STATUS_WON_IMG;
    displayLevelRecord();
    return true;
  }
}

/**
 * Checking if all mines are flagged
 */
function checkMinesFlagged() {
  for (let i = 0; i < gLevel.MINES; i++) {
    let row = gMinesCoor[i].i;
    let col = gMinesCoor[i].j;
    if (!gBoard[row][col].isFlagged) return false;
  }
  return true;
}

/**
 * Checking if all the empty cells are clicked
 */
function checkCellsClicked() {
  if (gState.shownCount < gBoard.length * gBoard[0].length - gLevel.MINES) return false;
  return true;
}

/**
 * Show all the mines in the board
 * @param {array} board
 * @param {int} row
 * @param {int} col
 */
function showMines(board, row, col) {
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j].isMined && !board[i][j].isFlagged) {
        let IMG = i === row && j === col ? MINE_EXPLODED_IMG : MINE_IMG;
        renderCell({ i: i, j: j }, IMG);
      } else if (!board[i][j].isMined && board[i][j].isFlagged) {
        renderCell({ i: i, j: j }, NOT_MINE_IMG);
      }
    }
  }
}

// Showing mines while game is on for debugging purpose
document.addEventListener('keydown', function (event) {
  if (event.keyCode == 83) {
    showMines(gBoard, -1, -1);
  }
});

/**
 * Convert a location object {i, j} to a selector and render a value in that element
 * @param {*} location
 * @param {*} value
 */
function renderCell(location, value) {
  let cellSelector = '.' + getClassName(location);
  let elCell = document.querySelector(cellSelector);
  elCell.innerHTML = value;
}

/**
 * Returns the class name for a specific cell
 * @param {*} location
 */
function getClassName(location) {
  let cellClass = 'cell-' + location.i + '-' + location.j;
  return cellClass;
}

/**
 * Add mine to random cell, excluding the first clicked cell
 * @param {array} board
 * @param {int} currRow
 * @param {int} currCol
 */
function putMines(board, currRow, currCol) {
  for (let idx = 0; idx < gLevel.MINES; idx++) {
    let cell = getRandomCell(board, currRow, currCol);
    let i = cell.i;
    let j = cell.j;
    let targetCell = gBoard[i][j];
    targetCell.isMined = true;
    gMinesCoor.push({ i: i, j: j });
  }
}

/**
 * Returns location of random empty cell
 * @param {array} board
 * @param {int} currRow
 * @param {int} currCol
 */
function getRandomCell(board, currRow, currCol) {
  let i = getRandomInteger(0, board.length - 1);
  let j = getRandomInteger(0, board[0].length - 1);
  let targetCell = board[i][j];
  while (targetCell.isMined || (i === currRow && j === currCol)) {
    i = getRandomInteger(0, gBoard.length - 1);
    j = getRandomInteger(0, gBoard.length - 1);
    targetCell = gBoard[i][j];
  }
  return { i: i, j: j };
}

function setTimer() {
  if (gState.isGameOn) {
    gState.secsPassed = Math.floor((Date.now() - gStartTime) / 1000);
    gElTimer.textContent = gState.secsPassed;
  } else clearInterval(gTimer);
}

// TODO: Improve the code - remove duplicates. loop? localStorage array?
function displayLevelRecord() {
  let elRecord = document.querySelector('.record-time');
  if (gState.secsPassed !== 0) {
    if (gLevel.SIZE === 4) {
      if (gState.secsPassed < localStorage.bestTime1 || localStorage.bestTime1 === undefined) {
        localStorage.bestTime1 = gState.secsPassed;
        elRecord.textContent = `Your time record is ${localStorage.bestTime1} seconds`;
      }
    } else if (gLevel.SIZE === 6) {
      if (gState.secsPassed < localStorage.bestTime2 || localStorage.bestTime2 === undefined) {
        localStorage.bestTime2 = gState.secsPassed;
        elRecord.textContent = `Your record is ${localStorage.bestTime2} seconds`;
      }
    } else if (gLevel.SIZE === 8) {
      if (gState.secsPassed < localStorage.bestTime3 || localStorage.bestTime3 === undefined) {
        localStorage.bestTime3 = gState.secsPassed;
        elRecord.textContent = `Your record is ${localStorage.bestTime3} seconds`;
      }
    } else if (gLevel.SIZE === 12) {
      if (gState.secsPassed < localStorage.bestTime4 || localStorage.bestTime4 === undefined) {
        localStorage.bestTime4 = gState.secsPassed;
        elRecord.textContent = `Your record is ${localStorage.bestTime4} seconds`;
      }
    } else if (gLevel.SIZE === 16) {
      if (gState.secsPassed < localStorage.bestTime5 || localStorage.bestTime5 === undefined) {
        localStorage.bestTime5 = gState.secsPassed;
        elRecord.textContent = `Your record is ${localStorage.bestTime5} seconds`;
      }
    } else if (gLevel.SIZE === 20) {
      if (gState.secsPassed < localStorage.bestTime6 || localStorage.bestTime6 === undefined) {
        localStorage.bestTime6 = gState.secsPassed;
        elRecord.textContent = `Your record is ${localStorage.bestTime6} seconds`;
      }
    }
  } else {
    if (gLevel.SIZE === 4) {
      if (localStorage.bestTime1 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime1} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    } else if (gLevel.SIZE === 6) {
      if (localStorage.bestTime2 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime2} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    } else if (gLevel.SIZE === 8) {
      if (localStorage.bestTime3 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime3} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    } else if (gLevel.SIZE === 12) {
      if (localStorage.bestTime4 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime4} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    } else if (gLevel.SIZE === 16) {
      if (localStorage.bestTime5 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime5} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    } else if (gLevel.SIZE === 20) {
      if (localStorage.bestTime6 !== undefined) {
        elRecord.textContent = `Your time record is ${localStorage.bestTime6} seconds`;
      } else elRecord.textContent = `No record! Try to set one`;
    }
  }
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}
