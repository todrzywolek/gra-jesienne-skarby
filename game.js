// Game state
let ballPosition = 0; // 0, 1, or 2 - tracks which cup (by current DOM position) has the ball
let isShuffling = false;
let canGuess = false;
let shuffleInterval = null;
let shuffleCount = 0;
let isSwapping = false; // Flag to prevent overlapping swaps
const maxShuffles = 8; // Number of shuffles for kids (slow enough to follow)

// Get DOM elements
const cupsContainer = document.getElementById('cupsContainer');
const playButton = document.getElementById('playButton');
const instructionText = document.getElementById('instructionText');
const resultModal = document.getElementById('resultModal');
const resultTitle = document.getElementById('resultTitle');
const resultMessage = document.getElementById('resultMessage');

// Initialize cups
const cups = Array.from(document.querySelectorAll('.cup'));
const balls = Array.from(document.querySelectorAll('.ball'));

// Function to swap two cups visually
const swapCups = (index1, index2) => {
    // Prevent overlapping swaps
    if (isSwapping) return;
    
    const currentCups = Array.from(cupsContainer.querySelectorAll('.cup'));
    const cup1 = currentCups[index1];
    const cup2 = currentCups[index2];

    if (!cup1 || !cup2 || cup1 === cup2) return;

    isSwapping = true;

    // Reset any existing transforms first to get accurate positions
    cup1.style.transform = '';
    cup2.style.transform = '';
    cup1.classList.remove('shuffling');
    cup2.classList.remove('shuffling');
    
    // Force a reflow to ensure transforms are reset
    void cup1.offsetHeight;
    void cup2.offsetHeight;

    // Get positions relative to container
    const containerRect = cupsContainer.getBoundingClientRect();
    const rect1 = cup1.getBoundingClientRect();
    const rect2 = cup2.getBoundingClientRect();

    // Calculate positions relative to container
    const x1 = rect1.left - containerRect.left + rect1.width / 2;
    const y1 = rect1.top - containerRect.top + rect1.height / 2;
    const x2 = rect2.left - containerRect.left + rect2.width / 2;
    const y2 = rect2.top - containerRect.top + rect2.height / 2;

    // Calculate distances
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;

    // Add shuffling class
    cup1.classList.add('shuffling');
    cup2.classList.add('shuffling');

    // Animate swap
    cup1.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    cup2.style.transform = `translate(${-deltaX}px, ${-deltaY}px)`;

    // After animation, swap in DOM and reset transforms
    setTimeout(() => {
        // Swap positions in DOM
        const parent = cupsContainer;
        const next1 = cup1.nextSibling;
        const next2 = cup2.nextSibling;

        if (next1 === cup2) {
            parent.insertBefore(cup2, cup1);
        } else if (next2 === cup1) {
            parent.insertBefore(cup1, cup2);
        } else {
            parent.insertBefore(cup2, next1);
            parent.insertBefore(cup1, next2);
        }

        // Reset transforms
        cup1.style.transform = '';
        cup2.style.transform = '';
        cup1.classList.remove('shuffling');
        cup2.classList.remove('shuffling');

        // Update cup indices
        updateCupIndices();
        
        // Allow next swap
        isSwapping = false;
    }, 800); // Match CSS transition duration
};

// Function to shuffle cups
const shuffleCups = () => {
    if (shuffleCount >= maxShuffles) {
        stopShuffling();
        return;
    }
    
    // Wait if a swap is in progress
    if (isSwapping) {
        // Retry after a short delay
        setTimeout(() => shuffleCups(), 100);
        return;
    }
    
    // Randomly choose two cups to swap (from current DOM order)
    const indices = [0, 1, 2];
    const shuffled = indices.sort(() => Math.random() - 0.5);
    const index1 = shuffled[0];
    const index2 = shuffled[1];
    
    // Update ball position: if ball is under one of the swapped cups, it moves to the other position
    if (ballPosition === index1) {
        ballPosition = index2;
    } else if (ballPosition === index2) {
        ballPosition = index1;
    }
    // If ball is at the third position, it stays there
    
    // Swap cups visually
    swapCups(index1, index2);
    
    shuffleCount++;
};

// Function to start shuffling
const startShuffling = () => {
    isShuffling = true;
    shuffleCount = 0;
    canGuess = false;
    playButton.disabled = true;
    instructionText.textContent = 'Obserwuj kubki uważnie...';
    
    // Hide all balls
    balls.forEach(ball => {
        ball.classList.remove('visible');
    });
    
    // Start shuffling with slower interval for kids (1200ms = 1.2 seconds)
    shuffleInterval = setInterval(() => {
        shuffleCups();
    }, 1200);
};

