/* =========================================================
   AUDIO SYNTHESIZER (Web Audio API)
   ========================================================= */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }
    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    playTone(freq, type = 'sine', duration = 0.15) {
        if (this.muted) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }
    correct() {
        this.playTone(523.25, 'triangle', 0.1);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.15), 100);
    }
    wrong() {
        this.playTone(220, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(180, 'sawtooth', 0.25), 120);
    }
    levelUp() {
        [440, 554, 659, 880].forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'triangle', 0.2), idx * 100);
        });
    }
    pop() {
        this.playTone(800, 'sine', 0.05);
    }
    toggle() {
        this.muted = !this.muted;
        document.getElementById('soundToggle').innerText = this.muted ? '🔇' : '🔊';
    }
}
const audio = new SoundEngine();

/* =========================================================
   CONFETTI EFFECT (Canvas)
   ========================================================= */
const confetti = {
    canvas: document.getElementById('confettiCanvas'),
    ctx: document.getElementById('confettiCanvas').getContext('2d'),
    particles: [],
    active: false,
    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },
    burst() {
        this.active = true;
        const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#6366f1', '#3b82f6', '#14b8a6', '#22c55e', '#eab308'];
        for (let i = 0; i < 90; i++) {
            this.particles.push({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.7) * 16,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10,
                life: 1
            });
        }
        if (!this.running) this.render();
    },
    render() {
        this.running = true;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach((p, idx) => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.35;
            p.rotation += p.vRot;
            p.life -= 0.012;
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
            if (p.life <= 0) this.particles.splice(idx, 1);
        });
        if (this.particles.length > 0) {
            requestAnimationFrame(() => this.render());
        } else {
            this.running = false;
        }
    }
};
confetti.init();

/* =========================================================
   MAIN APP & PROGRESSION CONTROLLER
   ========================================================= */
