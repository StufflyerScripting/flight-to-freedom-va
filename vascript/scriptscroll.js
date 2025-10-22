const urlParams = new URLSearchParams(window.location.search);

const speedPx = Number(urlParams.get('n')) || 3;     // n pixels per tick
const tickMs = Number(urlParams.get('t')) || 20;    // t milliseconds per tick

const windowEl = document.getElementById('scriptWindow');
const marqueeEl = document.getElementById('marquee');

const params = new URLSearchParams(window.location.search);
const subcategory = params.get('subcat') || ''; // fallback to empty if none
const character = params.get('character') || 'hero';
const language = params.get('lang') || 'en';

let running = false;         // scrolling on/off
let animationInterval = null;
let currentX = 0;            // current translateX offset (px)
let startX = 0;              // initial start X (container width)
let marqueeWidth = 0;

const scriptWindow = document.getElementById('scriptWindow');
const resetBtn = document.getElementById('mobileReset');

fetch('scripts.json')
    .then(r => r.json())
    .then(data => {
        let line = null;

        if (data[character] && data[character][language]) {
            if (subcategory && data[character][language][subcategory]) {
                line = data[character][language][subcategory];
            } else {
                // fallback to first subcategory if none selected
                const firstSubcat = Object.keys(data[character][language])[0];
                line = data[character][language][firstSubcat];
            }
        }

        if (!line) {
            marqueeEl.textContent = 'No script found for ' + character + ' (' + language + ') [' + subcategory + '].';
            centerMarqueeText();
            return;
        }

        if (!line) {
            marqueeEl.textContent = 'No script found for ' + character + ' (' + language + ').';
            centerMarqueeText();
            return;
        }
        renderScript(line);
        // after rendering, position the marquee off the right edge
        requestAnimationFrame(() => {
            setupMarqueePosition();
        });
    })
    .catch(err => {
        console.error(err);
        marqueeEl.textContent = 'Error loading scripts.json';
        centerMarqueeText();
    });

let modifierNext = false;

const tagHandlers = {
    // --- Standalone tags (render visibly) ---
    pause: { type: 'standalone', width: 140 },
    pause_short: { type: 'standalone', width: 70 },
    pause_long: { type: 'standalone', width: 260 },
    breath: { type: 'standalone', label: '[breath]', class: 'breath' },
    laugh: { type: 'standalone', label: '[laugh]', class: 'laugh' },
    giggles: { type: 'standalone', label: '[giggles]', class: 'giggles' },

    // --- Modifier tags (affect next text) ---
    whispering: { type: 'modifier', class: 'whisper' },
    excitedly: { type: 'modifier', class: 'excited' },
    angrily: { type: 'modifier', class: 'angry' },
    sadly: { type: 'modifier', class: 'sad' },
    softly: { type: 'modifier', class: 'soft' }
};

function renderScript(line) {
    marqueeEl.innerHTML = ''; // clear

    const parts = line.split(/(\[.*?\])/g);
    modifierNext = false;
    let nextExpressionClass = null;

    for (const part of parts) {
        if (!part) continue;

        if (part.startsWith('[') && part.endsWith(']')) {
            const tag = part.slice(1, -1).trim().toLowerCase();
            const conf = tagHandlers[tag];

            if (conf) {
                if (conf.type === 'standalone') {
                    const span = document.createElement('span');
                    span.className = conf.class ? `${conf.class} tag` : 'tag';

                    if (conf.width) {
                        // Pause space — must have visible width to take effect
                        span.style.display = 'inline-block';
                        span.style.width = `${conf.width}px`;
                        span.innerHTML = '&nbsp;'; // invisible spacing content
                    } else if (conf.label) {
                        // Visible action like [breath], [laugh], etc.
                        span.textContent = conf.label;
                    }

                    marqueeEl.appendChild(span);

                } else if (conf.type === 'modifier') {
                    // Flag that next text should get this class
                    nextExpressionClass = conf.class;
                }
            } else {
                // Unknown tag — show visibly
                const span = document.createElement('span');
                span.className = 'tag';
                span.textContent = `[${tag}]`;
                marqueeEl.appendChild(span);
            }
        } else {
            // Normal text
            const txtSpan = document.createElement('span');
            txtSpan.textContent = part;
            if (nextExpressionClass) {
                txtSpan.classList.add(nextExpressionClass);
                nextExpressionClass = null;
            }
            marqueeEl.appendChild(txtSpan);
        }
    }
}
/* Called if no script loaded: center text in box */
function centerMarqueeText() {
    marqueeEl.style.position = 'relative';
    marqueeEl.style.left = '50%';
    marqueeEl.style.transform = 'translateX(-50%)';
}

