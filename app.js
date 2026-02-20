let juzData = [];
let currentJuzIndex = -1;
let touchStartX = 0;

// 1. Initialize the renderer
let pageInJuzCounter = 0;
const renderer = new marked.Renderer();

renderer.heading = ({ text, depth }) => {
    if (depth === 2) {
        const pageMatch = text.match(/\d+/);
        const pageNum = pageMatch ? pageMatch[0] : null;

        if (pageNum) {
            // Increment the counter for each H2 found
            const currentSubPage = pageInJuzCounter++;

            return `
                <div class="page-header">
                    <a href="https://quran.com/page/${pageNum}" target="_blank" class="page-pill">
                        <span class="juz-index">${currentSubPage}</span>
                        <span class="separator">|</span>
                        Page ${pageNum} <span>↗</span>
                    </a>
                </div>`;
        }
    }
    return `<h${depth}>${text}</h${depth}>`;
};

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
    
    // Check for bookmark
    const lastJuz = localStorage.getItem('lastReadJuz');
    let resumeHtml = '';
    
    if (lastJuz !== null && juzData[lastJuz]) {
        resumeHtml = `
            <div class="resume-banner" onclick="showJuz(${lastJuz})">
                <span>📖 Continue: ${juzData[lastJuz].title}</span>
            </div>
        `;
    }

    let html = resumeHtml + '<div class="juz-grid">';
    juzData.forEach((juz, index) => {
        html += `<div class="juz-card" onclick="showJuz(${index})">${juz.title}</div>`;
    });
    html += '</div>';
    
    content.innerHTML = html;
    window.scrollTo(0, 0);
}

function showJuz(index) {
    if (index < 0 || index >= juzData.length) return;

    // Reset the counter to 1 every time we open a new Juz
    pageInJuzCounter = 1;

    currentJuzIndex = index;
    localStorage.setItem('lastReadJuz', index);

    const juz = juzData[index];
    const header = document.getElementById('main-header');
    const content = document.getElementById('content');

    header.classList.remove('hidden');
    document.getElementById('juz-title').innerText = juz.title;

    // Render the markdown with the reset counter
    content.innerHTML = `<div class="summary-container">${marked.parse(juz.content, { renderer })}</div>`;
    window.scrollTo(0, 0);
}

// Swipe detection logic remains the same
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
    if (currentJuzIndex === -1) return;
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 70) {
        diff > 0 ? showJuz(currentJuzIndex + 1) : showJuz(currentJuzIndex - 1);
    }
});

initApp();
