import './style.css';
import { GENERATOR_VERSION, generateLevel, blockers, availableRats, DIFFICULTIES, levelCode, parseCode, type Difficulty, type Level } from './generator';
import { readSave, writeSave } from './storage';
import { RatScene, makeGame } from './scene';

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const icon = (name: string, size = 20) => {
  const paths: Record<string, string> = {
    back: '<path d="m14 6-6 6 6 6"/>',
    reset: '<path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7"/>',
    hint: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 .9-1 1.7-1 2H9c0-.3 0-1.1-1-2Z"/><path d="M12 1V0M3 5l-1-1m20 0-1 1"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    sound: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4c2 2 2 6 0 8m3-11c4 4 4 10 0 14"/>',
    mute: '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
    shuffle: '<path d="M3 5h3c4 0 8 14 12 14h3m-4-4 4 4-4 4M3 19h3c2 0 4-4 6-7m3-5c1-1 2-2 3-2h3m-4-4 4 4-4 4"/>',
    undo: '<path d="m9 4-6 6 6 6M3 10h10a7 7 0 0 1 0 14"/>',
    share: '<path d="M12 16V2m-5 5 5-5 5 5M5 12H3v9h18v-9h-2"/>',
    crown: '<path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Zm3 15h12"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    leaf: '<path d="M20 3C9 2 3 7 5 14s15 8 15-11ZM4 21 15 10"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] ?? paths.leaf}</svg>`;
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="game-shell">
    <header class="topbar">
      <button class="brand" id="brand" aria-label="Крысиный король — главное меню"><img src="${assetUrl('favicon.svg')}" alt=""/><span>Крысиный король<small>МАЛЕНЬКИЕ УЗЛЫ. БОЛЬШИЕ ДРУЖБЫ.</small></span></button>
      <nav aria-label="Главное меню"><button class="nav-button" id="levels-btn">Клубки</button><button class="icon-button" id="help-btn" aria-label="Как играть">${icon('help')}</button><button class="icon-button" id="sound-btn" aria-label="Включить звук">${icon('mute')}</button><button class="icon-button" id="settings-btn" aria-label="Настройки">${icon('settings')}</button></nav>
    </header>
    <main>
      <section id="home-view" class="home-view">
        <div class="home-copy"><div class="eyebrow">УЮТНАЯ ГОЛОВОЛОМКА БЕЗ СПЕШКИ</div><h1>У каждого клубка<br>есть <em>своя история.</em></h1><p>Пять минут тишины. Несколько любопытных крыс.<br class="desktop-break"> И хвосты, которые немного запутались.</p><button class="primary-button big" id="play-btn">Распутать клубок ${icon('arrow')}</button><div class="home-note">Одно касание — на одну крысу.<br>Никакого таймера. Всё получится.</div><div class="home-stats"><span><b id="home-rescued">0</b> крыс на свободе</span><span><b id="home-solved">0</b> историй распутано</span></div></div>
        <div class="home-art" aria-label="Мультяшные крысы с переплетёнными хвостами"><div class="art-ring"></div><svg viewBox="0 0 500 500" class="home-tangle" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M151 143C145 235 354 334 345 207S193 178 223 332" stroke="#f9f2e3" stroke-width="19"/><path d="M151 143C145 235 354 334 345 207S193 178 223 332" stroke="#a789a6" stroke-width="11"/><path d="M365 152C271 146 118 279 207 303S335 288 325 369" stroke="#f9f2e3" stroke-width="19"/><path d="M365 152C271 146 118 279 207 303S335 288 325 369" stroke="#8c9d7a" stroke-width="11"/><path d="M126 333C159 243 365 197 326 275S217 386 224 331" stroke="#f9f2e3" stroke-width="19"/><path d="M126 333C159 243 365 197 326 275S217 386 224 331" stroke="#c89169" stroke-width="11"/></g></svg><div class="home-rat r1">${ratIllustration('#bab6ca', '#e0d9e8')}</div><div class="home-rat r2">${ratIllustration('#a5af8b', '#d2d9b9')}</div><div class="home-rat r3">${ratIllustration('#c99f79', '#edd0a6')}</div><div class="home-rat r4">${ratIllustration('#9faab8', '#d1d8df')}</div><span class="art-caption">Кажется, мы опять немного увлеклись…</span><span class="art-spark s1">✧</span><span class="art-spark s2">✦</span><span class="art-spark s3">✧</span></div>
      </section>
      <section id="play-view" class="play-view" hidden>
        <aside class="story-panel"><button class="text-button back-home">${icon('back',16)} В убежище</button><div class="eyebrow">ГЛАВА 01 · ТИХИЙ ЧЕРДАК</div><h1>Чуть-чуть<br> <em>запутались.</em></h1><p class="story-description">Помоги маленьким соседям<br>снова разбежаться по делам.</p><div class="level-card"><div class="level-card-top"><span>Клубок <b id="level-number">01</b></span>${icon('leaf',19)}</div><div id="difficulty-label" class="difficulty-label">Уютно</div><div class="progress-row"><span id="progress-text">На свободе: 0 из 5</span><span id="progress-percent">0%</span></div><div class="progress-track"><div id="progress-fill"></div></div><div class="saved-note">Прогресс сохраняется на этом устройстве</div></div><div class="rule-card"><span class="rule-symbol">⌁</span><p><strong>Сначала — свободный хвост.</strong><br>Крыса уйдёт, если её хвост нигде<br>не прижат другим.</p></div><button id="new-btn" class="text-button new-button">${icon('shuffle',17)} Другой клубок</button></aside>
        <div class="board-column"><div class="board-heading"><span class="board-kicker">МАЛЕНЬКАЯ ИСТОРИЯ № <span id="board-number">01</span></span><button class="code-button" id="code-btn" aria-label="Поделиться кодом клубка">${icon('share',15)} Код клубка</button></div><div class="board-wrap"><div class="board-corner tl"></div><div class="board-corner br"></div><div id="game-canvas" role="group" aria-label="Игровое поле с крысами и переплетёнными хвостами"></div><div id="board-loading">Собираем хвосты в клубок…</div><div class="board-watermark" aria-hidden="true">RAT KING · LITTLE TANGLED TALES</div></div><div class="game-toolbar"><button class="tool-button" id="undo-btn" disabled>${icon('undo')}<span>Отменить</span></button><button class="hint-button" id="hint-btn">${icon('hint')}<span>Подсказка</span><span class="free-label">бесплатно</span></button><button class="tool-button" id="restart-btn">${icon('reset')}<span>Заново</span></button></div><p class="status-line" id="status" aria-live="polite">Нажми на крысу со свободным хвостом.</p><div id="accessible-rats" class="sr-only" aria-label="Крысы на игровом поле"></div></div>
      </section>
    </main>
    <footer class="footer"><span>${icon('leaf',14)} Каждому хвосту — немного свободы.</span><button id="about-btn">О прототипе</button></footer>
  </div>
  <dialog id="modal"><div class="dialog-top"><span class="eyebrow" id="dialog-eyebrow">КРЫСИНЫЙ КОРОЛЬ</span><button class="icon-button" id="close-modal" aria-label="Закрыть">${icon('close')}</button></div><div id="dialog-content"></div></dialog>
`;

