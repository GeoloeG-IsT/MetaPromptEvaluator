interface MetricProps {
  label: string;
  value: number;
  color: string;
}

function Metric({ label, value, color }: MetricProps) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center">
        <span className="text-sm font-medium mr-2">{value}%</span>
        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
          <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }}></div>
        </div>
      </div>
    </div>
  );
}

interface EvaluationResultProps {
  title: string;
  date: string;
  samples: number;
  score: number;
  metrics: {
    accuracy: number;
    completeness: number;
    specificity: number;
    adaptability: number;
  };
  onViewDetails: () => void;
  onExportResults: () => void;
}

export default function EvaluationResult({
  title,
  date,
  samples,
  score,
  metrics,
  onViewDetails,
  onExportResults
}: EvaluationResultProps) {
  let scoreColor = "text-success";
  
  if (score < 70) {
    scoreColor = "text-error";
  } else if (score < 80) {
    scoreColor = "text-warning";
  }
  
  const getMetricColor = (value: number) => {
    if (value >= 80) return "bg-success";
    if (value >= 70) return "bg-warning";
    return "bg-error";
  };
  
  return (
    <div className="border rounded-md overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h5 className="font-medium">{title}</h5>
          <p className="text-xs text-gray-500">{date} • {samples} samples</p>
        </div>
        <span className={`text-lg font-semibold ${scoreColor}`}>{score}%</span>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Metric 
            label="Accuracy" 
            value={metrics.accuracy} 
            color={getMetricColor(metrics.accuracy)} 
          />
          
          <Metric 
            label="Completeness" 
            value={metrics.completeness} 
            color={getMetricColor(metrics.completeness)} 
          />
          
          <Metric 
            label="Specificity" 
            value={metrics.specificity} 
            color={getMetricColor(metrics.specificity)} 
          />
          
          <Metric 
            label="Adaptability" 
            value={metrics.adaptability} 
            color={getMetricColor(metrics.adaptability)} 
          />
        </div>
        
        <div className="flex justify-between">
          <button 
            className="text-xs text-primary font-medium"
            onClick={onViewDetails}
          >
            View Details
          </button>
          <button 
            className="text-xs text-gray-500"
            onClick={onExportResults}
          >
            Export Results
          </button>
        </div>
      </div>
    </div>
  );
}
