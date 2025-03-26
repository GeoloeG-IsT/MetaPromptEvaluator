import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Prompt } from "@shared/schema";
import StatCard from "@/components/StatCard";
import ActivityTable from "@/components/ActivityTable";
import PromptTable from "@/components/PromptTable";
import { Button } from "@/components/ui/button";
import MetaPromptDialog from "@/components/MetaPromptDialog";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/dashboard/recent"],
  });
  
  const { data: prompts, isLoading: promptsLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });

  const statCards = [
    {
      title: "Total Prompts",
      value: statsLoading ? "..." : stats?.totalPrompts || 0,
      icon: "edit_note",
      iconBgColor: "bg-indigo-100",
      iconColor: "text-primary",
      trend: { value: 12, label: "vs last week", isPositive: true }
    },
    {
      title: "Evaluations",
      value: statsLoading ? "..." : stats?.totalEvaluations || 0,
      icon: "analytics",
      iconBgColor: "bg-pink-100",
      iconColor: "text-secondary",
      trend: { value: 8, label: "vs last week", isPositive: true }
    },
    {
      title: "Avg. Score",
      value: statsLoading ? "..." : `${Math.round(stats?.averageScore || 0)}%`,
      icon: "trending_up",
      iconBgColor: "bg-green-100",
      iconColor: "text-success",
      trend: { value: 4.2, label: "vs last week", isPositive: true }
    },
    {
      title: "Data Elements",
      value: statsLoading ? "..." : stats?.dataElements || 0,
      icon: "storage",
      iconBgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      trend: { value: 2, label: "vs last week", isPositive: false }
    }
  ];

  const handleViewAllActivity = () => {
    setLocation("/prompt-history");
  };
  
  const handleCreateNewPrompt = () => {
    setIsCreateDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-dark">Dashboard</h2>
          <p className="text-gray-500">Overview of your meta prompt activities</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center">
            <span className="material-icons text-sm mr-1">file_download</span>
            Export
          </Button>
          <Button 
            className="flex items-center"
            onClick={handleCreateNewPrompt}
          >
            <span className="material-icons text-sm mr-1">add</span>
            New Meta Prompt
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
      
      {/* Meta Prompts Table */}
      <PromptTable 
        prompts={prompts || []} 
        onCreateNew={handleCreateNewPrompt} 
      />

      {/* Recent Activity Table */}
      <ActivityTable 
        activities={recentActivity || []} 
        onViewAll={handleViewAllActivity}
      />
      
      {/* Create Meta Prompt Dialog */}
      <MetaPromptDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
}