// Function to stop shuffling
const stopShuffling = () => {
    if (shuffleInterval) {
        clearInterval(shuffleInterval);
        shuffleInterval = null;
    }
    
    isShuffling = false;
    canGuess = true;
    playButton.disabled = false;
    playButton.textContent = 'Zagraj ponownie';
    instructionText.textContent = 'Który kubek ukrywa świąteczną kulkę? Kliknij!';
    
    // Update cup indices after DOM changes
    setTimeout(() => {
        updateCupIndices();
    }, 100);
};

// Update cup indices after DOM reordering
const updateCupIndices = () => {
    const currentCups = Array.from(cupsContainer.querySelectorAll('.cup'));
    currentCups.forEach((cup, index) => {
        cup.dataset.index = index;
    });
};

// Function to handle cup click
const handleCupClick = (event) => {
    if (!canGuess || isShuffling) return;
    
    const clickedCup = event.currentTarget;
    const clickedIndex = parseInt(clickedCup.dataset.index);
    
    // Disable all cups
    canGuess = false;
    cups.forEach(cup => {
        cup.style.pointerEvents = 'none';
    });
    
    // Show the result
    setTimeout(() => {
        // Show the ball under the correct cup
        const currentCups = Array.from(cupsContainer.querySelectorAll('.cup'));
        const correctCup = currentCups[ballPosition];
        if (correctCup) {
            const correctBall = correctCup.querySelector('.ball');
            if (correctBall) {
                correctBall.classList.add('visible');
            }
        }
        
        // Check if correct
        if (clickedIndex === ballPosition) {
            // Win!
            resultTitle.textContent = '🎉 Gratulacje! 🎉';
            resultMessage.textContent = 'Znalazłeś świąteczną kulkę!';
            resultModal.style.display = 'flex';
            clickedCup.classList.add('selected');
        } else {
            // Lose - show all balls briefly
            balls.forEach(ball => {
                ball.classList.add('visible');
            });
            resultTitle.textContent = '😊 Spróbuj ponownie!';
            resultMessage.textContent = `Kulka była pod innym kubkiem. Zagraj jeszcze raz!`;
            resultModal.style.display = 'flex';
        }
    }, 500);
};

// Function to start/reset game
const startGame = () => {
    // Hide modal
    resultModal.style.display = 'none';
    
    // Reset state
    ballPosition = Math.floor(Math.random() * 3);
    isShuffling = false;
    canGuess = false;
    shuffleCount = 0;
    
    // Reset UI
    playButton.textContent = 'Mieszam kubki...';
    playButton.disabled = true;
    instructionText.textContent = 'Przygotowuję grę...';
    
    // Reset cup styles
    isSwapping = false; // Reset swap flag
    cups.forEach(cup => {
        cup.style.pointerEvents = 'auto';
        cup.style.transform = '';
        cup.classList.remove('selected', 'shuffling');
    });
    
    // Force a reflow to ensure all transforms are reset
    void cupsContainer.offsetHeight;
    
    // Reset ball positions - hide all balls
    balls.forEach(ball => {
        ball.classList.remove('visible');
    });
    
    // Reset DOM order
    cupsContainer.innerHTML = '';
    cups.forEach((cup, index) => {
        cup.dataset.index = index;
        cupsContainer.appendChild(cup);
    });
    
    // Show ball briefly before starting
    setTimeout(() => {
        const currentCups = Array.from(cupsContainer.querySelectorAll('.cup'));
        const cupWithBall = currentCups[ballPosition];
        if (cupWithBall) {
            const ballToShow = cupWithBall.querySelector('.ball');
            if (ballToShow) {
                ballToShow.classList.add('visible');
            }
        }
        instructionText.textContent = 'Obserwuj, gdzie jest kulka!';
        
        setTimeout(() => {
            balls.forEach(ball => ball.classList.remove('visible'));
            startShuffling();
        }, 2000); // Show for 2 seconds
    }, 500);
};

// Function to reset game (called from modal)
const resetGame = () => {
    startGame();
};

// Add click event listeners to cups
cups.forEach(cup => {
    cup.addEventListener('click', handleCupClick);
});

// Initialize game on page load
window.addEventListener('DOMContentLoaded', () => {
    // Don't auto-start, wait for button click
    playButton.textContent = 'Zagraj';
    instructionText.textContent = 'Kliknij "Zagraj" aby rozpocząć!';
    
    // Show initial ball position briefly
    setTimeout(() => {
        const currentCups = Array.from(cupsContainer.querySelectorAll('.cup'));
        const cupWithBall = currentCups[ballPosition];
        if (cupWithBall) {
            const ballToShow = cupWithBall.querySelector('.ball');
            if (ballToShow) {
                ballToShow.classList.add('visible');
                setTimeout(() => {
                    ballToShow.classList.remove('visible');
                }, 1500);
            }
        }
    }, 500);
});
