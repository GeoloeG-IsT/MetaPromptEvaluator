import { Prompt } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface ActivityTableProps {
  activities: Prompt[];
  onViewAll: () => void;
}

function getStatusBadge(prompt: Prompt) {
  // This would be based on evaluation status in a real app
  return (
    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-success">
      Completed
    </span>
  );
}

function getScoreBadge(prompt: Prompt) {
  // Mock score for display - in a real app would come from evaluations
  const mockScore = Math.floor(Math.random() * 30) + 70;
  let colorClass = "bg-success";
  
  if (mockScore < 75) {
    colorClass = "bg-error";
  } else if (mockScore < 85) {
    colorClass = "bg-warning";
  }
  
  return (
    <div className="flex items-center">
      <span className="text-dark font-medium">{mockScore}%</span>
      <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
        <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${mockScore}%` }}></div>
      </div>
    </div>
  );
}

export default function ActivityTable({ activities, onViewAll }: ActivityTableProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b">
        <h3 className="font-semibold">Recent Activity</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prompt</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No recent activity found
                </td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-dark">{activity.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.createdAt 
                      ? formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true }) 
                      : "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getScoreBadge(activity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(activity)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-6 py-3 border-t">
        <button
          onClick={onViewAll}
          className="text-sm text-primary hover:text-indigo-700 font-medium flex items-center"
        >
          View all activity
          <span className="material-icons text-sm ml-1">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
