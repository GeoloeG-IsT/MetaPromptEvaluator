import { useQuery } from "@tanstack/react-query";
import { Prompt } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function PromptHistory() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: prompts, isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts"],
  });
  
  const filteredPrompts = prompts?.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.initialPrompt.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  function getCategoryBadge(category: string) {
    switch (category) {
      case "Vision":
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">Vision</Badge>;
      case "Text":
        return <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200">Text</Badge>;
      case "Code":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Code</Badge>;
      case "Multi-modal":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-200">Multi-modal</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">{category}</Badge>;
    }
  }
  
  const viewPrompt = (promptId: number) => {
    setLocation(`/prompt-creator?id=${promptId}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-dark">Prompt History</h2>
          <p className="text-gray-500">Browse and manage your saved prompts</p>
        </div>
        <Button onClick={() => setLocation("/prompt-creator")}>
          <span className="material-icons text-sm mr-1">add</span>
          New Prompt
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:w-64">
          <span className="absolute left-2 top-2.5 text-gray-400 material-icons text-sm">search</span>
          <Input
            placeholder="Search prompts..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center">
            <span className="material-icons text-sm mr-1">filter_list</span>
            Filter
          </Button>
          <Button variant="outline" className="flex items-center">
            <span className="material-icons text-sm mr-1">sort</span>
            Sort
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Prompts</TabsTrigger>
          <TabsTrigger value="vision">Vision</TabsTrigger>
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <span className="material-icons animate-spin">refresh</span>
            </div>
          ) : !filteredPrompts || filteredPrompts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">
                  {searchQuery 
                    ? "No prompts found matching your search criteria."
                    : "No prompts found. Create a new prompt to get started."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPrompts.map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      {getCategoryBadge(prompt.category)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {prompt.createdAt 
                        ? formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })
                        : "Unknown date"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 overflow-hidden text-sm text-gray-600 mb-4">
                      <p className="line-clamp-3">{prompt.initialPrompt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {prompt.tags?.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-primary rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewPrompt(prompt.id)}
                      >
                        <span className="material-icons text-sm mr-1">visibility</span>
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <span className="material-icons text-sm mr-1">content_copy</span>
                        Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="vision" className="mt-4">
          {/* Similar structure, filtered for Vision category */}
          {/* Could use filteredPrompts.filter(p => p.category === "Vision") */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPrompts
              ?.filter(p => p.category === "Vision")
              .map((prompt) => (
                <Card key={prompt.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{prompt.name}</CardTitle>
                      {getCategoryBadge(prompt.category)}
                    </div>
                    <p className="text-xs text-gray-500">
                      {prompt.createdAt 
                        ? formatDistanceToNow(new Date(prompt.createdAt), { addSuffix: true })
                        : "Unknown date"}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 overflow-hidden text-sm text-gray-600 mb-4">
                      <p className="line-clamp-3">{prompt.initialPrompt}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {prompt.tags?.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-indigo-50 text-primary rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex justify-between">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewPrompt(prompt.id)}
                      >
                        <span className="material-icons text-sm mr-1">visibility</span>
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <span className="material-icons text-sm mr-1">content_copy</span>
                        Copy
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
        
        {/* Similar TabsContent for "text" and "code" tabs */}
        <TabsContent value="text" className="mt-4">
          {/* Content for text category */}
        </TabsContent>
        
        <TabsContent value="code" className="mt-4">
          {/* Content for code category */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
