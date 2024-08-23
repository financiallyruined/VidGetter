const urlForm = document.getElementById('url-form');
const urlInput = document.getElementById('url-input');
const submitBtn = document.getElementById('submit-btn');
const alert = document.getElementById('alert');
const errorMessage = document.getElementById('error-message');
const loading = document.getElementById('loading');
const videoInfo = document.getElementById('video-info');
const themeToggle = document.getElementById('theme-toggle');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const pasteLinkStep = document.getElementById('paste-link-step');
const clickFetchStep = document.getElementById('click-fetch-step');
const getVideoStep = document.getElementById('get-video-step');

document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const icon = question.querySelector('svg');

        answer.classList.toggle('hidden');
        question.setAttribute('aria-expanded', answer.classList.contains('hidden') ? 'false' : 'true');

        // Close other open questions
        document.querySelectorAll('.faq-question').forEach(otherQuestion => {
            if (otherQuestion !== question) {
                const otherAnswer = otherQuestion.nextElementSibling;
                otherAnswer.classList.add('hidden');
                otherQuestion.setAttribute('aria-expanded', 'false');
            }
        });
    });
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});


mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

pasteLinkStep.addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        urlInput.value = text;
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
});

clickFetchStep.addEventListener('click', () => {
    submitBtn.click();
});

getVideoStep.addEventListener('click', () => {
    if (videoInfo) {
        videoInfo.scrollIntoView({ behavior: 'smooth' });
    }
});



const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
};

urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) {
        showError('Please enter a valid URL');
        return;
    }

    setLoading(true);
    hideError();
    hideVideoInfo();

    try {
        const response = await fetch('/info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch video info');
        }

        const data = await response.json();
        displayVideoInfo(data);
    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        loading.classList.remove('hidden');
        loading.classList.add('flex');
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed')
    } else {
        loading.classList.add('hidden');
        loading.classList.remove('flex');
        submitBtn.disabled = false;
        submitBtn.classList.remove('opacity-50', 'cursor-not-allowed')
    }
}

function showError(message) {
    errorMessage.textContent = message;
    alert.classList.remove('hidden');
}

function hideError() {
    alert.classList.add('hidden');
}

function hideVideoInfo() {
    videoInfo.classList.add('hidden');
}

function truncateTitle(title, maxLength) {
    if (title.length <= maxLength) {
        return title;
    }
    return title.substr(0, maxLength - 3) + '...';
}

function displayVideoInfo(data) {
    const truncatedTitle = truncateTitle(data.title, 75);
    const html = `
<div class="relative">
        <img src="${data.thumbnail}" alt="Video Thumbnail" class="w-full object-cover h-64">
        <div class="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            ${formatDuration(data.duration)}
        </div>
    </div>
    <div class="p-6">
        <h2 class="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">${truncatedTitle}</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${data.formats.map((format, index) => createFormatCard(format, index)).join('')}
        </div>
        ${data.formats.length > 6 ? `
            <div class="mt-4 text-center">
                <button id="toggle-rows" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded inline-flex items-center">
                    <span>Show More</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
            </div>
        ` : ''}
    </div>
</div>
`;
    videoInfo.innerHTML = html;
    videoInfo.classList.remove('hidden');

    // Now that the content is in the DOM, we can manipulate it
    if (data.formats.length > 6) {
        const toggleButton = document.getElementById('toggle-rows');
        const formatCards = videoInfo.querySelectorAll('.grid > div');
        let showingAll = false;

        // Initially hide cards beyond the first 6
        formatCards.forEach((card, index) => {
            if (index >= 6) {
                card.classList.add('hidden');
            }
        });

        toggleButton.addEventListener('click', () => {
            formatCards.forEach((card, index) => {
                if (index >= 6) {
                    card.classList.toggle('hidden');
                }
            });

            if (showingAll) {
                toggleButton.innerHTML = `
            <span>Show More</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        `;
            } else {
                toggleButton.innerHTML = `
            <span>Show Less</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-2">
                <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
        `;
            }
            showingAll = !showingAll;
        });
    }
}


function createFormatCard(format, index) {
    return `
<div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md">
    <div class="mb-2">
        <span class="font-bold text-gray-700 dark:text-gray-300">Format:</span>
        <span class="text-gray-900 dark:text-white">${format.format ? `${format.format} (${format.ext || 'N/A'})` : 'N/A'}</span>
    </div>
    <div class="mb-2">
        <span class="font-bold text-gray-700 dark:text-gray-300">Resolution:</span>
        <span class="text-gray-900 dark:text-white">${format.resolution || 'N/A'}</span>
    </div>
    <div>
        <a href="${format.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-400 inline-flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download
        </a>
    </div>
</div>
`;
}

// Function to toggle theme
function toggleTheme() {
    document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark:from-dark-200');
    document.body.classList.toggle('dark:to-dark-100');

    // Save the current theme preference to localStorage
    const isDarkMode = document.documentElement.classList.contains('dark');
    localStorage.setItem('darkMode', isDarkMode);

    // Update checkbox state
    const themeToggles = document.querySelectorAll('#theme-toggle, #mobile-theme-toggle');
    themeToggles.forEach(toggle => {
        toggle.checked = !isDarkMode;
    });
}

// Function to set initial theme based on localStorage
function setInitialTheme() {
    const isDarkMode = localStorage.getItem('darkMode') !== 'false';
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark:from-dark-200', 'dark:to-dark-100');
    } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark:from-dark-200', 'dark:to-dark-100');
    }

    // Set initial checkbox state
    const themeToggles = document.querySelectorAll('#theme-toggle, #mobile-theme-toggle');
    themeToggles.forEach(toggle => {
        toggle.checked = !isDarkMode;
    });
}

// Add event listeners to theme toggles
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle');

    themeToggle.addEventListener('change', toggleTheme);
    mobileThemeToggle.addEventListener('change', toggleTheme);

    // Set initial theme
    setInitialTheme();
});