import { Link } from "wouter";
import { useUser } from "@/hooks/useUser";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
}

export default function Sidebar({ isOpen, onClose, currentPath }: SidebarProps) {
  const { user } = useUser();

  const navigation = [
    { name: "Dashboard", href: "/", icon: "dashboard" },
    { name: "Create Meta Prompt", href: "/prompt-creator", icon: "edit_note" },
    { name: "Evaluations", href: "/evaluations", icon: "analytics" },
    { name: "Datasets", href: "/datasets", icon: "storage" },
    { name: "Prompt History", href: "/prompt-history", icon: "history" },
    { name: "Settings", href: "/settings", icon: "settings" },
  ];

  return (
    <aside className={`transition-sidebar transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky md:top-0 md:h-screen bg-white w-64 shadow-lg flex-shrink-0 z-50 md:z-0`}>
      <div className="p-4 border-b">
        <div className="flex items-center mb-6">
          <span className="material-icons text-primary text-3xl">psychology</span>
          <h1 className="text-xl font-semibold ml-2">Meta Prompt Challenge</h1>
        </div>
        <button 
          className="md:hidden absolute top-4 right-4"
          onClick={onClose}
        >
          <span className="material-icons">close</span>
        </button>
      </div>
      
      <nav className="py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = currentPath === item.href || 
              (item.href !== "/" && currentPath.startsWith(item.href));
              
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <a 
                    className={`flex items-center px-4 py-2 ${
                      isActive 
                        ? "text-primary bg-indigo-50 border-l-4 border-primary font-medium" 
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      if (window.innerWidth < 768) {
                        onClose();
                      }
                    }}
                  >
                    <span className="material-icons mr-3">{item.icon}</span>
                    {item.name}
                  </a>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 w-full border-t p-4">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center">
            <span className="material-icons text-primary text-sm">person</span>
          </div>
          <div className="ml-2">
            <p className="text-sm font-medium">{user?.username || "Guest User"}</p>
            <p className="text-xs text-gray-500">{user?.email || "No email"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