/* Setup initial position so marquee starts off the right edge */
function setupMarqueePosition() {
    // reset transforms
    marqueeEl.style.transform = 'translateY(-50%) translateX(0)';
    marqueeEl.style.left = '0px';

    const windowRect = windowEl.getBoundingClientRect();
    const marqueeRect = marqueeEl.getBoundingClientRect();

    // We need widths after layout
    marqueeWidth = marqueeRect.width;
    const windowWidth = windowRect.width;

    // startX is where the left of marquee should be (placed just outside right edge)
    // We'll use translateX(currentX) to move it. currentX starts at windowWidth (so the marquee is off screen to the right).
    startX = windowWidth;
    currentX = startX;

    // apply immediate transform
    marqueeEl.style.transform = `translateY(-50%) translateX(${currentX}px)`;
}

/* Scrolling loop: move left by speedPx every tickMs ms */
function startScrolling() {
    if (animationInterval) clearInterval(animationInterval);
    animationInterval = setInterval(() => {
        currentX -= speedPx;
        marqueeEl.style.transform = `translateY(-50%) translateX(${currentX}px)`;

        // when the whole marquee has passed left side, reset to start
        if (currentX < -marqueeWidth) {
            currentX = startX;
        }
    }, tickMs);
    running = true;
}

/* Stop scrolling */
function stopScrolling() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    running = false;
}

function setupMarquee() {
    marqueeEl.style.transform = "translateY(-50%) translateX(0)";
    const wRect = windowEl.getBoundingClientRect();
    const mRect = marqueeEl.getBoundingClientRect();
    marqueeWidth = mRect.width;
    startX = wRect.width;
    currentX = startX;
    marqueeEl.style.transform = `translateY(-50%) translateX(${currentX}px)`;
}

/* Toggle on Space (matches your previous behavior: space triggers scrolling but doesn't record) */
window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') {
        ev.preventDefault();
        // If the marquee isn't set up yet (e.g. fonts/layout not ready), set it up
        if (!marqueeWidth || marqueeWidth === 0) {
            setupMarqueePosition();
        }
        if (running) stopScrolling();
        else startScrolling();
    }
});

/* Reset with R key */
window.addEventListener('keydown', (ev) => {
    if (ev.code === 'KeyR') {
        ev.preventDefault();
        stopScrolling();              // stop animation
        setupMarqueePosition();       // reposition to right
        running = false;              // ensure it's stopped
        console.log('Script reset. Ready to scroll again.');
    }
});

document.getElementById('goback').addEventListener("click", () => {
    window.location.href = "../tova.html"
})

let resizeTimer = null;
window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        setupMarqueePosition();
    }, 120);
});

let wasRunningBeforeBlur = false;
window.addEventListener('blur', () => {
    if (running) {
        wasRunningBeforeBlur = true;
        stopScrolling();
    } else wasRunningBeforeBlur = false;
});
window.addEventListener('focus', () => {
    if (wasRunningBeforeBlur) startScrolling();
});

window.addEventListener("resize", () => {
    if (!running) setupMarquee();
});

scriptWindow.addEventListener('click', () => {
    if (!marqueeWidth || marqueeWidth === 0) {
        setupMarqueePosition();
    }
    if (running) stopScrolling();
    else startScrolling();
});

resetBtn.addEventListener('click', () => {
    stopScrolling();              // stop animation
    setupMarqueePosition();       // reposition to right
    running = false;              // ensure it's stopped
    console.log('Script reset. Ready to scroll again.');
});

