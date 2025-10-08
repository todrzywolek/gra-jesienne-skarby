/* === Sortowanie Jesiennych Skarbów ===
   Zasady:
   - Losujemy 4 z 7 kategorii -> tworzymy kosze po prawej
   - Z wybranych 4 losujemy spadający skarb (musi pasować do jednego z koszy)
   - Dziecko przeciąga palcem skarb do właściwego kosza
   - Poprawnie -> punkt i nowy skarb
   - Zły kosz lub puszczenie palca poza koszem -> skarb wraca na tor i opada dalej
   - Gdy spadnie poniżej pola -> nowy skarb
   - 10 punktów -> modal wygranej z losowym trofeum (1 z 7)
*/

(() => {
  const playfield = document.getElementById('playfield');
  const binsEl = document.getElementById('bins');
  const scoreEl = document.getElementById('score');
  const restartBtn = document.getElementById('restartBtn');

  const winModal = document.getElementById('winModal');
  const playAgainBtn = document.getElementById('playAgain');
  const trophyIcon = document.getElementById('trophyIcon');

  // Konfiguracja gry
  const TARGET_SCORE = 10;
  const FALL_SPEED_PX_PER_SEC = 60; // wolne tempo dla 5-6 latków
  const TREASURE_SIZE = 80;
  
  // Dynamic treasure size based on screen size
  function getTreasureSize() {
    const isTablet = window.innerWidth >= 1024 && window.innerWidth <= 1400 && window.innerHeight >= 700;
    const isIPhone12Pro = window.innerWidth <= 390 && window.innerHeight <= 900;
    const isMobile = window.innerWidth <= 480;
    if (isTablet) return 84;
    if (isIPhone12Pro) return 55;
    if (isMobile) return 60;
    return 80;
  }

  // 7 skarbów (id musi być proste; name do czytania; svg -> mała, lekka grafika)
  const ASSETS = [
    {
      id:'lisc',
      name:'Liście',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 40c10-20 30-28 40-28-4 12-12 32-32 40-4 2-10 2-10 2s0-6 2-14z" fill="#ea580c"/>
        <path d="M12 40c8 4 12 8 20 12" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`
    },
    {
      id:'kasztan',
      name:'Kasztany',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 10c10 8 18 10 18 22s-10 20-18 20-18-8-18-20 8-14 18-22z" fill="#92400e"/>
        <circle cx="32" cy="38" r="8" fill="#fde68a"/>
      </svg>`
    },
    {
      id:'grzyb',
      name:'Grzyby',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 28c2-10 16-16 22-16s20 6 22 16H10z" fill="#b91c1c"/>
        <rect x="28" y="28" width="8" height="20" rx="3" fill="#f5f5f4"/>
        <circle cx="24" cy="22" r="3" fill="#fde68a"/>
        <circle cx="40" cy="20" r="3" fill="#fde68a"/>
        <circle cx="34" cy="24" r="2.5" fill="#fde68a"/>
      </svg>`
    },
    {
      id:'owoce',
      name:'Owoce',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="36" r="12" fill="#f97316"/>
        <circle cx="40" cy="36" r="10" fill="#a3e635"/>
        <path d="M23 20c4 0 8-2 10-6" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`
    },
    {
      id:'zoladz',
      name:'Żołędzie',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 22h24c0 8-6 16-12 16S20 30 20 22z" fill="#a16207"/>
        <rect x="20" y="18" width="24" height="6" rx="3" fill="#854d0e"/>
        <path d="M32 18v-6" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
      </svg>`
    },
    {
      id:'dynia',
      name:'Dynie',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="36" rx="12" ry="14" fill="#f97316"/>
        <ellipse cx="40" cy="36" rx="12" ry="14" fill="#fb923c"/>
        <rect x="30" y="18" width="6" height="8" rx="2" fill="#15803d"/>
      </svg>`
    },
    {
      id:'jagody',
      name:'Jagody',
      svg:`<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <circle cx="22" cy="34" r="9" fill="#4f46e5"/>
        <circle cx="34" cy="26" r="8" fill="#6366f1"/>
        <circle cx="42" cy="36" r="9" fill="#4338ca"/>
        <path d="M30 18c4-2 8-2 10-6" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>`
    }
  ];

  // Stan
  let selectedCategories = [];
  let score = 0;
  let running = false;

  // Aktualny spadający skarb
  let current = null; // {el, id, x, y, vx, vy, lastSafe:{x,y}, dragging, spawnTimestamp}

  // Narzędzia
  const pickRandom = arr => arr[Math.floor(Math.random()*arr.length)];
  const shuffle = arr => [...arr].sort(()=>Math.random()-.5);

  function svgToDataURI(svg){
    const encoded = encodeURIComponent(svg).replace(/'/g, "%27").replace(/"/g, "%22");
    return `data:image/svg+xml;charset=UTF-8,${encoded}`;
  }

  function makeIconDiv(asset, size=64){
    const div = document.createElement('div');
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.backgroundImage = `url("${svgToDataURI(asset.svg)}")`;
    div.style.backgroundSize = 'contain';
    div.style.backgroundRepeat = 'no-repeat';
    div.style.backgroundPosition = 'center';
    return div;
  }

  function createBins(){
    binsEl.innerHTML = '';
    selectedCategories.forEach(asset => {
      const bin = document.createElement('div');
      bin.className = 'bin';
      bin.dataset.accept = asset.id;

      const chest = document.createElement('div');
      chest.className = 'chest';

      const label = document.createElement('div');
      label.className = 'label';
      label.appendChild(makeIconDiv(asset, 32));

      chest.appendChild(label);

      const name = document.createElement('div');
      name.className = 'name';
      name.textContent = asset.name;

      bin.appendChild(chest);
      bin.appendChild(name);
      binsEl.appendChild(bin);
    });
  }

  function spawnTreasure(){
    const asset = pickRandom(selectedCategories);

    const el = document.createElement('div');
    el.className = 'treasure';
    el.setAttribute('aria-label', asset.name);
    el.dataset.id = asset.id;

    const img = document.createElement('img');
    img.alt = asset.name;
    img.src = svgToDataURI(asset.svg);
    el.appendChild(img);

    // losowe X w obrębie pola gry
    const pfRect = playfield.getBoundingClientRect();
    const treasureSize = getTreasureSize();
    const maxX = pfRect.width - treasureSize - 8;
    const x = Math.max(8, Math.floor(Math.random()*maxX));
    const y = -treasureSize; // start nad górną krawędzią
    position(el, x, y);

    playfield.appendChild(el);

    current = {
      el, id: asset.id, x, y,
      vy: FALL_SPEED_PX_PER_SEC,
      dragging:false,
      lastSafe: {x, y},
    };

    attachDrag(el);
  }

  function position(el, x, y){
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  function positionFixed(el, left, top){
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}
function toViewportCoords(xInPlayfield, yInPlayfield){
  // zamiana współrzędnych z układu playfield -> viewport (dla pozycji fixed)
  const pfRect = playfield.getBoundingClientRect();
  return {
    left: pfRect.left + xInPlayfield,
    top:  pfRect.top  + yInPlayfield
  };
}

function attachDrag(el){
  let pointerId = null;
  let globalDragging = false;   // czy jedziemy w trybie fixed poza playfield
  let dragOffset = {dx: 0, dy: 0}; // przesunięcie palca względem lewego-górnego rogu skarbu w trybie fixed

  const onDown = (e)=>{
    e.preventDefault();
    if(!current || e.target.closest('.treasure') !== current.el) return;

    pointerId = e.pointerId;
    current.dragging = true;
    current.el.classList.add('dragging');
    current.lastSafe = {x: current.x, y: current.y}; // pozycja do której wracamy

    // przełącz na tryb "globalny" (fixed) – dzięki temu możemy wyjechać nad skrzynie
    const startInViewport = toViewportCoords(current.x, current.y);
    current.el.classList.add('global');
    current.el.style.position = 'fixed';
    positionFixed(current.el, startInViewport.left, startInViewport.top);

    // zapamiętaj, gdzie w elemencie złapaliśmy
    dragOffset.dx = e.clientX - startInViewport.left;
    dragOffset.dy = e.clientY - startInViewport.top;

    globalDragging = true;

    // Słuchamy na window – nie zgubimy ruchu poza playfield
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUpOrCancel, { once: true });
    window.addEventListener('pointercancel', onUpOrCancel, { once: true });
  };

  const onMove = (e)=>{
    if(!current || !current.dragging || !globalDragging) return;

    // pozycja skarbu – tak, by punkt złapania pozostał pod palcem
    const left = e.clientX - dragOffset.dx;
    const top  = e.clientY - dragOffset.dy;

    positionFixed(current.el, left, top);
  };

  const onUpOrCancel = ()=>{
    if(!current) return;

    // Sprawdź trafienie w kosz (na bazie globalnego położenia)
    const hitBin = detectBinHit(current.el);
    if(hitBin && hitBin.dataset.accept === current.id){
      current.el.classList.add('correct');
      incrementScore();
      current.el.remove();
      current = null;
      cleanupDrag();
      if(running) spawnTreasure();
      return;
    }

    // Zły kosz albo brak kosza -> wracamy do ostatniej bezpiecznej pozycji i kontynuujemy opadanie
    current.el.classList.remove('wrong'); // na wszelki wypadek
    current.el.classList.remove('global');
    current.el.style.position = 'absolute';
    current.dragging = false;
    globalDragging = false;

    // odtwórz translate w układzie playfield
    current.x = current.lastSafe.x;
    current.y = current.lastSafe.y;
    position(current.el, current.x, current.y);
    current.el.classList.remove('dragging');

    cleanupDrag();
  };

  function cleanupDrag(){
    window.removeEventListener('pointermove', onMove);
  }

  // Zdarzenia startowe na samym elemencie (pewne złapanie na dotyku)
  el.addEventListener('pointerdown', onDown);
}

  function rectsOverlap(a, b){
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function detectBinHit(treasureEl){
    const tRect = treasureEl.getBoundingClientRect();
    const bins = [...document.querySelectorAll('.bin')];
    for(const bin of bins){
      const r = bin.getBoundingClientRect();
      if(rectsOverlap(tRect, r)) return bin;
    }
    return null;
  }

  function incrementScore(){
    score += 1;
    scoreEl.textContent = score;
    if(score >= TARGET_SCORE){
      win();
    }
  }

  function win(){
    running = false;
    // Losowe trofeum z 7 dostępnych (nie tylko z 4 wybranych)
    const asset = pickRandom(ASSETS);
    trophyIcon.innerHTML = '';
    const img = document.createElement('img');
    img.alt = asset.name;
    img.src = svgToDataURI(asset.svg);
    trophyIcon.appendChild(img);

    winModal.classList.remove('hidden');
  }

  function reset(){
    // Czyścimy stan
    running = false;
    score = 0;
    scoreEl.textContent = '0';
    winModal.classList.add('hidden');

    // Usuwamy elementy
    if(current && current.el) current.el.remove();
    current = null;
    playfield.innerHTML = '';

    // Losujemy 4 z 7
    selectedCategories = shuffle(ASSETS).slice(0,4);
    createBins();

    // Start
    running = true;
    spawnTreasure();
  }

  // Petla opadania
  let lastTs = 0;
  function loop(ts){
    if(!lastTs) lastTs = ts;
    const dt = (ts - lastTs) / 1000; // w sekundach
    lastTs = ts;

    if(running && current && !current.dragging){
      current.y += current.vy * dt;
      position(current.el, current.x, current.y);

      // Jeśli spadł poza pole gry -> kolejny
      const pfRect = playfield.getBoundingClientRect();
      if(current.y > pfRect.height){
        current.el.remove();
        current = null;
        spawnTreasure();
      }
    }

    requestAnimationFrame(loop);
  }

  restartBtn.addEventListener('click', reset);
  playAgainBtn.addEventListener('click', reset);

  // Start gry
  reset();
  requestAnimationFrame(loop);

  // Reakcja na zmianę rozmiaru – delikatna korekta pozycji, by nie uciekło poza pole
  window.addEventListener('resize', ()=>{
    if(!current) return;
    const pfRect = playfield.getBoundingClientRect();
    const treasureSize = getTreasureSize();
    current.x = Math.min(current.x, Math.max(0, pfRect.width - treasureSize));
    position(current.el, current.x, current.y);
  });
})();
