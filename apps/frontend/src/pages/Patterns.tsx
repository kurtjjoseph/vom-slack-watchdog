import { useEffect, useState } from 'react';
import { Tag, TrendingUp } from 'lucide-react';
import { api } from '../services/api';

interface Pattern {
  id: string;
  keywords: string[];
  channels: string[];
  frequency: number;
  last_seen: string;
}

interface ChannelStats {
  channel: string;
  message_count: number;
  user_count: number;
  last_message: string;
}

export default function Patterns() {
  const [channelStats, setChannelStats] = useState<ChannelStats[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('growth');
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChannelStats = async () => {
      try {
        setLoading(true);
        const data = await api.getChannelStats();
        setChannelStats(data);
        if (data.length > 0) {
          setSelectedChannel(data[0].channel);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching channel stats:', err);
        setError('Failed to load channel statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchChannelStats();
  }, []);

  useEffect(() => {
    const fetchPatterns = async () => {
      if (!selectedChannel) return;

      try {
        const data = await api.getPatterns(selectedChannel);
        setPatterns(data.patterns || []);
        setThemes(data.themes || []);
      } catch (err) {
        console.error('Error fetching patterns:', err);
      }
    };

    fetchPatterns();
  }, [selectedChannel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading patterns...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pattern Recognition</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Analyze recurring themes and keyword clusters across channels
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900 p-4 border border-red-200 dark:border-red-700">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Channel Selection */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Channel</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {channelStats.map((stat) => (
            <button
              key={stat.channel}
              onClick={() => setSelectedChannel(stat.channel)}
              className={`p-4 rounded-lg border-2 transition-colors text-left ${
                selectedChannel === stat.channel
                  ? 'border-vom-orange bg-orange-50 dark:bg-orange-900'
                  : 'border-gray-200 dark:border-gray-700 hover:border-vom-orange'
              }`}
            >
              <p className="font-bold text-gray-900 dark:text-white">#{stat.channel}</p>
              <div className="flex gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{stat.message_count} messages</span>
                <span>{stat.user_count} users</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Themes */}
      {themes.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={24} className="text-vom-orange" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Trending Themes</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            {themes.map((theme, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 text-sm font-medium"
              >
                {theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {patterns.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={24} className="text-vom-teal" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recurring Patterns</h2>
          </div>

          <div className="space-y-3">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {pattern.keywords.slice(0, 5).map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                      {pattern.keywords.length > 5 && (
                        <span className="px-2 py-1 text-xs text-gray-500">
                          +{pattern.keywords.length - 5} more
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Appears in {pattern.channels.join(', ')}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-vom-teal">{pattern.frequency}</p>
                    <p className="text-xs text-gray-500">occurrences</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {patterns.length === 0 && themes.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">No patterns found for this channel yet</p>
        </div>
      )}
    </div>
  );
}
