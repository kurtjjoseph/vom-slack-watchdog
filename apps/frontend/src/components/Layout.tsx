import { Link } from 'react-router-dom';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../store/auth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-vom-navy text-white transition-transform duration-300 md:translate-x-0 md:relative`}
      >
        <div className="flex items-center justify-between p-4 md:justify-start">
          <h1 className="text-xl font-bold">Watchdog</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-8 space-y-2 px-4">
          <Link
            to="/"
            className="block px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/patterns"
            className="block px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
          >
            Patterns
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
          >
            <Settings size={18} />
            Settings
          </Link>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between px-4 py-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-2xl font-bold text-vom-navy dark:text-white">VOM Slack Watchdog</h2>
            <div className="w-8 h-8" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
