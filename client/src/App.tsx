import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Evaluations from "@/pages/Evaluations";
import Datasets from "@/pages/Datasets";
import Sidebar from "@/components/Sidebar";
import { useState } from "react";

function App() {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col md:flex-row h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm py-4 px-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="material-icons text-primary">psychology</span>
            <h1 className="text-xl font-semibold ml-2">Meta Prompt Challenge</h1>
          </div>
          <button 
            id="mobile-menu-button" 
            className="p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="material-icons">menu</span>
          </button>
        </header>

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
          currentPath={location}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto h-full bg-gray-50">
          <div className="max-w-7xl mx-auto p-4 md:p-6">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/evaluations" component={Evaluations} />
              <Route path="/datasets" component={Datasets} />
              <Route component={NotFound} />
            </Switch>
          </div>
        </main>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
