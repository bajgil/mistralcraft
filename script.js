document.addEventListener('DOMContentLoaded', () => {
    // --- Zmienne, stałe i mapa emotek ---
    const sidebar = document.getElementById('sidebar');
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
            parsed.forEach(name => createSidebarElement(name, false));
        } else {
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
        
        // Zdarzenie dla myszy
        elementDiv.addEventListener('mousedown', e => handleDragStartFromSidebar(e.clientX, e.clientY, name, elementDiv));
        // Zdarzenie dla dotyku
        elementDiv.addEventListener('touchstart', e => {
            e.preventDefault();
            const touch = e.touches[0];
            handleDragStartFromSidebar(touch.clientX, touch.clientY, name, elementDiv);
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
        return elementDiv; // Zwróć element, aby można było od razu rozpocząć przeciąganie
    }
    
    async function combineElements(element1, element2) {
        loadingOverlay.classList.remove('hidden');
        
        const name1 = element1.textContent.trim().split(' ').slice(1).join(' ');
        const name2 = element2.textContent.trim().split(' ').slice(1).join(' ');

        element1.classList.add('disappearing');
        element2.classList.add('disappearing');

        try {
            const response = await fetch('https://mistral-craft-backend.onrender.com/combine', { // Upewnij się, że masz tu swój poprawny URL z Render
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
                }, 400);
            }

        } catch (error) { console.error('Błąd łączenia:', error);
        } finally {
            setTimeout(() => {
                if (element1.parentElement) board.removeChild(element1);
                if (element2.parentElement) board.removeChild(element2);
                loadingOverlay.classList.add('hidden');
            }, 400);
        }
    }

    // --- Logika Przeciągania ---
    let activeElement = null;
    let offsetX = 0, offsetY = 0;

    function handleDragStartFromSidebar(clientX, clientY, name, originalElement) {
        const rect = originalElement.getBoundingClientRect();
        const newElement = createElementOnBoard(name, clientX - rect.left, clientY - rect.top, clientX, clientY);
        startDrag(newElement, clientX - rect.left, clientY - rect.top);
    }
    
    function startDrag(element, offX, offY) {
        if (activeElement) return; // Zapobiegaj przeciąganiu wielu elementów naraz
        activeElement = element;
        offsetX = offX;
        offsetY = offY;
        activeElement.classList.remove('appearing');
        activeElement.classList.add('dragging');
    }

    function handleDragMove(e) {
        if (!activeElement) return;
        
        // Zapobiegaj przewijaniu strony na telefonie podczas przeciągania
        if (e.type === 'touchmove') {
            e.preventDefault();
        }
        
        const coords = e.type === 'touchmove' ? e.touches[0] : e;
        const boardRect = board.getBoundingClientRect();
        
        let x = coords.clientX - boardRect.left - offsetX;
        let y = coords.clientY - boardRect.top - offsetY;

        activeElement.style.left = `${x}px`;
        activeElement.style.top = `${y}px`;
    }

    function handleDragEnd(e) {
        if (!activeElement) return;
        
        activeElement.classList.remove('dragging');
        const coords = e.type === 'touchend' ? e.changedTouches[0] : e;
        
        const sidebarRect = sidebar.getBoundingClientRect();
        if (coords.clientX < sidebarRect.right) {
            activeElement.classList.add('disappearing');
            setTimeout(() => activeElement.remove(), 400);
        } else {
            const droppedOnElement = getElementUnder(activeElement, coords);
            if (droppedOnElement) {
                combineElements(activeElement, droppedOnElement);
            }
        }
        activeElement = null;
    }

    function getElementUnder(element, coords) {
        element.style.visibility = 'hidden';
        const elUnder = document.elementFromPoint(coords.clientX, coords.clientY);
        element.style.visibility = 'visible';
        
        if (elUnder && elUnder.classList.contains('element') && elUnder.id !== element.id) {
            return elUnder;
        }
        return null;
    }
    
    // Dodanie event listenerów dla myszy
    board.addEventListener('mousedown', e => {
        const target = e.target.closest('.element');
        if (target) {
            const rect = target.getBoundingClientRect();
            startDrag(target, e.clientX - rect.left, e.clientY - rect.top);
        }
    });
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // Dodanie event listenerów dla dotyku
    board.addEventListener('touchstart', e => {
        const target = e.target.closest('.element');
        if (target) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = target.getBoundingClientRect();
            startDrag(target, touch.clientX - rect.left, touch.clientY - rect.top);
        }
    }, { passive: false });
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    // --- Inicjalizacja ---
    loadDiscoveries();
});