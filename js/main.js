'use strict';

/* --- Global Variables --- */

var MINE_IMG = '<img class="mine" src="img/mine.png" />'
var MINE_EXPLODED_IMG = '<img class="mine" src="img/mine-exploded.png" />'
var NOT_MINE_IMG = '<img class="mine" src="img/not-mine.png" />'
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

function initGame(size) {
	if (size === undefined) size = gLevel.SIZE;
	var MinesCount = 0;
	if (size === 4) MinesCount = getRandomInteger(1, 4);
	if (size === 6) MinesCount = getRandomInteger(3, 7);
	if (size === 8) MinesCount = getRandomInteger(13, 17);
	if (size === 12) MinesCount = getRandomInteger(20, 24);
	if (size === 16) MinesCount = getRandomInteger(97, 101);

	gLevel = { SIZE: size, MINES: MinesCount };
	gMinesCoor = [];
	gStartTime = 0;
	clearInterval(gTimer);
	gState = { isGameOn: false, shownCount: 0, markedCount: 0, secsPassed: 0 };

	gBoard = buildBoard();
	renderBoard(gBoard);

	// Reset the indicators for the player
	var elStatus = document.querySelector('.emoji-status');
	elStatus.innerHTML = STATUS_OK_IMG;

	var elMinesCount = document.querySelector('.mines-counter');
	var minesCount = gLevel.MINES - gState.markedCount;
	elMinesCount.textContent = minesCount;

	var elTimer = document.querySelector('.timer');
	elTimer.textContent = '000';

	displayLevelRecord();
}

function buildBoard() {
	var boardLength = (gLevel.SIZE === 16) ? 30 : gLevel.SIZE;
	var board = [];
	for (var i = 0; i < gLevel.SIZE; i++) {
		board[i] = [];
		for (var j = 0; j < boardLength; j++) {
			board[i][j] = { isMined: false, isFlagged: false, isShown: false, nearbyMines: 0 };
		}
	}
	return board;
}

function renderBoard(board) {
	var strHTML = '';
	for (var i = 0; i < gLevel.SIZE; i++) {
		strHTML += '<tr>\n';
		for (var j = 0; j < board[i].length; j++) {
			var currCell = board[i][j];
			var cellClass = getClassName({ i: i, j: j })
			strHTML += `\t<td class="cell ${cellClass}" onclick="cellClicked(this, ${i} , ${j})"`
			strHTML += `oncontextmenu="cellMarked(this, ${i} , ${j}); return false;">\n`;
			strHTML += '\t</td>\n';
		}
		strHTML += '</tr>\n';
	}
	var elBoard = document.querySelector('.board');
	elBoard.innerHTML = strHTML;
}

function cellClicked(elCell, i, j) {
	if (!gState.isGameOn && gState.shownCount === 0 && gState.markedCount === 0) firstClicked(gBoard, i, j);
	if (!gState.isGameOn || gBoard[i][j].isFlagged) return;

	if (gBoard[i][j].isMined) {
		gState.isGameOn = false;
		var elStatus = document.querySelector('.emoji-status');
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

function firstClicked(board, i, j) {
	putMines(board, i, j);
	setMinesNegsCount(board);
	gState.isGameOn = true;
	gStartTime = Date.now();
	gTimer = setInterval(setTimer, 1000);
}

// Counts the neighbours which mined and set number to every cell
function setMinesNegsCount(board) {
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			var currCell = board[i][j];
			currCell.nearbyMines = countMines(board, i, j);
		}
	}
}

// Counts mines around specific cell
function countMines(board, cellRow, cellCol) {
	var count = 0;
	for (var i = cellRow - 1; i < cellRow + 2; i++) {
		for (var j = cellCol - 1; j < cellCol + 2; j++) {
			if (i < 0 || i > board.length - 1) break;
			if (i === cellRow && j === cellCol || j < 0 || j > board[i].length - 1) continue;
			if (board[i][j].isMined) count++;
		}
	}
	return count;
}

function expandShown(board, i, j) {
	if (i < 0 || i > board.length - 1 || j < 0 || j > board[i].length - 1) return;

	for (var row = i - 1; row < i + 2; row++) {
		if (row >= board.length || row < 0) continue;
		for (var col = j - 1; col < j + 2; col++) {
			if (col >= board[row].length || col < 0 || board[row][col].isShown) continue;
			var currCell = board[row][col];
			if (currCell.isFlagged) continue;
			currCell.isShown = true;
			var elCurrCell = document.querySelector('.' + getClassName({ i: row, j: col }));
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

function cellMarked(elCell, i, j) {
	if (!gState.isGameOn || gBoard[i][j].isShown) return;

	// Marking \ Unmarking flag
	if (gBoard[i][j].isFlagged) {
		elCell.innerHTML = '';
		gState.markedCount--;
	}
	else {
		elCell.innerHTML = FLAG_IMG;
		gState.markedCount++;
	}
	gBoard[i][j].isFlagged = !gBoard[i][j].isFlagged;

	var elMinesCount = document.querySelector('.mines-counter');
	elMinesCount.textContent = (gLevel.MINES - gState.markedCount);
	checkGameOver();
}

function checkGameOver() {
	if (checkCellsClicked() && checkMinesFlagged()) {
		gState.isGameOn = false;
		var elStatus = document.querySelector('.emoji-status');
		elStatus.innerHTML = STATUS_WON_IMG;
		displayLevelRecord();
		return true;
	}
}

function checkMinesFlagged() {
	for (var i = 0; i < gLevel.MINES; i++) {
		var row = gMinesCoor[i].i;
		var col = gMinesCoor[i].j;
		if (!gBoard[row][col].isFlagged) return false;
	}
	return true;
}

function checkCellsClicked() {
	if (gState.shownCount < (gBoard.length * gBoard[0].length - gLevel.MINES)) return false;
	return true;
}

function showMines(board, row, col) {
	for (var i = 0; i < board.length; i++) {
		for (var j = 0; j < board[i].length; j++) {
			if (board[i][j].isMined && !board[i][j].isFlagged) {
				var IMG = (i === row && j === col) ? MINE_EXPLODED_IMG : MINE_IMG;
				renderCell({ i: i, j: j }, IMG);
			} else if (!board[i][j].isMined && board[i][j].isFlagged) {
				renderCell({ i: i, j: j }, NOT_MINE_IMG);
			}
		}
	}
}

// Convert a location object {i, j} to a selector and render a value in that element
function renderCell(location, value) {
	var cellSelector = '.' + getClassName(location)
	var elCell = document.querySelector(cellSelector);
	elCell.innerHTML = value;
}

// Returns the class name for a specific cell
function getClassName(location) {
	var cellClass = 'cell-' + location.i + '-' + location.j;
	return cellClass;
}

// Add mine to random cell, excluding the first clicked cell
function putMines(board, currRow, currCol) {
	for (var idx = 0; idx < gLevel.MINES; idx++) {
		var cell = getRandomCell(board, currRow, currCol);
		var i = cell.i;
		var j = cell.j;
		var targetCell = gBoard[i][j];
		targetCell.isMined = true;
		gMinesCoor.push({ i: i, j: j });
	}
}

// Returns location of random empty cell
function getRandomCell(board, currRow, currCol) {
	var i = getRandomInteger(0, board.length - 1);
	var j = getRandomInteger(0, board[0].length - 1);
	var targetCell = board[i][j];
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
	}
	else clearInterval(gTimer);
}


// TODO: Improve the code - remove duplicates. loop? localStorage array?
function displayLevelRecord() {
	var elRecord = document.querySelector('.record-time');
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
		}
	}
}
function getRandomInteger(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}