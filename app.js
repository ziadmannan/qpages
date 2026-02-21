let juzData = [];
let currentJuzIndex = -1;
let touchStartX = 0;
let pageInJuzCounter = 0;

const renderer = new marked.Renderer();

renderer.heading = ({ text, depth }) => {
    if (depth === 2) {
        const match = text.match(/Page\s+(\d+)\s*(.*)/i);
        if (match) {
            const pageNum = match[1];
            const ayahInfo = match[2].trim();
            const currentSubPage = pageInJuzCounter++;

            // We add a data-page attribute so the observer knows which page this is
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

// Intersection Observer to track which page is at the top
const observerOptions = {
    root: null,
    rootMargin: '-70px 0px -80% 0px', // Detects when header hits the top area
    threshold: 0
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && currentJuzIndex !== -1) {
            const pageNum = entry.target.getAttribute('data-page');
            const juzTitle = juzData[currentJuzIndex].title;
            // Save Juz Index, Juz Title, and Page Number
            localStorage.setItem('lastRead', JSON.stringify({
                index: currentJuzIndex,
                title: juzTitle,
                page: pageNum
            }));
        }
    });
}, observerOptions);

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

        showHome();
    } catch (err) {
        document.getElementById('loader').innerText = "Error loading data.md";
    }
}

function showHome() {
    currentJuzIndex = -1;
    document.getElementById('main-header').classList.add('hidden');
    const content = document.getElementById('content');

    // 1. Branding Header
    const brandHtml = `
        <div class="home-brand">
            <h1>Quran Page</h1>
            <p>A page by page summary of the Madina Mushaf <span>(using AI)</span></p>
        </div>
    `;

    // 2. Bookmark Logic
    const lastRead = JSON.parse(localStorage.getItem('lastRead'));
    let resumeHtml = '';

    if (lastRead) {
        resumeHtml = `
            <div class="resume-footer" onclick="showJuz(${lastRead.index}, '${lastRead.page}')">
                <div class="resume-content">
                    <span class="resume-label">CONTINUE READING</span>
                    <span class="resume-details">${lastRead.title} • Page ${lastRead.page}</span>
                </div>
                <span class="resume-icon">→</span>
            </div>
        `;
    }

    // 3. Assemble Home Screen
    let gridHtml = '<div class="juz-grid">';
    juzData.forEach((juz, index) => {
        gridHtml += `<div class="juz-card" onclick="showJuz(${index})">${juz.title}</div>`;
    });
    gridHtml += '</div>';

    content.innerHTML = brandHtml + gridHtml + resumeHtml;
    window.scrollTo(0, 0);
}

function showJuz(index, targetPage = null) {
    if (index < 0 || index >= juzData.length) return;

    pageInJuzCounter = 1;
    currentJuzIndex = index;

    const juz = juzData[index];
    document.getElementById('main-header').classList.remove('hidden');
    document.getElementById('juz-title').innerText = juz.title;

    const content = document.getElementById('content');
    content.innerHTML = `<div class="summary-container">${marked.parse(juz.content, { renderer })}</div>`;

    // Re-observe the new headers
    document.querySelectorAll('.page-header').forEach(header => observer.observe(header));

    // SCROLL LOGIC
    if (targetPage) {
        // We wait a tiny bit for the browser to render the HTML we just injected
        setTimeout(() => {
            const element = document.querySelector(`[data-page="${targetPage}"]`);
            if (element) {
                // We subtract the header height (60px) so the sticky header
                // doesn't cover the title we are scrolling to
                const offset = 70;
                const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;

                window.scrollTo({
                    top: elementPosition - offset,
                    behavior: 'smooth'
                });
            }
        }, 100);
    } else {
        window.scrollTo(0, 0);
    }
}

// Swipe and Init code remains same...
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
    if (currentJuzIndex === -1) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 70) {
        diff > 0 ? showJuz(currentJuzIndex + 1) : showJuz(currentJuzIndex - 1);
    }
});
initApp();