const app = {
    userProgress: {
        unlockedLevel: 1,
        levelStars: {},
        totalStars: 0
    },
    currentLevel: 1,
    isTestMode: false,
    questionIndex: 0,
    totalQuestions: 10,
    correctCount: 0,
    currentQuestion: null,

    init() {
        this.loadProgress();
        this.renderMap();
        this.renderExplorer();
    },

    loadProgress() {
        const saved = localStorage.getItem('galaxy_math_progress');
        if (saved) {
            try {
                this.userProgress = JSON.parse(saved);
            } catch (e) { }
        }
        this.updateStarUI();
    },

    saveProgress() {
        localStorage.setItem('galaxy_math_progress', JSON.stringify(this.userProgress));
        this.updateStarUI();
    },

    updateStarUI() {
        let stars = 0;
        for (let lvl in this.userProgress.levelStars) {
            stars += this.userProgress.levelStars[lvl] || 0;
        }
        this.userProgress.totalStars = stars;
        document.getElementById('starCounter').innerText = stars;
    },

    showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const target = document.getElementById(id + 'Screen');
        if (target) target.classList.add('active');

        const navMap = { map: 0, balloon: 1, memory: 2, explorer: 3 };
        if (navMap[id] !== undefined) {
            const btns = document.querySelectorAll('.nav-btn');
            if (btns[navMap[id]]) btns[navMap[id]].classList.add('active');
        }

        if (id === 'memory') memoryGame.init();
        if (id !== 'balloon' && balloonGame.running) balloonGame.stop();
    },

    renderMap() {
        const container = document.getElementById('levelGrid');
        container.innerHTML = '';

        for (let i = 1; i <= 12; i++) {
            const isUnlocked = i <= this.userProgress.unlockedLevel;
            const stars = this.userProgress.levelStars[i] || 0;
            const starsText = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

            const card = document.createElement('div');
            card.className = `level-card ${isUnlocked ? '' : 'locked'}`;
            card.innerHTML = `
        <div class="level-badge">${isUnlocked ? i : '🔒'}</div>
        <h3 style="font-family: Fredoka;">${i} × Table</h3>
        <div class="stars-display">${isUnlocked ? starsText : 'Locked'}</div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="app.startStage(${i}, true)" ${!isUnlocked ? 'disabled' : ''}>
            Mastery Test
          </button>
          <button class="btn btn-secondary" onclick="app.startStage(${i}, false)" ${!isUnlocked ? 'disabled' : ''}>
            Practice
          </button>
        </div>
      `;
            container.appendChild(card);
        }
    },

    startStage(lvl, isTest) {
        this.currentLevel = lvl;
        this.isTestMode = isTest;
        this.questionIndex = 0;
        this.correctCount = 0;
        this.showScreen('quiz');

        document.getElementById('quizModeBadge').innerText = isTest ? `Level ${lvl} Test` : `Level ${lvl} Practice`;
        document.getElementById('quizProgressWrap').style.display = isTest ? 'block' : 'none';
        document.getElementById('dotArrayWrap').style.display = 'none';
        this.nextQuestion();
    },

    nextQuestion() {
        if (this.isTestMode && this.questionIndex >= this.totalQuestions) {
            this.completeTest();
            return;
        }

        const pct = (this.questionIndex / this.totalQuestions) * 100;
        document.getElementById('quizProgressBar').style.width = pct + '%';

        const factorA = this.currentLevel;
        const factorB = Math.floor(Math.random() * 12) + 1;
        const correctProduct = factorA * factorB;

        this.currentQuestion = { a: factorA, b: factorB, answer: correctProduct };

        document.getElementById('qFactorA').innerText = factorA;
        document.getElementById('qFactorB').innerText = factorB;

        this.renderDotArray(factorA, factorB);

        const choices = new Set([correctProduct]);
        while (choices.size < 4) {
            const fakeDelta = (Math.floor(Math.random() * 5) - 2) * factorA;
            const fake = correctProduct + fakeDelta + (Math.random() > 0.5 ? 1 : -1);
            if (fake > 0 && fake !== correctProduct) choices.add(fake);
            else choices.add(Math.floor(Math.random() * 100) + 1);
        }

        const choiceArray = Array.from(choices).sort(() => Math.random() - 0.5);
        const grid = document.getElementById('answersGrid');
        grid.innerHTML = '';

        choiceArray.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.innerText = choice;
            btn.onclick = () => this.handleAnswer(btn, choice);
            grid.appendChild(btn);
        });
    },

    renderDotArray(rows, cols) {
        const wrap = document.getElementById('dotArray');
        wrap.innerHTML = '';
        for (let r = 0; r < rows; r++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'dot-row';
            for (let c = 0; c < cols; c++) {
                const dot = document.createElement('div');
                dot.className = 'dot';
                rowDiv.appendChild(dot);
            }
            wrap.appendChild(rowDiv);
        }
    },

    toggleHint() {
        const wrap = document.getElementById('dotArrayWrap');
        wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
    },

    handleAnswer(btn, chosen) {
        const isCorrect = chosen === this.currentQuestion.answer;
        const allBtns = document.querySelectorAll('.answer-btn');
        allBtns.forEach(b => b.disabled = true);

        if (isCorrect) {
            btn.classList.add('correct');
            audio.correct();
            this.correctCount++;
        } else {
            btn.classList.add('wrong');
            audio.wrong();
            allBtns.forEach(b => {
                if (parseInt(b.innerText) === this.currentQuestion.answer) {
                    b.classList.add('correct');
                }
            });
        }

        setTimeout(() => {
            this.questionIndex++;
            this.nextQuestion();
        }, 1100);
    },

    completeTest() {
        let starsEarned = 0;
        if (this.correctCount === 10) starsEarned = 3;
        else if (this.correctCount >= 8) starsEarned = 2;
        else if (this.correctCount >= 6) starsEarned = 1;

        const currentSavedStars = this.userProgress.levelStars[this.currentLevel] || 0;
        if (starsEarned > currentSavedStars) {
            this.userProgress.levelStars[this.currentLevel] = starsEarned;
        }

        const passed = starsEarned >= 2;
        if (passed && this.userProgress.unlockedLevel === this.currentLevel && this.currentLevel < 12) {
            this.userProgress.unlockedLevel = this.currentLevel + 1;
        }

        this.saveProgress();
        this.renderMap();

        const modal = document.getElementById('resultModal');
        const title = document.getElementById('modalTitle');
        const stars = document.getElementById('modalStars');
        const msg = document.getElementById('modalMsg');

        if (passed) {
            audio.levelUp();
            confetti.burst();
            title.innerText = 'Awesome Job!';
            msg.innerText = `You answered ${this.correctCount}/10 correctly! Next stage unlocked!`;
        } else {
            title.innerText = 'Good Try!';
            msg.innerText = `You scored ${this.correctCount}/10. Practice some more and aim for 8 or more to unlock the next level!`;
        }

        stars.innerText = '⭐'.repeat(starsEarned) + '☆'.repeat(3 - starsEarned);
        modal.style.display = 'flex';
    },

    closeModal() {
        document.getElementById('resultModal').style.display = 'none';
        this.showScreen('map');
    },

    resetAllProgress() {
        if (confirm("Reset all progress back to Level 1?")) {
            this.userProgress = { unlockedLevel: 1, levelStars: {}, totalStars: 0 };
            this.saveProgress();
            this.renderMap();
        }
    },

    unlockAll() {
        this.userProgress.unlockedLevel = 12;
        this.saveProgress();
        this.renderMap();
    },

    renderExplorer() {
        const table = document.getElementById('matrixTable');
        table.innerHTML = '';

        let headerRow = '<tr><th>×</th>';
        for (let c = 1; c <= 12; c++) headerRow += `<th>${c}</th>`;
        headerRow += '</tr>';
        table.innerHTML += headerRow;

        for (let r = 1; r <= 12; r++) {
            let row = `<tr><th>${r}</th>`;
            for (let c = 1; c <= 12; c++) {
                row += `<td data-r="${r}" data-c="${c}">${r * c}</td>`;
            }
            row += '</tr>';
            table.innerHTML += row;
        }

        table.querySelectorAll('td').forEach(cell => {
            cell.addEventListener('mouseenter', () => {
                const r = cell.getAttribute('data-r');
                const c = cell.getAttribute('data-c');
                table.querySelectorAll('td').forEach(td => {
                    if (td.getAttribute('data-r') === r || td.getAttribute('data-c') === c) {
                        td.classList.add('highlight');
                    } else {
                        td.classList.remove('highlight');
                    }
                });
            });
            cell.addEventListener('mouseleave', () => {
                table.querySelectorAll('td').forEach(td => td.classList.remove('highlight'));
            });
            cell.addEventListener('click', () => {
                const r = cell.getAttribute('data-r');
                const c = cell.getAttribute('data-c');
                audio.playTone(200 + (r * c) * 3, 'triangle', 0.1);
            });
        });
    }
};

