/* --- Global State --- */
let juzData = [];
let currentJuzIndex = -1;
let touchStartX = 0;
let pageInJuzCounter = 0;

/* --- Marked.js Configuration --- */
const renderer = new marked.Renderer();

renderer.heading = ({ text, depth }) => {
    if (depth === 2) {
        // Regex to capture "Page X" and the "(Ayah range)"
        const match = text.match(/Page\s+(\d+)\s*(.*)/i);
        if (match) {
            const pageNum = match[1];
            const ayahInfo = match[2].trim();
            const currentSubPage = pageInJuzCounter++;

            return `
                <div class="page-header sticky-header" data-page="${pageNum}">
                    <a href="https://quran.com/page/${pageNum}" target="_blank" class="page-pill full-width">
                        <div class="pill-left">
                            <span class="juz-index">${currentSubPage}</span>
                            <span class="separator">|</span>
                            <span class="page-label">Page ${pageNum}</span>
                        </div>
                        <div class="pill-right">
                            <span class="ayah-label">${ayahInfo}</span>
                            <span class="ext-link">↗</span>
                        </div>
                    </a>
                </div>`;
        }
    }
    return `<h${depth}>${text}</h${depth}>`;
};

/* --- Intersection Observer (Bookmarking) --- */
const observerOptions = {
    root: null,
    rootMargin: '-70px 0px -80% 0px',
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && currentJuzIndex !== -1) {
            const pageNum = entry.target.getAttribute('data-page');
            const juzTitle = juzData[currentJuzIndex].title;
            localStorage.setItem('lastRead', JSON.stringify({
                index: currentJuzIndex,
                title: juzTitle,
                page: pageNum
            }));
        }
    });
}, observerOptions);

/* --- Router Logic --- */
window.addEventListener('hashchange', handleRouting);

function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#juz-')) {
        const index = parseInt(hash.replace('#juz-', ''));
        // If coming from "Continue Reading", we might have a stored page
        const lastRead = JSON.parse(localStorage.getItem('lastRead'));
        const targetPage = (lastRead && lastRead.index === index) ? lastRead.page : null;
        renderJuzUI(index, targetPage);
    } else {
        renderHomeUI();
    }
}

/* --- UI Rendering Functions --- */

function renderHomeUI() {
    currentJuzIndex = -1;
    document.getElementById('main-header').classList.add('hidden');
    const content = document.getElementById('content');

    // Branding
    const brandHtml = `
        <div class="home-brand">
            <h1>Quran Page</h1>
            <p>A page by page summary of the Madina Mushaf <span>(using AI)</span></p>
        </div>`;

    // Bookmark
    const lastRead = JSON.parse(localStorage.getItem('lastRead'));
    let resumeHtml = '';
    if (lastRead) {
        resumeHtml = `
            <div class="resume-footer" onclick="window.location.hash = '#juz-${lastRead.index}'">
                <div class="resume-content">
                    <span class="resume-label">CONTINUE READING</span>
                    <span class="resume-details">${lastRead.title} • Page ${lastRead.page}</span>
                </div>
                <span class="resume-icon">→</span>
            </div>`;
    }

    // Grid
    let gridHtml = '<div class="juz-grid">';
    juzData.forEach((juz, index) => {
        gridHtml += `<div class="juz-card" onclick="window.location.hash = '#juz-${index}'">${juz.title}</div>`;
    });
    gridHtml += '</div>';

    content.innerHTML = brandHtml + gridHtml + resumeHtml;
    window.scrollTo(0, 0);
}

function renderJuzUI(index, targetPage = null) {
    if (index < 0 || index >= juzData.length) return;

    pageInJuzCounter = 1;
    currentJuzIndex = index;

    const juz = juzData[index];
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('juz-title').innerText = juz.title;

    const content = document.getElementById('content');
    content.innerHTML = `<div class="summary-container">${marked.parse(juz.content, { renderer })}</div>`;

    // Observe sticky headers for bookmarking
    document.querySelectorAll('.page-header').forEach(header => observer.observe(header));

    // Scroll to page logic
    if (targetPage) {
        setTimeout(() => {
            const element = document.querySelector(`[data-page="${targetPage}"]`);
            if (element) {
                const offset = 70;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
                window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
            }
        }, 100);
    } else {
        window.scrollTo(0, 0);
    }
}

/* --- Initialization --- */
async function initApp() {
    try {
        const response = await fetch('data.md');
        const text = await response.text();
        const rawSections = text.split(/\n(?=# )/);

        juzData = rawSections.map(section => {
            const lines = section.split('\n');
            const title = lines[0].replace('#', '').trim();
            const content = lines.slice(1).join('\n');
            return { title, content };
        });

        // Start routing
        if (!window.location.hash) {
            window.location.hash = '#home';
        }
        handleRouting();

    } catch (err) {
        document.getElementById('loader').innerText = "Error loading data.md";
    }
}

/* --- Gestures & PWA --- */
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
    if (currentJuzIndex === -1) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 100) {
        if (diff > 0 && currentJuzIndex < juzData.length - 1) {
            window.location.hash = `#juz-${currentJuzIndex + 1}`;
        } else if (diff < 0 && currentJuzIndex > 0) {
            window.location.hash = `#juz-${currentJuzIndex - 1}`;
        }
    }
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
}

// Kick off
initApp();