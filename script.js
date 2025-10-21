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
    let board = [];
    let score = 0;
    let highScore = 0;
    let hasWon = false;
    let boardSize = 0;

    // Variabel untuk deteksi sentuhan (swipe)
    let touchStartX = 0;
    let touchStartY = 0;

    function initGame() {
        board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
        score = 0;
        hasWon = false;
        highScore = localStorage.getItem('neon2048HighScore') || 0;
        updateScore(0);
        highScoreElement.textContent = highScore;
        gameOverModal.classList.remove('show');

        addNewTile();
        addNewTile();
        drawBoard();
    }

    // Menggambar papan (grid statis + ubin dinamis)
    function drawBoard() {
        boardElement.innerHTML = ''; // Hapus ubin lama
        const boardWidth = boardElement.clientWidth;
        boardSize = boardWidth / GRID_SIZE; // Ukuran sel

        // Buat grid background
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.style.width = `${boardSize - 10}px`; // Kurangi gap
                cell.style.height = `${boardSize - 10}px`;
                boardElement.appendChild(cell);
            }
        }

        // Gambar ubin di atas grid
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] !== 0) {
                    createTile(r, c, board[r][c]);
                }
            }
        }
    }

    // Fungsi untuk membuat elemen ubin
    function createTile(r, c, value, isNew = false, isMerge = false) {
        const tile = document.createElement('div');
        const tileValue = value;
        tile.textContent = tileValue;
        tile.classList.add('tile', `tile-${tileValue}`);

        // Set ukuran dan posisi
        tile.style.width = `${boardSize - 10}px`;
        tile.style.height = `${boardSize - 10}px`;
        tile.style.top = `${r * boardSize + 5}px`; // 5px untuk padding/gap
        tile.style.left = `${c * boardSize + 5}px`;

        if (isNew) tile.classList.add('spawn');
        if (isMerge) tile.classList.add('merge');

        boardElement.appendChild(tile);
    }

    // Menggambar ulang ubin setelah bergerak (dengan animasi)
    function redrawTiles(oldBoard) {
        boardElement.innerHTML = ''; // Hapus semua
        drawBoard(); // Gambar ulang background dan ubin di posisi baru

        // Tambahkan animasi spawn/merge
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] !== 0) {
                    const isNew = oldBoard[r][c] === 0;
                    const isMerge = !isNew && board[r][c] !== oldBoard[r][c];

                    // Hapus ubin yang ada di DOM (jika ada) dan buat ulang dengan animasi
                    // Ini adalah cara sederhana untuk animasi; idealnya adalah memindahkan DOM
                    createTile(r, c, board[r][c], isNew, isMerge);
                }
            }
        }
    }


    function addNewTile() {
        let emptyCells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] === 0) {
                    emptyCells.push({ r, c });
                }
            }
        }

        if (emptyCells.length > 0) {
            const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            board[r][c] = Math.random() < 0.9 ? 2 : 4;
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
        sound.currentTime = 0; // Putar ulang dari awal
        sound.play().catch(e => console.log("Interaksi pengguna diperlukan untuk memutar suara."));
    }

    // Logika Gerakan

    // FUNGSI BARU: Menjalankan logika setelah bergerak
    function performMove(moveFunction) {
        if (isGameOver()) return; // Jangan lakukan apa-apa jika sudah kalah

        const oldBoard = JSON.parse(JSON.stringify(board));
        let moved = moveFunction(); // Menjalankan fungsi gerak (moveUp, moveLeft, dll)

        if (moved) {
            playSound(slideSound);
            addNewTile();
            redrawTiles(oldBoard); // Gambar ulang dengan animasi

            if (!hasWon && checkForWin()) {
                hasWon = true;
                showGameEndModal(true); // Menang
                playSound(winSound);
            }

            if (isGameOver()) {
                showGameEndModal(false); // Kalah
                playSound(loseSound);
            }
        }
    }

    // DIMODIFIKASI: Input Keyboard (sekarang memanggil 'performMove')
    function handleInput(e) {
        if (e.key.startsWith('Arrow')) {
            e.preventDefault(); // Mencegah window scrolling
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
        // Mencegah 'click' ganda di mobile
        e.preventDefault();
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e) {
        e.preventDefault(); // Mencegah 'click' ganda di mobile
        if (!e.changedTouches.length) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        // Jarak geser minimum agar dianggap 'swipe'
        const swipeThreshold = 50;

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


    // Helper: geser & gabung
    function slide(row) {
        let arr = row.filter(val => val); // Singkirkan nol
        let missing = GRID_SIZE - arr.length;
        let zeros = Array(missing).fill(0);
        return arr.concat(zeros); // Tambahkan nol di akhir
    }

    function combine(row) {
        let newScore = 0;
        for (let i = 0; i < GRID_SIZE - 1; i++) {
            if (row[i] !== 0 && row[i] === row[i + 1]) {
                row[i] *= 2;
                newScore += row[i];
                row[i + 1] = 0;
            }
        }
        updateScore(newScore);
        return row;
    }

    // Fungsi Gerakan Utama
    function moveLeft() {
        let moved = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            let row = board[r];
            let originalRow = [...row];

            let newRow = slide(row);
            newRow = combine(newRow);
            newRow = slide(newRow);

            board[r] = newRow;
            if (originalRow.join(',') !== newRow.join(',')) {
                moved = true;
            }
        }
        return moved;
    }

    function moveRight() {
        let moved = false;
        for (let r = 0; r < GRID_SIZE; r++) {
            let row = board[r].reverse(); // Balik
            let originalRow = [...row];

            let newRow = slide(row);
            newRow = combine(newRow);
            newRow = slide(newRow);

            board[r] = newRow.reverse(); // Balik lagi
            if (originalRow.join(',') !== newRow.join(',')) {
                moved = true;
            }
        }
        return moved;
    }

    // Helper: Transpose (mengubah baris jadi kolom dan sebaliknya)
    function transpose() {
        let newBoard = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                newBoard[c][r] = board[r][c];
            }
        }
        board = newBoard;
    }

    function moveUp() {
        transpose();
        let moved = moveLeft();
        transpose();
        return moved;
    }

    function moveDown() {
        transpose();
        let moved = moveRight();
        transpose();
        return moved;
    }

    // Cek Menang / Kalah
    function checkForWin() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] === 2048) {
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
                if (board[r][c] === 0) return true;
            }
        }
        // Cek gabung horizontal
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE - 1; c++) {
                if (board[r][c] === board[r][c + 1]) return true;
            }
        }
        // Cek gabung vertikal
        for (let r = 0; r < GRID_SIZE - 1; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c] === board[r + 1][c]) return true;
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

    // --- EVENT LISTENER BARU UNTUK SENTUHAN ---
    // Kita terapkan di 'boardElement' agar tidak mengganggu tombol
    boardElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    boardElement.addEventListener('touchend', handleTouchEnd, { passive: false });
    boardElement.addEventListener('touchmove', (e) => {
        // Mencegah scrolling halaman saat menggeser di dalam papan game
        e.preventDefault();
    }, { passive: false });


    newGameBtn.addEventListener('click', initGame);
    restartGameBtn.addEventListener('click', initGame);

    instructionsBtn.addEventListener('click', () => {
        instructionsModal.classList.add('show');
    });
    closeInstructionsBtn.addEventListener('click', closeAllModals);

    // Menutup modal jika klik di luar konten
    instructionsModal.addEventListener('click', (e) => {
        if (e.target === instructionsModal) closeAllModals();
    });
    gameOverModal.addEventListener('click', (e) => {
        if (e.target === gameOverModal) closeAllModals();
    });

    // Mengatasi perubahan ukuran window
    window.addEventListener('resize', drawBoard);

    // Mulai Game!
    initGame();
});