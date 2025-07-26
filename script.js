document.addEventListener('DOMContentLoaded', () => {
    // --- Zmienne, stałe i mapa emotek ---
    const sidebarList = document.getElementById('elements-list');
    const board = document.getElementById('board');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    const emojiMap = {
        'woda': '💧', 'ogień': '🔥', 'ziemia': '🌍', 'powietrze': '💨',
        'para': '💨', 'lawa': '🌋', 'pył': '🏜️', 'energia': '⚡', 'życie': '🌱',
        'wulkan': '🌋', 'błoto': '🟤', 'roślina': '🌿', 'deszcz': '🌧️', 'chmura': '☁️'
    };
    const defaultEmoji = '✨';

    let discoveredElements = new Set();
    let elementCounter = 0;

    // --- Funkcje Zapisu i Odczytu (localStorage) ---
    function saveDiscoveries() {
        localStorage.setItem('mistralCraftDiscoveries', JSON.stringify(Array.from(discoveredElements)));
    }

    function loadDiscoveries() {
        const saved = localStorage.getItem('mistralCraftDiscoveries');
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.forEach(name => createSidebarElement(name, false)); // false - nie zapisuj ponownie
        } else {
            // Jeśli nie ma zapisu, dodaj startowe elementy
            const startElements = ['Woda', 'Ogień', 'Ziemia', 'Powietrze'];
            startElements.forEach(name => createSidebarElement(name, true));
        }
    }

    // --- Główne Funkcje ---
    function createSidebarElement(name, shouldSave = true) {
        const lowerCaseName = name.toLowerCase();
        if (discoveredElements.has(lowerCaseName)) return;
        discoveredElements.add(lowerCaseName);
        if (shouldSave) saveDiscoveries();

        const elementDiv = document.createElement('div');
        elementDiv.className = 'element';
        const emoji = emojiMap[lowerCaseName] || defaultEmoji;
        elementDiv.innerHTML = `<span class="emoji">${emoji}</span> ${name}`;
        
        elementDiv.addEventListener('mousedown', (e) => {
            if (e.target.closest('.element')) {
                const rect = elementDiv.getBoundingClientRect();
                createElementOnBoard(name, e.clientX - rect.left, e.clientY - rect.top, e.clientX, e.clientY);
            }
        });
        sidebarList.appendChild(elementDiv);
    }

    function createElementOnBoard(name, offsetX, offsetY, initialX, initialY) {
        const elementDiv = document.createElement('div');
        elementDiv.className = 'element appearing';
        const lowerCaseName = name.toLowerCase();
        const emoji = emojiMap[lowerCaseName] || defaultEmoji;
        elementDiv.innerHTML = `<span class="emoji">${emoji}</span> ${name}`;
        elementDiv.id = `element-${elementCounter++}`;
        
        elementDiv.style.left = `${initialX - board.getBoundingClientRect().left - offsetX}px`;
        elementDiv.style.top = `${initialY - board.getBoundingClientRect().top - offsetY}px`;
        
        board.appendChild(elementDiv);
        startDrag(elementDiv, offsetX, offsetY);
    }

    async function combineElements(element1, element2) {
        loadingOverlay.classList.remove('hidden');
        
        const name1 = element1.textContent.trim().split(' ').slice(1).join(' ');
        const name2 = element2.textContent.trim().split(' ').slice(1).join(' ');

        // Animacja znikania
        element1.classList.add('disappearing');
        element2.classList.add('disappearing');

        try {
            const response = await fetch('https://mistral-craft-backend.onrender.com/combine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ element1: name1, element2: name2 })
            });
            if (!response.ok) throw new Error('Błąd serwera');

            const data = await response.json();
            const newElementName = data.result.trim();

            if (newElementName) {
                const rect2 = element2.getBoundingClientRect();
                setTimeout(() => {
                    createElementOnBoard(newElementName, rect2.width / 2, rect2.height / 2, rect2.left + rect2.width / 2, rect2.top + rect2.height / 2);
                    createSidebarElement(newElementName, true);
                }, 400); // Czekaj na zakończenie animacji znikania
            }

        } catch (error) {
            console.error('Błąd łączenia:', error);
        } finally {
            // Usuń połączone elementy z DOM po animacji
            setTimeout(() => {
                if (element1.parentElement) board.removeChild(element1);
                if (element2.parentElement) board.removeChild(element2);
                loadingOverlay.classList.add('hidden');
            }, 400);
        }
    }

    // --- Logika Przeciągania na Planszy ---
    let activeElement = null;
    let offsetX = 0, offsetY = 0;

    function startDrag(element, offX, offY) {
        activeElement = element;
        offsetX = offX;
        offsetY = offY;
        activeElement.classList.remove('appearing'); // Usuń animację pojawiania się
        activeElement.classList.add('dragging');
    }

    board.addEventListener('mousedown', e => {
        const target = e.target.closest('.element');
        if (target) {
            const rect = target.getBoundingClientRect();
            startDrag(target, e.clientX - rect.left, e.clientY - rect.top);
        }
    });

    document.addEventListener('mousemove', e => {
        if (!activeElement) return;
        e.preventDefault();
        const boardRect = board.getBoundingClientRect();
        let x = e.clientX - boardRect.left - offsetX;
        let y = e.clientY - boardRect.top - offsetY;
        activeElement.style.left = `${x}px`;
        activeElement.style.top = `${y}px`;
    });

    document.addEventListener('mouseup', e => {
        if (!activeElement) return;
        activeElement.classList.remove('dragging');

        const sidebarRect = sidebar.getBoundingClientRect();
        // Sprawdź, czy upuszczono na pasek boczny (usuwanie)
        if (e.clientX < sidebarRect.right) {
            activeElement.classList.add('disappearing');
            setTimeout(() => activeElement.remove(), 400);
        } else {
            // Sprawdź, czy upuszczono na inny element (łączenie)
            const droppedOnElement = getElementUnder(activeElement);
            if (droppedOnElement) {
                combineElements(activeElement, droppedOnElement);
            }
        }
        activeElement = null;
    });

    function getElementUnder(element) {
        element.style.visibility = 'hidden';
        const elUnder = document.elementFromPoint(
            element.getBoundingClientRect().left + element.offsetWidth / 2,
            element.getBoundingClientRect().top + element.offsetHeight / 2
        );
        element.style.visibility = 'visible';
        return elUnder && elUnder.classList.contains('element') && elUnder.id !== element.id ? elUnder : null;
    }

    // --- Inicjalizacja ---
    loadDiscoveries();
});