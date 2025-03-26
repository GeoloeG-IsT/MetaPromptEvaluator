import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/useUser";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Settings() {
  const { toast } = useToast();
  const { user } = useUser();
  
  // API settings
  const [apiKey, setApiKey] = useState("");
  const [apiModel, setApiModel] = useState("gpt-4o");
  
  // UI settings
  const [theme, setTheme] = useState("light");
  const [notifications, setNotifications] = useState(true);
  const [defaultDatasetId, setDefaultDatasetId] = useState<string>("");
  
  // Evaluation settings
  const [defaultValidationMethod, setDefaultValidationMethod] = useState("LLM Pattern Matching");
  const [defaultPriority, setDefaultPriority] = useState("Balanced");
  const [autoEvaluate, setAutoEvaluate] = useState(false);
  
  const handleSaveAPISettings = () => {
    // This would normally save to a server or local storage
    toast({
      title: "API settings saved",
      description: "Your API settings have been updated successfully.",
    });
  };
  
  const handleSaveUISettings = () => {
    toast({
      title: "UI settings saved",
      description: "Your UI preferences have been updated successfully.",
    });
  };
  
  const handleSaveEvaluationSettings = () => {
    toast({
      title: "Evaluation settings saved",
      description: "Your evaluation preferences have been updated successfully.",
    });
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-dark">Settings</h2>
        <p className="text-gray-500">Manage your application preferences and configurations</p>
      </div>
      
      <Tabs defaultValue="api" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="api">API Configuration</TabsTrigger>
          <TabsTrigger value="ui">UI Preferences</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation Settings</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure your OpenAI API settings for meta prompt generation and evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">OpenAI API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Your API key is stored securely and never shared. We recommend using environment variables in production.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-model">Default LLM Model</Label>
                <Select value={apiModel} onValueChange={setApiModel}>
                  <SelectTrigger id="api-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recommended)</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  GPT-4o is the recommended model for best meta prompt generation and evaluation results.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>API Usage</Label>
                <div className="rounded-md bg-gray-50 p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">This month's usage</span>
                    <span className="text-sm font-medium">$0.00</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{ width: "5%" }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    API usage is calculated based on your OpenAI account.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAPISettings}>Save API Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="ui">
          <Card>
            <CardHeader>
              <CardTitle>UI Preferences</CardTitle>
              <CardDescription>
                Customize the appearance and behavior of the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications">Notifications</Label>
                  <p className="text-xs text-gray-500">
                    Receive notifications for completed evaluations and processes.
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="default-dataset">Default Dataset</Label>
                <Select value={defaultDatasetId} onValueChange={setDefaultDatasetId}>
                  <SelectTrigger id="default-dataset">
                    <SelectValue placeholder="Select default dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Landscape Images (12 items)</SelectItem>
                    <SelectItem value="2">Portrait Photos</SelectItem>
                    <SelectItem value="3">Product Images</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  This dataset will be pre-selected when starting new evaluations.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveUISettings}>Save UI Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="evaluation">
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Settings</CardTitle>
              <CardDescription>
                Configure default settings for prompt evaluations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="validation-method">Default Validation Method</Label>
                <Select value={defaultValidationMethod} onValueChange={setDefaultValidationMethod}>
                  <SelectTrigger id="validation-method">
                    <SelectValue placeholder="Select validation method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LLM Pattern Matching">LLM Pattern Matching</SelectItem>
                    <SelectItem value="Rule-based Validation">Rule-based Validation</SelectItem>
                    <SelectItem value="Content Similarity">Content Similarity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Default Processing Priority</Label>
                <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Speed (Fast, Less Accurate)">Speed (Fast, Less Accurate)</SelectItem>
                    <SelectItem value="Balanced">Balanced</SelectItem>
                    <SelectItem value="Accuracy (Slower, More Precise)">Accuracy (Slower, More Precise)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-evaluate">Auto-Evaluate New Prompts</Label>
                  <p className="text-xs text-gray-500">
                    Automatically start evaluation after saving a new meta prompt.
                  </p>
                </div>
                <Switch
                  id="auto-evaluate"
                  checked={autoEvaluate}
                  onCheckedChange={setAutoEvaluate}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Evaluation Metrics Weights</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Accuracy</span>
                      <span>40%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-primary h-full" style={{ width: "40%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Completeness</span>
                      <span>25%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-primary h-full" style={{ width: "25%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Specificity</span>
                      <span>20%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-primary h-full" style={{ width: "20%" }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs">
                      <span>Adaptability</span>
                      <span>15%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-primary h-full" style={{ width: "15%" }}></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These weights determine how each metric contributes to the overall score.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveEvaluationSettings}>Save Evaluation Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account information and preferences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="material-icons text-primary text-2xl">person</span>
                </div>
                <div>
                  <h3 className="font-medium">{user?.username || "Guest User"}</h3>
                  <p className="text-sm text-gray-500">{user?.email || "guest@example.com"}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-name">Display Name</Label>
                <Input
                  id="account-name"
                  defaultValue={user?.username || "Guest User"}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="account-email">Email Address</Label>
                <Input
                  id="account-email"
                  type="email"
                  defaultValue={user?.email || "guest@example.com"}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  placeholder="••••••••"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Cancel</Button>
              <Button>Save Account Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
