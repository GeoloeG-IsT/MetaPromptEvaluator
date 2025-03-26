interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  trend?: {
    value: number;
    label: string;
    isPositive: boolean;
  };
}

export default function StatCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  trend
}: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <h3 className="text-2xl font-semibold">{value}</h3>
        </div>
        <div className={`${iconBgColor} p-2 rounded-lg`}>
          <span className={`material-icons ${iconColor}`}>{icon}</span>
        </div>
      </div>
      {trend && (
        <div className="mt-2 flex items-center">
          <span className={`${trend.isPositive ? 'text-success' : 'text-error'} flex items-center text-xs`}>
            <span className="material-icons text-xs">
              {trend.isPositive ? 'arrow_upward' : 'arrow_downward'}
            </span> 
            {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-gray-500 ml-1">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
