import { Link } from 'react-router-dom';
import { AlertCircle, TrendingUp, Copy, Flag, FlagOff } from 'lucide-react';
import { useState } from 'react';
import { api } from '../services/api';

interface AnomalyCardProps {
  anomaly: {
    id: string;
    type: 'duplicate' | 'spike' | 'anomaly';
    confidence: number;
    channel: string;
    message_ids: string[];
    context: any;
    flagged: boolean;
    created_at: string;
  };
  onUpdate?: () => void;
}

export default function AnomalyCard({ anomaly, onUpdate }: AnomalyCardProps) {
  const [isFlagging, setIsFlagging] = useState(false);

  const handleFlagToggle = async () => {
    try {
      setIsFlagging(true);
      await api.updateAnomaly(anomaly.id, { flagged: !anomaly.flagged });
      onUpdate?.();
    } catch (error) {
      console.error('Error toggling flag:', error);
    } finally {
      setIsFlagging(false);
    }
  };

  const typeIcon = anomaly.type === 'duplicate' ? <Copy size={20} /> : <TrendingUp size={20} />;
  const typeLabel = anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1);
  const confidencePercent = (anomaly.confidence * 100).toFixed(1);

  const typeColor = {
    duplicate: 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300',
    spike: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300',
    anomaly: 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300',
  };

  return (
    <Link to={`/anomalies/${anomaly.id}`}>
      <div className="card p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-2 rounded-lg ${typeColor[anomaly.type]}`}>
              {typeIcon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={`badge ${typeColor[anomaly.type]}`}>
                  {typeLabel}
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  #{anomaly.channel}
                </span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {JSON.stringify(anomaly.context).substring(0, 100)}...
              </p>

              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{anomaly.message_ids.length} message(s)</span>
                <span>•</span>
                <span>{new Date(anomaly.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 ml-4">
            <div className="text-right">
              <div className="text-sm font-bold text-vom-orange">{confidencePercent}%</div>
              <div className="text-xs text-gray-500">confidence</div>
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                handleFlagToggle();
              }}
              disabled={isFlagging}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {anomaly.flagged ? (
                <Flag size={18} className="text-vom-orange fill-current" />
              ) : (
                <FlagOff size={18} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
