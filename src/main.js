let settings = {
	english: false,
	russian: false,
	darkTheme: true,
	hideShorts: false,
	hideWatched: false
};

let stats = {
	english: 0,
	russian: 0,
	other: 0,
	hidden: 0,
	lastScan: null
};

const LANG_PATTERNS = {
	russian: /[\u0400-\u04FF]/,
	english: /^[A-Za-z0-9\s\W]*$/
};

function detectLanguage(text) {
	if (!text) return 'other';
	if (LANG_PATTERNS.russian.test(text)) return 'russian';
	if (LANG_PATTERNS.english.test(text)) return 'english';
	return 'other';
}

function shouldHideVideo(element, lang) {
	if ((settings.english || settings.russian) &&
		!((settings.english && lang === 'english') ||
			(settings.russian && lang === 'russian'))) {
		return true;
	}

	if (settings.hideShorts) {
		const isShort = element.querySelector('a[href*="shorts"]') !== null ||
			element.querySelector('ytd-thumbnail[href*="shorts"]') !== null ||
			element.querySelector('[overlay-style="SHORTS"]') !== null ||
			element.querySelector('ytd-rich-shelf-renderer') !== null ||
			element.querySelector('#video-title-link[href*="shorts"]') !== null ||
			element.querySelector('span.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]') !== null ||
			element.querySelector('#video-title:has-text("#shorts")') !== null ||
			element.querySelector('#video-title:has-text("#Shorts")') !== null ||
				element.querySelector('#video-title:has-text("#short")') !== null ||
				element.querySelector('#video-title:has-text("#Short")') !== null ||
				element.querySelector('ytd-guide-entry-renderer:has-text("Shorts")') !== null ||
				element.querySelector('ytd-mini-guide-entry-renderer:has-text("Shorts")') !== null ||
				element.querySelector('ytd-rich-section-renderer:has(#rich-shelf-header:has-text("Shorts"))') !== null ||
				element.querySelector('ytd-reel-shelf-renderer:has(.ytd-reel-shelf-renderer:has-text("Shorts"))') !== null;

		if (isShort) {
			element.style.display = 'none';
			return true;
		}
	}

	if (settings.hideWatched) {
		const progressBar = element.querySelector('ytd-thumbnail-overlay-resume-playback-renderer');
		if (progressBar) return true;
	}

	return false;
}

function scanPage() {
	stats = {
		english: 0,
		russian: 0,
		other: 0,
		hidden: 0,
		lastScan: new Date().toLocaleTimeString()
	};

	document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer')
		.forEach(element => {
			const title = element.querySelector('#video-title');
			if (!title || !title.textContent) return;

			const lang = detectLanguage(title.textContent);
			stats[lang]++;

			if (shouldHideVideo(element, lang)) {
				element.style.display = 'none';
				stats.hidden++;
			} else {
				element.style.display = '';
			}
		});

	browser.runtime.sendMessage({
		action: 'statsUpdate',
		stats: stats
	});
}

const observer = new MutationObserver((mutations) => {
	let shouldScan = false;

	mutations.forEach(mutation => {
		if (mutation.addedNodes.length) {
			shouldScan = true;
		}
	});

	if (shouldScan) {
		scanPage();
	}
});

observer.observe(document.body, {
	childList: true,
	subtree: true
});

browser.runtime.onMessage.addListener((message) => {
	if (message.action === 'updateSettings') {
		Object.assign(settings, message.settings);
		scanPage();
	} else if (message.action === 'scanRequest') {
		scanPage();
	}
});

browser.storage.local.get(['english', 'russian', 'darkTheme', 'hideShorts', 'hideWatched'])
	.then(stored => {
		settings = {
			english: stored.english ?? false,
			russian: stored.russian ?? false,
			darkTheme: stored.darkTheme ?? true,
			hideShorts: stored.hideShorts ?? false,
			hideWatched: stored.hideWatched ?? false
		};

		scanPage();
	});

window.addEventListener('yt-navigate-finish', scanPage);
window.addEventListener('scroll', debounce(scanPage, 1000));

function debounce(func, wait) {
	let timeout;
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout);
			func(...args);
		};
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	};
}