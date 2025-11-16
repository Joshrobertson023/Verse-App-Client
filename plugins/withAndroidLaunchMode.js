const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Sets android:launchMode="singleTask" on the main activity to prevent multiple app instances
 * when opening deep links or notifications.
 */
module.exports = (config) => {
	return withAndroidManifest(config, async (config) => {
		const manifest = config.modResults;
		if (
			!manifest.manifest ||
			!manifest.manifest.application ||
			!Array.isArray(manifest.manifest.application) ||
			!manifest.manifest.application[0]
		) {
			return config;
		}

		const application = manifest.manifest.application[0];
		const activities = application.activity || [];
		if (!Array.isArray(activities)) {
			return config;
		}

		// Try to find the main activity (has MAIN action and LAUNCHER category)
		for (const activity of activities) {
			const intentFilters = activity['intent-filter'] || [];
			const hasMain =
				intentFilters.some((filter) =>
					(filter.action || []).some((a) => a.$['android:name'] === 'android.intent.action.MAIN')
				) &&
				intentFilters.some((filter) =>
					(filter.category || []).some((c) => c.$['android:name'] === 'android.intent.category.LAUNCHER')
				);

			if (hasMain) {
				activity.$ = activity.$ || {};
				activity.$['android:launchMode'] = 'singleTask';
				break;
			}
		}

		return config;
	});
};


