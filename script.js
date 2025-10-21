document.addEventListener('DOMContentLoaded', () => {
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
    let grid = []; // Mengganti 'board' menjadi 'grid' untuk membedakan dengan objek Tile
    let score = 0;
    let highScore = 0;
    let hasWon = false;
    let boardSize = 0;

    // Variabel untuk deteksi sentuhan (swipe)
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false; // Flag untuk melacak apakah sedang swipe

    // Class untuk merepresentasikan setiap Tile
    class Tile {
        constructor(value, r, c) {
            this.value = value;
            this.r = r;
            this.c = c;
            this.domElement = document.createElement('div');
            this.domElement.classList.add('tile');
            this.domElement.textContent = value;
            this.updateDomPosition();
            this.updateDomValue();
            boardElement.appendChild(this.domElement);
        }

        updateDomPosition() {
            this.domElement.style.top = `${this.r * boardSize + 5}px`;
            this.domElement.style.left = `${this.c * boardSize + 5}px`;
        }

        updateDomValue() {
            this.domElement.textContent = this.value;
            this.domElement.className = 'tile'; // Reset class
            this.domElement.classList.add(`tile-${this.value}`);
        }

        removeDom() {
            this.domElement.remove();
        }

        // Metode untuk animasi spawn
        animateSpawn() {
            this.domElement.classList.add('spawn');
            this.domElement.addEventListener('animationend', () => {
                this.domElement.classList.remove('spawn');
            }, { once: true });
        }

        // Metode untuk animasi merge
        animateMerge() {
            this.domElement.classList.add('merge');
            this.domElement.addEventListener('animationend', () => {
                this.domElement.classList.remove('merge');
            }, { once: true });
        }
    }


    function initGame() {
        // Hapus semua ubin yang ada di DOM
        const existingTiles = boardElement.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());

        grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)); // Sekarang berisi objek Tile atau null
        score = 0;
        hasWon = false;
        highScore = localStorage.getItem('neon2048HighScore') || 0;
        updateScore(0);
        highScoreElement.textContent = highScore;
        gameOverModal.classList.remove('show');

        // Gambar hanya grid background statis
        drawGridBackground();

        addNewTile();
        addNewTile();
    }

    // Hanya menggambar latar belakang grid statis
    function drawGridBackground() {
        boardElement.innerHTML = ''; // Hapus semua (termasuk ubin jika ada)
        const boardWidth = boardElement.clientWidth;
        boardSize = boardWidth / GRID_SIZE;

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

    // Membuat dan menambahkan ubin baru
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
            const newTile = new Tile(value, r, c);
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

    // Logika Gerakan
    async function performMove(moveFunction) {
        if (isGameOver()) return;

        // Clone grid values only for comparison
        const oldGridValues = grid.map(row => row.map(tile => tile ? tile.value : 0));
        let moved = false;

        // Panggil fungsi gerak yang sebenarnya dan dapatkan informasi apakah ada pergerakan
        const { hasMoved, mergedTiles } = moveFunction();

        moved = hasMoved;

        if (moved) {
            playSound(slideSound);

            // Animasi pergerakan ubin
            // Tunggu semua transisi ubin selesai sebelum menambahkan ubin baru
            const tileMovePromises = [];
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    const tile = grid[r][c];
                    if (tile && (tile.r !== r || tile.c !== c)) {
                        // Jika ubin bergerak, perbarui posisi DOM-nya
                        tile.r = r; // Perbarui posisi di objek Tile
                        tile.c = c;
                        tile.updateDomPosition(); // Update style di DOM
                        tileMovePromises.push(new Promise(resolve => {
                            tile.domElement.addEventListener('transitionend', resolve, { once: true });
                        }));
                    }
                }
            }

            // Animasi merge (harus dilakukan setelah pergerakan)
            for (const mergedTile of mergedTiles) {
                mergedTile.animateMerge();
                mergedTile.updateDomValue(); // Pastikan nilai tile yang digabung sudah terupdate
            }

            await Promise.all(tileMovePromises); // Tunggu semua ubin selesai bergerak

            // Hapus ubin yang sudah tidak ada (karena digabung)
            // Ini akan dilakukan secara otomatis saat `initGame` atau `addNewTile`
            // Namun, untuk merge, kita perlu membersihkan tile yang "dihapus"
            // Kita bisa menambahkan timeout kecil untuk memberi waktu animasi merge
            setTimeout(() => {
                // Di sini, kita akan membersihkan elemen DOM dari ubin yang sudah digabung
                // Misalnya, jika A dan B bergabung menjadi A', B harus dihapus
                // Dalam implementasi ini, kita memastikan `grid` hanya berisi `Tile` yang valid
                // Ubin yang digabungkan akan menjadi `null` di posisi lama mereka setelah `combineGrid`
                // Kita perlu mekanisme untuk menghapus DOM dari `Tile` yang menjadi `null`.
                // Cara paling mudah adalah dengan merefresh tampilan, atau lebih efisien:
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
            }, 100); // Sedikit jeda setelah transisi berakhir

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
    }

    // DIMODIFIKASI: Input Keyboard (sekarang memanggil 'performMove')
    function handleInput(e) {
        if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp':
                    performMove(moveUp);
                    break;
                case 'ArrowDown':
                    performMove(moveDown);
                    break;
                case 'ArrowLeft':
                    performMove(moveLeft);
                    break;
                case 'ArrowRight':
                    performMove(moveRight);
                    break;
            }
        }
    }

    // --- KODE BARU UNTUK LAYAR SENTUH ---
    function handleTouchStart(e) {
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }

    function handleTouchMove(e) {
        // Mencegah scrolling halaman saat menggeser di dalam papan game
        e.preventDefault();
        // Set isSwiping = true di touchstart
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        if (!isSwiping || !e.changedTouches.length) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        const swipeThreshold = 50;
        isSwiping = false; // Reset flag

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Geser Horizontal
            if (deltaX > swipeThreshold) {
                performMove(moveRight);
            } else if (deltaX < -swipeThreshold) {
                performMove(moveLeft);
            }
        } else if (Math.abs(deltaY) > Math.abs(deltaX)) {
            // Geser Vertikal
            if (deltaY > swipeThreshold) {
                performMove(moveDown);
            } else if (deltaY < -swipeThreshold) {
                performMove(moveUp);
            }
        }
    }
    // --- AKHIR KODE BARU ---

    // Helper: geser & gabung (memanipulasi objek Tile)
    // Fungsi ini akan mengembalikan objek yang berisi:
    // - hasMoved: boolean, apakah ada ubin yang bergerak atau digabung
    // - mergedTiles: Array of Tile, ubin yang baru saja digabung
    function slideAndCombine(arr) {
        let hasMoved = false;
        const mergedTiles = [];

        // 1. Geser semua ubin non-null ke depan
        let newArr = arr.filter(tile => tile !== null);
        let numMissing = GRID_SIZE - newArr.length;
        if (numMissing > 0) hasMoved = true; // Jika ada nol, berarti ada pergerakan
        let zeros = Array(numMissing).fill(null);
        newArr = newArr.concat(zeros);

        // 2. Gabungkan ubin yang sama
        for (let i = 0; i < GRID_SIZE - 1; i++) {
            if (newArr[i] !== null && newArr[i].value === newArr[i + 1]?.value) {
                newArr[i].value *= 2;
                updateScore(newArr[i].value);
                mergedTiles.push(newArr[i]); // Tambahkan ke daftar ubin yang digabung

                newArr[i + 1].removeDom(); // Hapus DOM dari ubin yang akan digabung
                newArr[i + 1] = null; // Set tile tersebut menjadi null
                hasMoved = true;
            }
        }

        // 3. Geser lagi setelah penggabungan
        let finalArr = newArr.filter(tile => tile !== null);
        numMissing = GRID_SIZE - finalArr.length;
        zeros = Array(numMissing).fill(null);
        finalArr = finalArr.concat(zeros);

        // Bandingkan untuk memastikan pergerakan
        for (let i = 0; i < GRID_SIZE; i++) {
            if ((arr[i] === null && finalArr[i] !== null) ||
                (arr[i] !== null && finalArr[i] === null) ||
                (arr[i] !== null && finalArr[i] !== null && arr[i].value !== finalArr[i].value)
            ) {
                hasMoved = true;
            }
        }

        return { newRow: finalArr, hasMoved, mergedTiles };
    }

    // Fungsi Gerakan Utama (sekarang mengembalikan { hasMoved, mergedTiles })
    function moveLeft() {
        let globalHasMoved = false;
        let globalMergedTiles = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            let row = grid[r];
            const { newRow, hasMoved, mergedTiles } = slideAndCombine(row);

            grid[r] = newRow; // Perbarui baris di grid utama

            if (hasMoved) globalHasMoved = true;
            globalMergedTiles.push(...mergedTiles);

            // Perbarui posisi Tile objects agar sesuai dengan grid baru
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
            let row = grid[r].slice().reverse(); // Balik baris untuk logika kanan
            const { newRow, hasMoved, mergedTiles } = slideAndCombine(row);

            grid[r] = newRow.reverse(); // Balik lagi untuk menyimpan di grid utama

            if (hasMoved) globalHasMoved = true;
            globalMergedTiles.push(...mergedTiles);

            // Perbarui posisi Tile objects
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c]) {
                    grid[r][c].r = r;
                    grid[r][c].c = c;
                }
            }
        }
        return { hasMoved: globalHasMoved, mergedTiles: globalMergedTiles };
    }

    // Helper: Transpose (mengubah baris jadi kolom dan sebaliknya)
    function transpose() {
        let newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                newGrid[c][r] = grid[r][c];
                if (newGrid[c][r]) {
                    // Perbarui r dan c sementara di objek Tile saat transpose
                    // Ini penting agar animasi geser bekerja dengan benar
                    newGrid[c][r].r = c;
                    newGrid[c][r].c = r;
                }
            }
        }
        grid = newGrid;
    }

    function moveUp() {
        transpose();
        const result = moveLeft(); // Gerakan 'atas' di grid ter-transpose adalah 'kiri'
        transpose(); // Balikkan kembali
        return result;
    }

    function moveDown() {
        transpose();
        const result = moveRight(); // Gerakan 'bawah' di grid ter-transpose adalah 'kanan'
        transpose(); // Balikkan kembali
        return result;
    }

    // Cek Menang / Kalah
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
        // Cek sel kosong
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] === null) return true;
            }
        }
        // Cek gabung horizontal
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                if (grid[r][c] && grid[r][c].value === grid[r][c + 1]?.value) return true;
            }
        }
        // Cek gabung vertikal
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (grid[r][c] && grid[r][c].value === grid[r + 1][c]?.value) return true;
            }
        }
        return false; // Tidak bisa gerak lagi
    }

    function isGameOver() {
        return !canMove();
    }

    // Logika Modal
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

    // Mengatasi perubahan ukuran window
    window.addEventListener('resize', () => {
        drawGridBackground(); // Gambar ulang hanya latar belakang
        // Perbarui posisi semua ubin yang ada
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