/* =========================================================
   BALLOON POP ARCADE GAME
   ========================================================= */
const balloonGame = {
    canvas: document.getElementById('balloonCanvas'),
    ctx: document.getElementById('balloonCanvas').getContext('2d'),
    running: false,
    balloons: [],
    targetEquation: '',
    targetAnswer: 0,
    score: 0,
    animId: null,

    start() {
        this.running = true;
        this.score = 0;
        this.balloons = [];
        document.getElementById('balloonScore').innerText = '0';
        document.getElementById('balloonStartBtn').style.display = 'none';
        this.newQuestion();
        this.loop();

        this.canvas.onclick = (e) => this.handleClick(e);
    },

    stop() {
        this.running = false;
        cancelAnimationFrame(this.animId);
        document.getElementById('balloonStartBtn').style.display = 'inline-block';
        document.getElementById('balloonStartBtn').innerText = 'Play Again';
    },

    newQuestion() {
        const factorA = Math.floor(Math.random() * app.userProgress.unlockedLevel) + 1;
        const factorB = Math.floor(Math.random() * 10) + 1;
        this.targetAnswer = factorA * factorB;
        this.targetEquation = `${factorA} × ${factorB}`;

        this.balloons = [];
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];
        const values = [this.targetAnswer];

        while (values.length < 4) {
            const fake = this.targetAnswer + (Math.floor(Math.random() * 7) - 3) * factorA;
            if (fake > 0 && !values.includes(fake)) values.push(fake);
            else values.push(Math.floor(Math.random() * 50) + 1);
        }

        values.sort(() => Math.random() - 0.5);

        values.forEach((val, idx) => {
            this.balloons.push({
                x: 100 + idx * 140,
                y: 450 + Math.random() * 40,
                radius: 40,
                val: val,
                color: colors[idx % colors.length],
                speed: 1.2 + Math.random() * 0.8
            });
        });
    },

    loop() {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, 60);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Fredoka';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Target: ${this.targetEquation} = ?`, this.canvas.width / 2, 38);

        let allEscaped = true;
        this.balloons.forEach(b => {
            b.y -= b.speed;
            if (b.y + b.radius > 60) allEscaped = false;

            this.ctx.beginPath();
            this.ctx.moveTo(b.x, b.y + b.radius);
            this.ctx.lineTo(b.x, b.y + b.radius + 20);
            this.ctx.strokeStyle = '#fff';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = b.color;
            this.ctx.fill();

            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 22px Nunito';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(b.val, b.x, b.y);
        });

        if (allEscaped) {
            this.newQuestion();
        }

        this.animId = requestAnimationFrame(() => this.loop());
    },

    handleClick(e) {
        if (!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const clickY = (e.clientY - rect.top) * (this.canvas.height / rect.height);

        for (let i = this.balloons.length - 1; i >= 0; i--) {
            const b = this.balloons[i];
            const dist = Math.hypot(clickX - b.x, clickY - b.y);
            if (dist < b.radius) {
                audio.pop();
                if (b.val === this.targetAnswer) {
                    audio.correct();
                    this.score += 10;
                    document.getElementById('balloonScore').innerText = this.score;
                    this.newQuestion();
                } else {
                    audio.wrong();
                    this.balloons.splice(i, 1);
                }
                break;
            }
        }
    }
};

