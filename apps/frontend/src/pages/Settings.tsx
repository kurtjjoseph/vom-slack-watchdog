export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your watchdog preferences</p>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Monitoring Preferences</h2>

        <div className="space-y-6">
          <div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="ml-3 text-gray-900 dark:text-white font-medium">
                Monitor #growth channel
              </span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
              Enable duplicate and anomaly detection for #growth
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="ml-3 text-gray-900 dark:text-white font-medium">
                Monitor #ops channel
              </span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
              Enable duplicate and anomaly detection for #ops
            </p>
          </div>

          <div>
            <label className="flex items-center">
              <input type="checkbox" defaultChecked className="w-4 h-4" />
              <span className="ml-3 text-gray-900 dark:text-white font-medium">
                Monitor #launches channel
              </span>
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 ml-7">
              Enable duplicate and anomaly detection for #launches
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Confidence Threshold
              </label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="60"
                className="w-full"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Only alert for anomalies with confidence above 60%
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Alert Notifications
              </label>
              <select className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>Posts to #anomalies</option>
                <option>Direct message to admin</option>
                <option>Email digest</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button className="btn-primary">Save Settings</button>
          <button className="btn-secondary">Reset to Defaults</button>
        </div>
      </div>

      <div className="card p-6 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700">
        <h3 className="font-bold text-blue-900 dark:text-blue-100">About VOM Slack Watchdog</h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
          Version 1.0.0 - Real-time duplicate work detection and anomaly monitoring for Slack.
        </p>
      </div>
    </div>
  );
}
