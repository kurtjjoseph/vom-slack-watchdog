import { useEffect, useState } from 'react';
import { AlertCircle, TrendingUp, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import AnomalyCard from '../components/AnomalyCard';

interface Anomaly {
  id: string;
  type: 'duplicate' | 'spike' | 'anomaly';
  confidence: number;
  channel: string;
  message_ids: string[];
  context: any;
  flagged: boolean;
  created_at: string;
}

interface Stats {
  trends: Record<string, number>;
  todayCount: number;
  accuracy: string;
  feedbackCount: number;
}

export default function Dashboard() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [anomaliesData, statsData] = await Promise.all([
          api.getAnomalies({ limit: 10, offset: 0 }),
          api.getStats(),
        ]);

        setAnomalies(anomaliesData.data);
        setStats(statsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Real-time monitoring of Slack anomalies across #growth, #ops, and #launches
        </p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Alerts</p>
                <p className="text-3xl font-bold text-vom-orange mt-2">{stats.todayCount}</p>
              </div>
              <AlertCircle className="text-vom-orange" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Duplicates</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.trends.duplicate || 0}</p>
              </div>
              <TrendingUp className="text-red-600" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Volume Spikes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.trends.spike || 0}</p>
              </div>
              <TrendingUp className="text-yellow-600" size={32} />
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Accuracy</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.accuracy}%</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900 p-4 border border-red-200 dark:border-red-700">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Recent Anomalies */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Alerts</h2>
        <div className="space-y-3">
          {anomalies.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No anomalies detected yet</p>
            </div>
          ) : (
            anomalies.map((anomaly) => (
              <AnomalyCard key={anomaly.id} anomaly={anomaly} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
