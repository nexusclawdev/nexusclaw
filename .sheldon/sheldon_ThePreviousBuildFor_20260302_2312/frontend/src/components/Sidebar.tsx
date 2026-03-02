import { Home, FileText, Book, Users, Settings, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export const Sidebar = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const menuItems = [
    { id: 'home', icon: Home, label: 'Dashboard', path: '/dashboard' },
    { id: 'documents', icon: FileText, label: 'Documents', path: '/documents' },
    { id: 'library', icon: Book, label: 'Library', path: '/library' },
    { id: 'team', icon: Users, label: 'Team', path: '/team' },
    { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="flex flex-col w-64">
        {/* Logo */}
        <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
          <Link to="/" className="flex items-center space-x-2">
            <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              ResearchHub
            </span>
          </Link>
        </div>

        {/* Collapsible menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || 
                           (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Toggle button (for mobile) */}
        <button
          onClick={onToggle}
          className="flex items-center justify-center h-12 px-4 border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </aside>
  );
};