function ratIllustration(body: string, light: string): string {
  return `<svg viewBox="0 0 130 160" fill="none" aria-hidden="true"><ellipse cx="66" cy="92" rx="40" ry="48" fill="#4f403815"/><g stroke="#655548" stroke-width="2.5" stroke-linejoin="round"><ellipse cx="35" cy="108" rx="10" ry="6" fill="#d4a39a"/><ellipse cx="97" cy="108" rx="10" ry="6" fill="#d4a39a"/><path d="M44 55C17 66 23 118 48 131C67 143 99 129 101 100C107 72 91 55 83 53Z" fill="${body}"/><path d="M42 78C34 94 41 114 51 119" stroke="${light}" stroke-width="7" stroke-linecap="round"/><ellipse cx="36" cy="45" rx="19" ry="21" fill="${body}"/><ellipse cx="94" cy="45" rx="19" ry="21" fill="${body}"/><ellipse cx="36" cy="45" rx="12" ry="14" fill="#d7aaa2" stroke="none"/><ellipse cx="94" cy="45" rx="12" ry="14" fill="#d7aaa2" stroke="none"/><path d="M39 50C36 28 55 22 60 15Q65 10 70 15C75 22 94 28 91 50Q65 76 39 50Z" fill="${light}"/></g><ellipse cx="52" cy="38" rx="4" ry="5" fill="#4b4039"/><ellipse cx="78" cy="38" rx="4" ry="5" fill="#4b4039"/><circle cx="51" cy="36" r="1.5" fill="#fff8ed"/><circle cx="77" cy="36" r="1.5" fill="#fff8ed"/><ellipse cx="65" cy="17" rx="5" ry="3.8" fill="#bc807d"/><g stroke="#796b5b" stroke-width="1.3" stroke-linecap="round"><path d="m48 28-23-5m23 12-25 3m59-10 23-5m-23 12 25 3"/></g></svg>`;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let save = readSave();
let level: Level;
let removed = new Set(save.removed);
let currentView: 'home' | 'play' = 'home';
const scene = new RatScene();
let game: ReturnType<typeof makeGame> | undefined;
const modal = $<HTMLDialogElement>('modal');
let statusTimer: ReturnType<typeof setTimeout> | undefined;
let completionTimer: ReturnType<typeof setTimeout> | undefined;
const releaseAudio = new Audio(assetUrl('audio/release.ogg')); releaseAudio.volume = 0.4;
const blockedAudio = new Audio(assetUrl('audio/blocked.ogg')); blockedAudio.volume = 0.2;
function sound(blocked = false): void {
  if (!save.sound) return;
  const audio = blocked ? blockedAudio : releaseAudio; audio.currentTime = 0; void audio.play().catch(() => {});
}
function persist(): void {
  save.removed = [...removed];
  if (!writeSave(save)) setStatus('Браузер не разрешил сохранение. Играть можно, но прогресс может потеряться.');
}
function setStatus(text: string, temporary = false): void {
  clearTimeout(statusTimer); $('status').textContent = text;
  if (temporary) statusTimer = setTimeout(() => { $('status').textContent = 'Нажми на крысу со свободным хвостом.'; }, 4300);
}
function openDialog(content: string, eyebrow = 'КРЫСИНЫЙ КОРОЛЬ'): void {
  $('dialog-content').innerHTML = content; $('dialog-eyebrow').textContent = eyebrow;
  if (!modal.open) modal.showModal();
}
function closeDialog(): void { modal.close(); }
$('close-modal').onclick = closeDialog;
modal.addEventListener('click', event => { if (event.target === modal) { const rect = modal.getBoundingClientRect(); const e = event as MouseEvent; if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) closeDialog(); } });