/* =========================================================
   MEMORY MATCH GAME
   ========================================================= */
const memoryGame = {
    cards: [],
    flippedCards: [],
    matchedCount: 0,

    init() {
        const grid = document.getElementById('memoryGrid');
        grid.innerHTML = '';
        this.flippedCards = [];
        this.matchedCount = 0;

        const maxLevel = app.userProgress.unlockedLevel;
        const pairs = [];
        for (let i = 0; i < 6; i++) {
            const a = Math.floor(Math.random() * maxLevel) + 1;
            const b = Math.floor(Math.random() * 9) + 1;
            const prod = a * b;
            pairs.push({ text: `${a} × ${b}`, matchKey: prod });
            pairs.push({ text: `${prod}`, matchKey: prod });
        }

        pairs.sort(() => Math.random() - 0.5);

        pairs.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'memory-card';
            card.innerHTML = `
        <div class="card-front">❓</div>
        <div class="card-back">${item.text}</div>
      `;
            card.onclick = () => this.flip(card, item);
            grid.appendChild(card);
        });
    },

    flip(cardElem, item) {
        if (this.flippedCards.length >= 2 || cardElem.classList.contains('flipped') || cardElem.classList.contains('matched')) {
            return;
        }

        audio.playTone(400, 'sine', 0.05);
        cardElem.classList.add('flipped');
        this.flippedCards.push({ elem: cardElem, item: item });

        if (this.flippedCards.length === 2) {
            const [first, second] = this.flippedCards;
            if (first.item.matchKey === second.item.matchKey && first.item.text !== second.item.text) {
                setTimeout(() => {
                    audio.correct();
                    first.elem.classList.add('matched');
                    second.elem.classList.add('matched');
                    this.flippedCards = [];
                    this.matchedCount++;
                    if (this.matchedCount === 6) {
                        confetti.burst();
                        audio.levelUp();
                    }
                }, 500);
            } else {
                setTimeout(() => {
                    audio.wrong();
                    first.elem.classList.remove('flipped');
                    second.elem.classList.remove('flipped');
                    this.flippedCards = [];
                }, 900);
            }
        }
    }
};

window.onload = () => {
    app.init();
};