document.addEventListener('DOMContentLoaded', () => {
    // ... (semua variabel 'const' Anda tetap sama) ...
    const boardElement = document.getElementById('game-board');
    const scoreElement = document.getElementById('score');
    const highScoreElement = document.getElementById('high-score');
    const newGameBtn = document.getElementById('new-game-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const closeInstructionsBtn = document.getElementById('close-instructions');
    const instructionsModal = document.getElementById('instructions-modal');
    const gameOverModal = document.getElementById('game-over-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const restartGameBtn = document.getElementById('restart-game-btn');

    // Suara
    const slideSound = document.getElementById('slide-sound');
    const winSound = document.getElementById('win-sound');
    const loseSound = document.getElementById('lose-sound');

    const GRID_SIZE = 4;
    let grid = [];
    let score = 0;
    let highScore = 0;
    let hasWon = false;
    let boardSize = 0;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let isMoving = false; // Kunci untuk animasi

    // Class untuk merepresentasikan setiap Tile
    class Tile {
        constructor(value, r, c) {
            this.value = value;
            this.r = r;
            this.c = c;
            this.domElement = document.createElement('div');
            this.domElement.classList.add('tile');
            this.domElement.textContent = value;
            this.updateDomPosition(); // Ini akan mengatur ukuran dan posisi
            this.updateDomValue();
            boardElement.appendChild(this.domElement);
        }

        // --- FIX ADA DI SINI ---
        // Fungsi ini sekarang juga mengatur LEBAR dan TINGGI
        updateDomPosition() {
            const tileSize = boardSize - 10; // 10 untuk gap (padding 5px di setiap sisi)

            this.domElement.style.width = `${tileSize}px`;
            this.domElement.style.height = `${tileSize}px`;
            this.domElement.style.top = `${this.r * boardSize + 5}px`;
            this.domElement.style.left = `${this.c * boardSize + 5}px`;
        }
        // --- AKHIR FIX ---

        updateDomValue() {
            this.domElement.textContent = this.value;
            this.domElement.className = 'tile'; // Reset class
            this.domElement.classList.add(`tile-${this.value}`);
        }

        removeDom() {
            this.domElement.remove();
        }

        animateSpawn() {
            this.domElement.classList.add('spawn');
            this.domElement.addEventListener('animationend', () => {
                this.domElement.classList.remove('spawn');
            }, { once: true });
        }

        animateMerge() {
            this.domElement.classList.add('merge');
            this.domElement.addEventListener('animationend', () => {
                this.domElement.classList.remove('merge');
            }, { once: true });
        }
    }

    // ... (Sisa kode SAMA PERSIS seperti sebelumnya) ...

    function initGame() {
        const existingTiles = boardElement.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());
        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        score = 0;
        hasWon = false;
        isMoving = false;
        highScore = localStorage.getItem('neon2048HighScore') || 0;
        updateScore(0);
        highScoreElement.textContent = highScore;
        gameOverModal.classList.remove('show');
        drawGridBackground();
        addNewTile();
        addNewTile();
    }

    function drawGridBackground() {
        boardElement.innerHTML = '';
        const boardWidth = boardElement.clientWidth;
        boardSize = boardWidth / GRID_SIZE; // <-- boardSize di-set di sini
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.style.width = `${boardSize - 10}px`;
                cell.style.height = `${boardSize - 10}px`;
                boardElement.appendChild(cell);
            }
        }
    }

    function addNewTile() {
        let emptyCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === null) {
                    emptyCells.push({ r, c });
                }
            }
        }
        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const value = Math.random() < 0.9 ? 2 : 4;
            const newTile = new Tile(value, r, c); // <-- Tile baru akan memanggil updateDomPosition
            grid[r][c] = newTile;
            newTile.animateSpawn();
        }
    }

    function updateScore(newPoints) {
        score += newPoints;
        scoreElement.textContent = score;
        if (score > highScore) {
            highScore = score;
            highScoreElement.textContent = highScore;
            localStorage.setItem('neon2048HighScore', highScore);
        }
    }

    function playSound(sound) {
        sound.currentTime = 0;
        sound.play().catch(e => { /* console.log("Interaksi pengguna diperlukan untuk memutar suara."); */ });
    }


    async function performMove(moveFunction) {
        if (isMoving) return;
        isMoving = true;

        if (isGameOver()) {
            isMoving = false;
            return;
        }

        const { hasMoved, mergedTiles } = moveFunction();

        if (hasMoved) {
            playSound(slideSound);

            const tileMovePromises = [];

            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const tile = grid[r][c];
                    if (tile) {
                        const targetTop = `${r * boardSize + 5}px`;
                        const targetLeft = `${c * boardSize + 5}px`;

                        if (tile.domElement.style.top !== targetTop || tile.domElement.style.left !== targetLeft) {
                            tile.updateDomPosition(); // Ini akan menggeser ke posisi baru

                            tileMovePromises.push(new Promise(resolve => {
                                const failsafeTimer = setTimeout(() => resolve(), 200);
                                const onEnd = () => {
                                    clearTimeout(failsafeTimer);
                                    resolve();
                                };
                                tile.domElement.addEventListener('transitionend', onEnd, { once: true });
                            }));
                        }
                    }
                }
            }

            for (const mergedTile of mergedTiles) {
                mergedTile.animateMerge();
                mergedTile.updateDomValue();
            }

            await Promise.all(tileMovePromises);

            setTimeout(() => {
                const currentDomTiles = new Set();
                for (let r = 0; r < GRID_SIZE; r++) {
                    for (let c = 0; c < GRID_SIZE; c++) {
                        if (grid[r][c]) {
                            currentDomTiles.add(grid[r][c].domElement);
                        }
                    }
                }
                Array.from(boardElement.querySelectorAll('.tile')).forEach(domTile => {
                    if (!currentDomTiles.has(domTile)) {
                        domTile.remove();
                    }
                });
            }, 100);

            addNewTile();

            if (!hasWon && checkForWin()) {
                hasWon = true;
                showGameEndModal(true);
                playSound(winSound);
            }

            if (isGameOver()) {
                showGameEndModal(false);
                playSound(loseSound);
            }
        }

        isMoving = false;
    }

    function handleInput(e) {
        if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp': performMove(moveUp); break;
                case 'ArrowDown': performMove(moveDown); break;
                case 'ArrowLeft': performMove(moveLeft); break;
                case 'ArrowRight': performMove(moveRight); break;
            }
        }
    }

    function handleTouchStart(e) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }

    function handleTouchMove(e) {
        e.preventDefault();
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        if (!isSwiping || !e.changedTouches.length) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const swipeThreshold = 50;
        isSwiping = false;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > swipeThreshold) { performMove(moveRight); }
            else if (deltaX < -swipeThreshold) { performMove(moveLeft); }
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
            if (deltaY > swipeThreshold) { performMove(moveDown); }
            else if (deltaY < -swipeThreshold) { performMove(moveUp); }
        }
    }


    function slideAndCombine(arr) {
        let hasMoved = false;
        const mergedTiles = [];

        let newArr = arr.filter(tile => tile !== null);
        let numMissing = GRID_SIZE - newArr.length;
        if (numMissing > 0 && newArr.length > 0) hasMoved = true;
        let zeros = Array(numMissing).fill(null);
        newArr = newArr.concat(zeros);

        for (let i = 0; i < GRID_SIZE - 1; i++) {
            if (newArr[i] !== null && newArr[i].value === newArr[i + 1]?.value) {
                newArr[i].value *= 2;
                updateScore(newArr[i].value);
                mergedTiles.push(newArr[i]);
                newArr[i + 1].removeDom();
                newArr[i + 1] = null;
                hasMoved = true;
            }
        }

        let finalArr = newArr.filter(tile => tile !== null);
        numMissing = GRID_SIZE - finalArr.length;
        zeros = Array(numMissing).fill(null);
        finalArr = finalArr.concat(zeros);

        for (let i = 0; i < GRID_SIZE; i++) {
            if (arr[i] !== finalArr[i]) {
                hasMoved = true;
                break;
            }
        }

        return { newRow: finalArr, hasMoved, mergedTiles };
    }


    function moveLeft() {
        let globalHasMoved = false;
        let globalMergedTiles = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            let row = grid[r];
            const { newRow, hasMoved, mergedTiles } = slideAndCombine(row);
            grid[r] = newRow;
            if (hasMoved) globalHasMoved = true;
            globalMergedTiles.push(...mergedTiles);

            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].r = r;
                    grid[r][c].c = c;
                }
            }
        }
        return { hasMoved: globalHasMoved, mergedTiles: globalMergedTiles };
    }

    function moveRight() {
        let globalHasMoved = false;
        let globalMergedTiles = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            let row = grid[r].slice().reverse();
            const { newRow, hasMoved, mergedTiles } = slideAndCombine(row);
            grid[r] = newRow.reverse();
            if (hasMoved) globalHasMoved = true;
            globalMergedTiles.push(...mergedTiles);

            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].r = r;
                    grid[r][c].c = c;
                }
            }
        }
        return { hasMoved: globalHasMoved, mergedTiles: globalMergedTiles };
    }

    function transpose() {
        let newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                newGrid[c][r] = grid[r][c];
            }
        }
        grid = newGrid;
    }

    function moveUp() {
        transpose();
        const result = moveLeft();
        transpose();

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].r = r;
                    grid[r][c].c = c;
                }
            }
        }
        return result;
    }

    function moveDown() {
        transpose();
        const result = moveRight();
        transpose();

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].r = r;
                    grid[r][c].c = c;
                }
            }
        }
        return result;
    }

    function checkForWin() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] && grid[r][c].value === 2048) {
                    return true;
                }
            }
        }
        return false;
    }

    function canMove() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === null) return true;
            }
        }
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                if (grid[r][c] && grid[r][c].value === grid[r][c + 1]?.value) return true;
            }
        }
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] && grid[r][c].value === grid[r + 1][c]?.value) return true;
            }
        }
        return false;
    }

    function isGameOver() {
        return !canMove();
    }

    function showGameEndModal(isWin) {
        if (isWin) {
            modalTitle.textContent = "Anda Menang!";
            modalMessage.textContent = "Anda telah mencapai ubin 2048!";
        } else {
            modalTitle.textContent = "Game Over!";
            modalMessage.textContent = "Tidak ada gerakan tersisa. Coba lagi?";
        }
        gameOverModal.classList.add('show');
    }

    function closeAllModals() {
        instructionsModal.classList.remove('show');
        gameOverModal.classList.remove('show');
    }

    // Event Listeners
    document.addEventListener('keydown', handleInput);

    boardElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    boardElement.addEventListener('touchend', handleTouchEnd, { passive: false });

    newGameBtn.addEventListener('click', initGame);
    restartGameBtn.addEventListener('click', initGame);

    instructionsBtn.addEventListener('click', () => {
        instructionsModal.classList.add('show');
    });
    closeInstructionsBtn.addEventListener('click', closeAllModals);

    instructionsModal.addEventListener('click', (e) => {
        if (e.target === instructionsModal) closeAllModals();
    });
    gameOverModal.addEventListener('click', (e) => {
        if (e.target === gameOverModal) closeAllModals();
    });

    // Event listener resize sekarang akan berfungsi dengan benar
    window.addEventListener('resize', () => {
        drawGridBackground(); // Mengatur ulang boardSize
        // Memperbarui posisi DAN ukuran semua ubin yang ada
        boardSize = boardElement.clientWidth / GRID_SIZE;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].updateDomPosition();
                }
            }
        }
    });

    // Mulai Game!
    initGame();
});