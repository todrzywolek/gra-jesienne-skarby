// Array of 10 images
const imagePaths = [
  'img/1.png',
  'img/2.png',
  'img/3.png',
  'img/4.png',
  'img/5.png',
  'img/6.png',
  'img/7.png',
  'img/8.png',
  'img/9.png',
  'img/10.png'
];

// Current image source (will be set randomly)
let imageSrc = imagePaths[Math.floor(Math.random() * imagePaths.length)];

// Function to select a new random image
const selectNewRandomImage = () => {
  imageSrc = imagePaths[Math.floor(Math.random() * imagePaths.length)];
};

const gridSize = 3; // 3x3 grid (9 pieces) - perfect for 5-6 year olds
const totalPieces = gridSize * gridSize;

let board = [];
let draggedPiece = null;

const shuffleArray = (array) => {
  const shuffled = [...array];
  return shuffled.sort(() => Math.random() - 0.5);
};

const generateInitialBoard = () => {
  const pieces = Array.from({ length: totalPieces }, (_, index) => index);
  return shuffleArray(pieces);
};

const getPieceStyle = (index) => {
  const pieceValue = board[index];
  const col = pieceValue % gridSize;
  const row = Math.floor(pieceValue / gridSize);
  const backgroundPositionX = col * (100 / (gridSize - 1));
  const backgroundPositionY = row * (100 / (gridSize - 1));

  return {
    backgroundImage: `url(${imageSrc})`,
    backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
    backgroundPosition: `${backgroundPositionX}% ${backgroundPositionY}%`,
  };
};

const isSolved = () => {
  return board.every((value, index) => value === index);
};

const checkWin = () => {
  if (isSolved()) {
    const winModal = document.getElementById('winModal');
    if (winModal) {
      winModal.style.display = 'flex';
    }
  } else {
    const winModal = document.getElementById('winModal');
    if (winModal) {
      winModal.style.display = 'none';
    }
  }
};

const renderBoard = () => {
  const puzzleBoard = document.getElementById('puzzleBoard');
  if (!puzzleBoard) return;

  puzzleBoard.innerHTML = '';

  board.forEach((_, index) => {
    const piece = document.createElement('div');
    piece.className = 'puzzle-piece';
    piece.draggable = true;
    piece.dataset.index = index; // Store index for touch events

    const style = getPieceStyle(index);
    piece.style.backgroundImage = style.backgroundImage;
    piece.style.backgroundSize = style.backgroundSize;
    piece.style.backgroundPosition = style.backgroundPosition;

    // Mouse drag and drop events
    piece.addEventListener('dragstart', (e) => {
      draggedPiece = index;
      e.dataTransfer.effectAllowed = 'move';
      piece.classList.add('touching');
    });

    piece.addEventListener('dragend', () => {
      piece.classList.remove('touching');
    });

    piece.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    piece.addEventListener('drop', (e) => {
      e.preventDefault();
      piece.classList.remove('touching');
      if (draggedPiece !== null && draggedPiece !== index) {
        const newBoard = [...board];
        const temp = newBoard[index];
        newBoard[index] = board[draggedPiece];
        newBoard[draggedPiece] = temp;
        board = newBoard;
        renderBoard();
        checkWin();
      }
      draggedPiece = null;
    });

    // Touch events for tablet
    let touchStartX = 0;
    let touchStartY = 0;

    piece.addEventListener('touchstart', (e) => {
      e.preventDefault();
      draggedPiece = index;
      piece.classList.add('touching');
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }, { passive: false });

    piece.addEventListener('touchmove', (e) => {
      e.preventDefault();
    }, { passive: false });

    piece.addEventListener('touchend', (e) => {
      e.preventDefault();
      piece.classList.remove('touching');
      if (draggedPiece === null) return;

      const touch = e.changedTouches[0];
      const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

      if (elementBelow && elementBelow.classList.contains('puzzle-piece')) {
        const targetIndex = parseInt(elementBelow.dataset.index);
        if (!isNaN(targetIndex) && targetIndex !== index) {
          const newBoard = [...board];
          const temp = newBoard[targetIndex];
          newBoard[targetIndex] = board[draggedPiece];
          newBoard[draggedPiece] = temp;
          board = newBoard;
          renderBoard();
          checkWin();
        }
      }
      draggedPiece = null;
    }, { passive: false });

    puzzleBoard.appendChild(piece);
  });
};

const resetGame = () => {
  // Hide modal if visible
  const winModal = document.getElementById('winModal');
  if (winModal) {
    winModal.style.display = 'none';
  }

  board = generateInitialBoard();
  draggedPiece = null;
  renderBoard();
  checkWin();
};

// Reset game with a new random image
const resetGameWithNewImage = () => {
  selectNewRandomImage();
  updateSourceImage();
  resetGame();
};

// Update the source image in the HTML
const updateSourceImage = () => {
  const sourceImage = document.querySelector('.puzzle-source-image');
  const sourceLink = document.getElementById('sourceImageLink');
  if (sourceImage) {
    sourceImage.src = imageSrc;
    sourceImage.alt = 'Puzzle image';
  }
  if (sourceLink) {
    sourceLink.href = imageSrc;
  }
};

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
  updateSourceImage();
  resetGame();
});