function update(): void {
  $('home-rescued').textContent = String(save.rescued); $('home-solved').textContent = String(save.solved);
  $('play-btn').innerHTML = `${save.started ? 'Продолжить историю' : 'Распутать клубок'} ${icon('arrow')}`;
  $('sound-btn').innerHTML = icon(save.sound ? 'sound' : 'mute');
  $('sound-btn').setAttribute('aria-label', save.sound ? 'Выключить звук' : 'Включить звук');
  document.documentElement.classList.toggle('reduce-motion', save.reducedMotion);
  if (!level) return;
  const total = level.rats.length, done = removed.size;
  $('level-number').textContent = String(save.number).padStart(2, '0'); $('board-number').textContent = String(save.number).padStart(2, '0');
  $('difficulty-label').textContent = `${DIFFICULTIES[save.difficulty].label} · ${total} крыс`;
  $('progress-text').textContent = `На свободе: ${done} из ${total}`;
  $('progress-percent').textContent = `${Math.round(done / total * 100)}%`;
  $('progress-fill').style.width = `${done / total * 100}%`;
  $<HTMLButtonElement>('undo-btn').disabled = done === 0;
  $<HTMLButtonElement>('hint-btn').disabled = done === total;
  $('accessible-rats').innerHTML = level.rats.filter(r => !removed.has(r.id)).map(r => `<button data-rat="${r.id}">Крыса ${r.id + 1}: ${r.name}. ${blockers(level, r.id, removed).length ? 'Хвост прижат' : 'Хвост свободен'}.</button>`).join('');
  $('accessible-rats').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => scene.attempt(Number(b.dataset.rat)));
}
function loadCurrent(): void {
  clearTimeout(completionTimer);
  $('board-loading').hidden = false;
  try {
    level = generateLevel(save.seed, save.difficulty, save.generationVersion);
    // Validate a restored move sequence; a damaged save must not remove arbitrary blocked rats.
    const valid = new Set<number>();
    for (const id of save.removed) {
      if (level.rats.some(r => r.id === id) && !valid.has(id) && blockers(level, id, valid).length === 0) valid.add(id);
      else break;
    }
    removed = valid;
    scene.loadLevel(level, removed); update();
    if (!save.fingerprints.includes(level.fingerprint)) save.fingerprints.push(level.fingerprint);
    save.fingerprints = save.fingerprints.slice(-2000); persist();
    $('board-loading').hidden = true;
    setStatus('Нажми на крысу со свободным хвостом. Удерживай, чтобы проследить хвост.');
    if (removed.size === level.rats.length && currentView === 'play') completionTimer = setTimeout(showVictory, 150);
  } catch (error) {
    $('board-loading').textContent = 'Не удалось собрать этот клубок. Попробуй другой.';
    setStatus(error instanceof Error ? error.message : 'Ошибка генерации уровня.');
  }
}
function showView(view: 'home' | 'play'): void {
  currentView = view; $('home-view').hidden = view !== 'home'; $('play-view').hidden = view !== 'play';
  if (view === 'play') {
    const firstPlay = !save.started;
    save.started = true; persist(); loadCurrent();
    if (!game) game = makeGame(scene, $('game-canvas'));
    else requestAnimationFrame(() => game?.scale.setParentSize($('game-canvas').clientWidth, $('game-canvas').clientHeight));
    if (firstPlay) $('help-btn').click();
  }
  else { clearTimeout(completionTimer); update(); }
}
function startNew(difficulty: Difficulty = save.difficulty, seed?: string, number = save.number + 1, version = GENERATOR_VERSION): void {
  clearTimeout(completionTimer);
  let nextSeed = seed ?? `nest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  if (!seed) {
    for (let retry = 0; retry < 12; retry++) {
      const candidate = generateLevel(nextSeed, difficulty, version);
      if (!save.fingerprints.includes(candidate.fingerprint)) break;
      nextSeed += 'x';
    }
  }
  save.generationVersion = version; save.difficulty = difficulty; save.seed = nextSeed; save.number = number; save.removed = []; removed.clear();
  closeDialog(); showView('play');
}
function showVictory(): void {
  if (currentView !== 'play' || removed.size !== level.rats.length) return;
  openDialog(`<div class="victory-medal">${icon('crown',38)}</div><h2>Каждый хвост свободен!</h2><p>Соседи снова разбежались по делам.<br>А где-то уже запуталась новая история.</p><div class="victory-stat">${level.rats.length}<span>маленьких спасений</span></div><button id="next-btn" class="primary-button full">Следующий клубок ${icon('arrow')}</button><button id="victory-home" class="text-button centered">Вернуться в убежище</button>`, 'КЛУБОК РАСПУТАН');
  $('next-btn').onclick = () => startNew(); $('victory-home').onclick = () => { closeDialog(); showView('home'); };
}
scene.callbacks = {
  reducedMotion: () => save.reducedMotion,
  onRelease: id => {
    removed.add(id); sound();
    const completed = removed.size === level.rats.length;
    const code = levelCode(level.seed, level.difficulty, level.version);
    if (completed && !save.completed.includes(code)) {
      save.completed.push(code); save.completed = save.completed.slice(-500);
      save.solved++; save.rescued += level.rats.length;
    }
    persist(); update();
    setStatus(completed ? 'Все на свободе. Ты распутал эту историю!' : `${level.rats[id].name} на свободе! Осталось ${level.rats.length - removed.size}.`, true);
    if (completed) completionTimer = setTimeout(showVictory, save.reducedMotion ? 100 : 400);
  },
  onBlocked: (id, blocker) => { sound(true); setStatus(`${level.rats[id].name} пока не может уйти: хвост держит ${level.rats[blocker].name} (№ ${blocker + 1}).`, true); },
  onInspect: id => { if (id !== null) setStatus(`Это ${level.rats[id].name}, № ${id + 1}. Проследи выделенный хвост до самого кончика.`); else setStatus('Нажми на крысу со свободным хвостом.'); },
};
loadCurrent(); update();
$('play-btn').onclick = () => showView('play');
$('brand').onclick = () => showView('home');
document.querySelectorAll<HTMLButtonElement>('.back-home').forEach(b => b.onclick = () => showView('home'));
$('sound-btn').onclick = () => { save.sound = !save.sound; persist(); update(); sound(); };
$('new-btn').onclick = () => { if (!scene.isBusy()) startNew(); };
$('hint-btn').onclick = () => {
  const id = scene.showHint();
  if (id !== undefined) setStatus(`${level.rats[id].name} (№ ${id + 1}) может уйти: хвост нигде не прижат.`, true);
};
$('restart-btn').onclick = () => { if (scene.isBusy()) return; clearTimeout(completionTimer); save.removed = []; removed.clear(); persist(); loadCurrent(); setStatus('Начнём эту историю с начала.'); };
$('undo-btn').onclick = () => {
  if (scene.isBusy() || !removed.size) return;
  clearTimeout(completionTimer); const ids = [...removed]; ids.pop(); save.removed = ids; removed = new Set(ids); persist(); loadCurrent(); setStatus('Последняя крыса вернулась. Можно попробовать другой порядок.');
};
$('help-btn').onclick = () => openDialog(`<h2>У каждого хвоста<br>есть выход.</h2><div class="help-steps"><div><span>1</span><p><strong>Проследи хвост.</strong><br>В пересечениях один хвост лежит поверх другого.</p></div><div><span>2</span><p><strong>Найди свободную крысу.</strong><br>Она уйдёт, если её хвост нигде не находится под чужим.</p></div><div><span>3</span><p><strong>Нажми — и отпусти.</strong><br>Крыса убежит и освободит дорогу остальным.</p></div></div><p class="dialog-note">Удерживай крысу, чтобы выделить её хвост. Ошибки не отнимают жизни. Любой разрешённый ход безопасен.</p><button id="got-it" class="primary-button full">Всё понятно ${icon('check')}</button>`, 'КАК ИГРАТЬ');
$('help-btn').addEventListener('click', () => { $('got-it').onclick = closeDialog; });

function openLevels(): void {
  openDialog(`<h2>Какой клубок<br>распутаем?</h2><p>У каждой истории — свой узор хвостов.</p><div class="difficulty-options">${(Object.keys(DIFFICULTIES) as Difficulty[]).map(d => `<button class="difficulty-option ${save.difficulty === d ? 'selected' : ''}" data-difficulty="${d}"><span>${d === 'cozy' ? '⌁' : d === 'curious' ? '❧' : '✧'}</span><div><strong>${DIFFICULTIES[d].label}</strong><small>${DIFFICULTIES[d].description}</small></div>${icon('arrow',18)}</button>`).join('')}</div><button id="daily-btn" class="daily-button">${icon('leaf')} Клубок дня <span>один для всех</span></button><div class="code-entry"><label for="level-code-input">Или открой клубок по коду</label><div><input id="level-code-input" autocomplete="off" autocapitalize="characters" placeholder="RK2-U-attic-1" maxlength="60"/><button class="secondary-button" id="load-code-btn">Открыть</button></div><p id="code-error" class="input-error" role="status"></p></div>`, 'КОЛЛЕКЦИЯ ИСТОРИЙ');
  document.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach(b => b.onclick = () => startNew(b.dataset.difficulty as Difficulty));
  $('daily-btn').onclick = () => {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yekaterinburg', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('-', '');
    startNew('curious', `daily-${date}`);
  };
  const submit = () => {
    const parsed = parseCode($<HTMLInputElement>('level-code-input').value);
    if (!parsed) { $('code-error').textContent = 'Проверь код: например, RK2-U-attic-1.'; return; }
    startNew(parsed.difficulty, parsed.seed, save.number + 1, parsed.version);
  };
  $('load-code-btn').onclick = submit;
  $('level-code-input').addEventListener('keydown', event => { if ((event as KeyboardEvent).key === 'Enter') submit(); });
}
$('levels-btn').onclick = openLevels;
$('code-btn').onclick = () => {
  const code = levelCode(level.seed, level.difficulty, level.version);
  openDialog('<h2>Маленькая история<br>для друга.</h2><p>Этот код откроет тот же клубок, с теми же хвостами.</p><input id="share-code" class="share-code" readonly aria-label="Код клубка"/><button class="primary-button full" id="copy-btn">Скопировать код</button><p class="dialog-note">Открыть код можно в меню «Клубки».</p>', 'ПОДЕЛИТЬСЯ КЛУБКОМ');
  $<HTMLInputElement>('share-code').value = code;
  $('copy-btn').onclick = async () => {
    try { await navigator.clipboard.writeText(code); $('copy-btn').textContent = 'Код скопирован'; }
    catch { $<HTMLInputElement>('share-code').select(); $('copy-btn').textContent = 'Нажми Ctrl+C или выбери «Копировать»'; }
  };
};
$('settings-btn').onclick = () => {
  openDialog(`<h2>Чтобы было уютно.</h2><label class="setting-row"><span><strong>Звуки</strong><small>Тихие щелчки и маленькие победы</small></span><input type="checkbox" id="sound-setting" ${save.sound ? 'checked' : ''}/></label><label class="setting-row"><span><strong>Меньше движения</strong><small>Короткие анимации освобождения</small></span><input type="checkbox" id="motion-setting" ${save.reducedMotion ? 'checked' : ''}/></label><button id="settings-help" class="text-button">${icon('help',17)} Как играть</button><p class="dialog-note">Прогресс хранится в этом браузере на этом устройстве. После загрузки текущая игра работает без подключения к сети. Для повторного открытия пока нужен доступ к игре.</p>`, 'НАСТРОЙКИ');
  $('sound-setting').onchange = () => { save.sound = $<HTMLInputElement>('sound-setting').checked; persist(); update(); sound(); };
  $('motion-setting').onchange = () => { save.reducedMotion = $<HTMLInputElement>('motion-setting').checked; persist(); update(); };
  $('settings-help').onclick = () => $('help-btn').click();
};
$('about-btn').onclick = () => openDialog(`<h2>Маленькое начало<br>большого клубка.</h2><p>Крысиный король · игровой прототип 0.1</p><p>Каждый клубок создаётся генератором и проходит автоматическую проверку решения. Крысы нарисованы специально для игры; звуки интерфейса — Kenney, CC0.</p><p class="dialog-note">Без рекламы. Без таймера. Все подсказки бесплатны.</p><div class="source-links"><a href="https://kenney.nl/assets/ui-pack" target="_blank" rel="noopener noreferrer">Kenney UI Pack ↗</a><a href="${assetUrl('ASSET-SOURCES.md')}" target="_blank" rel="noopener noreferrer">Источники и лицензии ↗</a></div>`, 'ОБ ИГРЕ');
document.addEventListener('keydown', event => {
  if (modal.open || currentView !== 'play' || event.ctrlKey || event.altKey || event.metaKey || event.target instanceof HTMLInputElement || event.repeat) return;
  if (/^[1-9]$/.test(event.key)) scene.attempt(Number(event.key) - 1);
  if (event.key.toLowerCase() === 'h' || event.key.toLowerCase() === 'р') $('hint-btn').click();
});

// A deliberately read-only diagnostic surface for generator/browser QA.
Object.assign(window, { ratKing: { getState: () => ({ level, removed: [...removed], available: availableRats(level, removed), view: currentView }) } });
