//names (just for prettier code)
const yanaName = "Yana";  
const levaName = "Lev";   

//heart base settings
const HEART_COLLISION_R = 22;
const HEART_SPACING = 95;
const HEART_PLAYER_SAFE = 150;

//beep
const BEEP_FREQ = 660;
const BEEP_DURATION = 0.06;
const BEEP_VOL = 0.06;

//mobile
const PHONE_SCREEN_SIZE = 600;

//world
const WORLD_PADDING = 36;

//player
const PLAYER_RAD = 16;
const PLAYER_SPEED = 260;

//attempts to spawn a single heart
const HEART_SPAWN_ATTEMPTS = 200;

//confetti 
const CONFETTI_COUNT = 140;

//smoothing (loop)
const SMOOTHING_PARAM = 12;

const reasons = [
  "Because you make even normal days feel like something I want to remember!",
  "Because meeting you was like listening to a song for the first time and knowing it would be my favorite!",
  "Because anywhere with you, is everywhere I want to be!",
  "Because I love how you care deeply, even when it seems like the whole Universe is against us!",
  "Because you're funny. Like dangerously funny!",
  "Because you inspire me to be better without ever making me feel small!",
  "Because you feel like home. The comfy, safe kind!",
  "Because I'm super grateful for you! More than you realize!"
];

const finalMessage = "Happy Valentine's Day, Yana! 💘\n\nIf love was a program, you'd be my favorite feature!\n\n- Leva";

const TOTAL_HEARTS = reasons.length;
document.getElementById("heartTotal").textContent = TOTAL_HEARTS;

const subtitle = document.getElementById("subtitle");
subtitle.textContent = `Hi Yana! Happy Valentines! ❤️`;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const heartCountEl = document.getElementById("heartCount");
const barFill = document.getElementById("barFill");
const reasonsList = document.getElementById("reasonsList");

const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
const btnClose = document.getElementById("btnClose");

const btnStart = document.getElementById("btnStart");
const btnMute = document.getElementById("btnMute");
const confettiLayer = document.getElementById("confetti");
const cardRoot = document.getElementById("cardRoot");

const touchPad = document.querySelector(".touchPad");

//new fix:
function enableTouchControlsIfNeeded() 
{
  if ("ontouchstart" in window || navigator.maxTouchPoints > 0) 
  {
    touchPad.style.display = "grid";
  }
}

enableTouchControlsIfNeeded();

let running = false;
let won = false;

let soundOn = true;
let audioCtx = null;

