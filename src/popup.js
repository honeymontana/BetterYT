document.addEventListener('DOMContentLoaded', () => {
	const controls = {
		english: document.getElementById('english'),
		russian: document.getElementById('russian'),
		darkTheme: document.getElementById('darkTheme'),
		hideShorts: document.getElementById('hideShorts'),
		hideWatched: document.getElementById('hideWatched'),
		scanButton: document.getElementById('scanPage'),
		clearButton: document.getElementById('clearStats')
	};

	browser.storage.local.get(['english', 'russian', 'darkTheme', 'hideShorts', 'hideWatched', 'stats'])
		.then(settings => {
			controls.english.checked = settings.english ?? false;
			controls.russian.checked = settings.russian ?? false;
			controls.darkTheme.checked = settings.darkTheme ?? false;
			controls.hideShorts.checked = settings.hideShorts ?? false;
			controls.hideWatched.checked = settings.hideWatched ?? false;

			document.documentElement.setAttribute('data-theme', settings.darkTheme ? 'dark' : 'light');

			if (settings.stats) {
				updateStatsDisplay(settings.stats);
			}
		});


	function updateStatsDisplay(stats) {
		document.getElementById('englishCount').textContent = stats.english || 0;
		document.getElementById('russianCount').textContent = stats.russian || 0;
		document.getElementById('otherCount').textContent = stats.other || 0;
		document.getElementById('hiddenCount').textContent = stats.hidden || 0;
		document.getElementById('lastScan').textContent = stats.lastScan || 'Never';
	}

	function updateLanguageSettings(changedCheckbox) {
		if (changedCheckbox.checked) {
			if (changedCheckbox.id === 'english') {
				controls.russian.checked = false;
			} else {
				controls.english.checked = false;
			}
		}

		saveAndNotify();
	}

	function saveAndNotify() {
		const settings = {
			english: controls.english.checked,
			russian: controls.russian.checked,
			darkTheme: controls.darkTheme.checked,
			hideShorts: controls.hideShorts.checked,
			hideWatched: controls.hideWatched.checked
		};

		document.documentElement.setAttribute('data-theme', settings.darkTheme ? 'dark' : 'light');

		browser.storage.local.set(settings)
			.then(() => {
				browser.tabs.query({ active: true, currentWindow: true })
					.then(tabs => {
						browser.tabs.sendMessage(tabs[0].id, {
							action: 'updateSettings',
							settings: settings
						});
					});
			});
	}

	controls.english.addEventListener('change', () => updateLanguageSettings(controls.english));
	controls.russian.addEventListener('change', () => updateLanguageSettings(controls.russian));
	controls.darkTheme.addEventListener('change', saveAndNotify);
	controls.hideShorts.addEventListener('change', saveAndNotify);
	controls.hideWatched.addEventListener('change', saveAndNotify);

	controls.scanButton.addEventListener('click', () => {
		browser.tabs.query({ active: true, currentWindow: true })
			.then(tabs => {
				browser.tabs.sendMessage(tabs[0].id, { action: 'scanRequest' });
			});
	});

	controls.clearButton.addEventListener('click', () => {
		const emptyStats = {
			english: 0,
			russian: 0,
			other: 0,
			hidden: 0,
			lastScan: 'Never'
		};
		browser.storage.local.set({ stats: emptyStats });
		updateStatsDisplay(emptyStats);
	});

	browser.runtime.onMessage.addListener((message) => {
		if (message.action === 'statsUpdate') {
			updateStatsDisplay(message.stats);
		}
	});
});