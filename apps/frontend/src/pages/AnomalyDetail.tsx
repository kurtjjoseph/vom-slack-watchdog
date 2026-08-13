import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, FlagOff } from 'lucide-react';
import { api } from '../services/api';

interface Anomaly {
  id: string;
  type: 'duplicate' | 'spike' | 'anomaly';
  confidence: number;
  channel: string;
  message_ids: string[];
  context: any;
  flagged: boolean;
  feedback?: string;
  created_at: string;
}

export default function AnomalyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [anomaly, setAnomaly] = useState<Anomaly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchAnomaly = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const data = await api.getAnomaly(id);
        setAnomaly(data);
        setFeedback(data.feedback || '');
        setError(null);
      } catch (err) {
        console.error('Error fetching anomaly:', err);
        setError('Failed to load anomaly');
      } finally {
        setLoading(false);
      }
    };

    fetchAnomaly();
  }, [id]);

  const handleSaveFeedback = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      const updated = await api.updateAnomaly(id, { feedback });
      setAnomaly(updated);
      setError(null);
    } catch (err) {
      console.error('Error saving feedback:', err);
      setError('Failed to save feedback');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleFlag = async () => {
    if (!id || !anomaly) return;

    try {
      setIsSaving(true);
      const updated = await api.updateAnomaly(id, { flagged: !anomaly.flagged });
      setAnomaly(updated);
    } catch (err) {
      console.error('Error toggling flag:', err);
      setError('Failed to update anomaly');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading anomaly...</div>
      </div>
    );
  }

  if (!anomaly) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Go Back
        </button>
        <div className="card p-6 text-center">
          <p className="text-gray-500">Anomaly not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} />
          Go Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)} Detected
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              in #{anomaly.channel} on {new Date(anomaly.created_at).toLocaleString()}
            </p>
          </div>

          <button
            onClick={handleToggleFlag}
            disabled={isSaving}
            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {anomaly.flagged ? (
              <Flag size={24} className="text-vom-orange fill-current" />
            ) : (
              <FlagOff size={24} className="text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card bg-red-50 dark:bg-red-900 p-4 border border-red-200 dark:border-red-700">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Confidence & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence Score</p>
          <div className="mt-4">
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold text-vom-orange">
                {(anomaly.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="mt-4 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-vom-orange h-2 rounded-full"
                style={{ width: `${anomaly.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Affected Messages</p>
          <p className="text-4xl font-bold text-blue-600 mt-4">{anomaly.message_ids.length}</p>
          <p className="text-sm text-gray-500 mt-2">message IDs involved</p>
        </div>
      </div>

      {/* Context */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Context Details</h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
            {JSON.stringify(anomaly.context, null, 2)}
          </pre>
        </div>
      </div>

      {/* Feedback */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Feedback & Notes</h2>

        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Add your feedback or notes about this anomaly..."
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-vom-orange dark:focus:ring-vom-orange focus:border-transparent"
          rows={4}
        />

        <button
          onClick={handleSaveFeedback}
          disabled={isSaving || feedback === (anomaly.feedback || '')}
          className="mt-4 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Feedback'}
        </button>
      </div>
    </div>
  );
}