function beep(freq = BEEP_FREQ, duration = BEEP_DURATION, type = "sine", volume = BEEP_VOL) 
{
    if (!soundOn) return;
    try 
    {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const t0 = audioCtx.currentTime;
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(t0);
        o.stop(t0 + duration + 0.02);
    } 
    catch 
    {
        /* Ignore */
    }
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rand(a, b) { return Math.random() * (b - a) + a; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

const world = 
{
    w: canvas.width,
    h: canvas.height,
    pad: WORLD_PADDING
};

const player = 
{
    x: world.w * 0.18,
    y: world.h * 0.55,
    r: PLAYER_RAD,
    speed: PLAYER_SPEED,
    vx: 0,
    vy: 0,
    faceT: 0
};

let hearts = [];
let collected = 0;
let unlocked = []; 

function spawnHearts() 
{
    hearts = [];
    const n = TOTAL_HEARTS;

    for (let i = 0; i < n; i++) 
    {
        let tries = 0;
        while (tries++ < HEART_SPAWN_ATTEMPTS) 
        {
            const x = rand(world.pad, world.w - world.pad);
            const y = rand(world.pad, world.h - world.pad);

            if (dist(x, y, player.x, player.y) < HEART_PLAYER_SAFE) continue;

            let ok = true;
            for (const h of hearts) 
            {
                if (dist(x, y, h.x, h.y) < HEART_SPACING) { ok = false; break; }
            }
            if (!ok) continue;

            hearts.push({
                id: i,
                x, y,
                r: HEART_COLLISION_R,
                pulse: rand(0, Math.PI * 2),
                alive: true
            });
            break;
        }
    }
}

function resetGame() 
{
    running = true;
    won = false;
    collected = 0;
    unlocked = [];

    player.x = world.w * 0.18;
    player.y = world.h * 0.55;
    player.vx = 0;
    player.vy = 0;

    spawnHearts();
    updateHUD();
    renderReasons();
    closeModal();
    confettiLayer.classList.remove("show");
    confettiLayer.innerHTML = "";

    beep(520, 0.05, "triangle", 0.05);
    beep(660, 0.06, "sine", 0.06);
}

function updateHUD() 
{
    heartCountEl.textContent = String(collected);
    const pct = (collected / TOTAL_HEARTS) * 100;
    barFill.style.width = `${pct}%`;
}

function renderReasons() 
{
    reasonsList.innerHTML = "";
    if (unlocked.length === 0) 
    {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Collect a heart to reveal the first reason ✨";
        reasonsList.appendChild(p);
        return;
    }

    unlocked.forEach((txt, idx) => 
    {
        const row = document.createElement("div");
        row.className = "reasonChip";

        const dot = document.createElement("div");
        dot.className = "dot";

        const wrap = document.createElement("div");

        const t = document.createElement("div");
        t.style.fontSize = "13px";
        t.style.color = "rgba(255,255,255,0.92)";
        t.style.fontWeight = "650";
        t.textContent = `Reason #${idx + 1}`;

        const b = document.createElement("div");
        b.style.fontSize = "13px";
        b.style.color = "rgba(255,255,255,0.70)";
        b.style.marginTop = "3px";
        b.textContent = txt;

        wrap.appendChild(t);
        wrap.appendChild(b);
        row.appendChild(dot);
        row.appendChild(wrap);

        reasonsList.appendChild(row);
    });
}

function openModal(title, body) 
{
    modalTitle.textContent = title;
    modalBody.textContent = body;
    modal.classList.add("open");
    running = false;
}

function closeModal() 
{
    modal.classList.remove("open");
    if (!won) running = true;
}

btnClose.addEventListener("click", () => closeModal());
// modal.addEventListener("click", (e) => 
// {
//     if (e.target === modal) closeModal();
// });

btnStart.addEventListener("click", () => resetGame());
btnMute.addEventListener("click", () => 
{
    soundOn = !soundOn;
    btnMute.textContent = `Sound: ${soundOn ? "On" : "Off"}`;
    beep(440, 0.04, "sine", 0.04);
});

//touchpad
const touchState = { up:false, down:false, left:false, right:false };
document.querySelectorAll(".dpad button[data-dir]").forEach(btn => 
{
    const dir = btn.getAttribute("data-dir");
    const set = (v) => { touchState[dir] = v; };
    btn.addEventListener("pointerdown", (e) => 
    {
        e.preventDefault();
        set(true);
        btn.setPointerCapture(e.pointerId);
    });
    btn.addEventListener("pointerup", (e) => { e.preventDefault(); set(false); });
    btn.addEventListener("pointercancel", () => set(false));
});

//keyboard
const keys = Object.create(null);
window.addEventListener("keydown", (e) => 
{
    keys[e.key.toLowerCase()] = true;
    if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key.toLowerCase() === "v") console.log("valentine_mode = true 💘");
});
window.addEventListener("keyup", (e) => 
{
    keys[e.key.toLowerCase()] = false;
});

function inputVector() 
{
    let x = 0, y = 0;
    const up = keys["w"] || keys["arrowup"] || touchState.up;
    const down = keys["s"] || keys["arrowdown"] || touchState.down;
    const left = keys["a"] || keys["arrowleft"] || touchState.left;
    const right = keys["d"] || keys["arrowright"] || touchState.right;

    if (up) y -= 1;
    if (down) y += 1;
    if (left) x -= 1;
    if (right) x += 1;

    const len = Math.hypot(x, y) || 1;
    return { x: x/len, y: y/len, any: (up||down||left||right) };
}

function collectHeart(h) 
{
    h.alive = false;
    collected++;

    const reason = reasons[h.id];
    unlocked.push(reason);

    updateHUD();
    renderReasons();

    beep(880, 0.05, "sine", 0.06);
    beep(1320, 0.06, "triangle", 0.05);

    if (collected >= TOTAL_HEARTS) 
    {
        winGame();
    } 
    else 
    {
        openModal("💗 You found a heart!", reason);
    }
}

function winGame() 
{
    won = true;
    running = false;

    openModal("🎉 Final Surprise", finalMessage);
    confettiBurst();

    beep(660, 0.07, "sine", 0.06);
    setTimeout(() => beep(880, 0.07, "sine", 0.06), 90);
    setTimeout(() => beep(990, 0.09, "triangle", 0.06), 190);
}

function confettiBurst() 
{
    confettiLayer.classList.add("show");
    confettiLayer.innerHTML = "";

    const colors = ["#ff4d8d", "#7c5cff", "#ffd1e5", "#2ee59d", "#ffffff"];
    const count = CONFETTI_COUNT;

    const rect = cardRoot.getBoundingClientRect();
    for (let i = 0; i < count; i++) 
    {
        const p = document.createElement("i");
        const x = rand(0, rect.width);
        const d = rand(0.8, 2.1);
        const w = rand(7, 12);
        const h = rand(12, 18);

        p.style.left = `${x}px`;
        p.style.top = `${rand(-40, -10)}px`;
        p.style.width = `${w}px`;
        p.style.height = `${h}px`;
        p.style.background = colors[(Math.random() * colors.length) | 0];
        p.style.animationDuration = `${d}s`;
        p.style.animationDelay = `${rand(0, 0.25)}s`;
        p.style.transform = `translateY(-20px) rotate(${rand(0, 180)}deg)`;

        confettiLayer.appendChild(p);
    }

    setTimeout(() => 
    {
        confettiLayer.classList.remove("show");
        confettiLayer.innerHTML = "";
    }, 2600);
}

function drawBackground(t) 
{
    ctx.save();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 70; i++) 
    {
        const px = (i * 137.5) % world.w;
        const py = (i * 97.3) % world.h;
        const tw = (Math.sin(t * 1.1 + i) + 1) * 0.5;
        ctx.fillStyle = `rgba(255,255,255,${0.05 + tw*0.12})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.0 + tw * 1.8, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();

    const g = ctx.createRadialGradient(world.w*0.5, world.h*0.5, world.h*0.2, world.w*0.5, world.h*0.5, world.h*0.8);
    g.addColorStop(0, "rgba(0,0,0,0.0)");
    g.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, world.w, world.h);
}

function drawPlayer() 
{
    ctx.save();

    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 24);
    glow.addColorStop(0, "rgba(255,77,141,0.55)");
    glow.addColorStop(1, "rgba(255,77,141,0.0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 26, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
    ctx.fill();

    const fx = player.x + Math.cos(player.faceT) * 7;
    const fy = player.y + Math.sin(player.faceT) * 7;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.arc(fx, fy, 4.3, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function drawHeart(x, y, s, a = 1) 
{
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.globalAlpha = a;

    const g = ctx.createRadialGradient(0, 0, 0.02, 0, 0, 0.6);
    g.addColorStop(0, "rgba(255,77,141,0.55)");
    g.addColorStop(1, "rgba(255,77,141,0.0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 0.65, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,77,141,0.98)";
    ctx.beginPath();
    ctx.moveTo(0, 0.2);
    ctx.bezierCurveTo(0, -0.3, -0.6, -0.3, -0.6, 0.2);
    ctx.bezierCurveTo(-0.6, 0.65, 0, 0.95, 0, 1.05);
    ctx.bezierCurveTo(0, 0.95, 0.6, 0.65, 0.6, 0.2);
    ctx.bezierCurveTo(0.6, -0.3, 0, -0.3, 0, 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-0.25, 0.05, 0.12, 0.18, 0.3, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
}

function drawHearts(t) 
{
    hearts.forEach(h => 
    {
        if (!h.alive) return;

        h.pulse += 0.05;
        const bob = Math.sin(t * 3 + h.pulse) * 5;

        const base = 32;       
        const pulse = 5;      
        const scale = base + (Math.sin(t * 4 + h.pulse) + 1) * (pulse / 2);

        drawHeart(h.x, h.y + bob, scale, 1);
    });
}


function drawGoalText() 
{
    if (won) return;
    if (window.innerWidth < PHONE_SCREEN_SIZE) return;

    ctx.save();
    ctx.font = "700 16px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(`Collect ${TOTAL_HEARTS - collected} more 💘`, 20, 30);

    ctx.font = "500 13px ui-sans-serif, system-ui";
    ctx.fillStyle = "rgba(255,255,255,0.60)";
    ctx.fillText(`You've got this!`, 20, 50);
    ctx.restore();
}

let last = performance.now();
function loop(now) 
{
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    const iv = inputVector();
    const targetVx = iv.x * player.speed;
    const targetVy = iv.y * player.speed;

    const smoothing = SMOOTHING_PARAM;
    player.vx += (targetVx - player.vx) * clamp(dt * smoothing, 0, 1);
    player.vy += (targetVy - player.vy) * clamp(dt * smoothing, 0, 1);

    if (iv.any) player.faceT = Math.atan2(iv.y, iv.x);

    if (running) 
    {
        player.x += player.vx * dt;
        player.y += player.vy * dt;
    }

    player.x = clamp(player.x, world.pad, world.w - world.pad);
    player.y = clamp(player.y, world.pad, world.h - world.pad);

    if (running) 
    {
        for (const h of hearts) 
        {
            if (!h.alive) continue;
            const d = dist(player.x, player.y, h.x, h.y);
            if (d < player.r + h.r) 
            {
                collectHeart(h);
                break;
            }
        }
    }

    ctx.clearRect(0, 0, world.w, world.h);
    const t = now / 1000;
    drawBackground(t);
    drawHearts(t);
    drawPlayer();
    drawGoalText();

    requestAnimationFrame(loop);
}

resetGame();

requestAnimationFrame(loop);
