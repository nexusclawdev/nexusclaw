import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, List, Calendar, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" />, path: '/dashboard' },
    { id: 'tasks', label: 'Tasks', icon: <List className="w-5 h-5" />, path: '/tasks' },
    { id: 'calendar', label: 'Calendar', icon: <Calendar className="w-5 h-5" />, path: '/calendar' },
    { id: 'documents', label: 'Documents', icon: <FileText className="w-5 h-5" />, path: '/documents' },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/settings' },
  ];

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      <div className="p-4 flex justify-end">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center space-x-3 px-3 py-3 rounded-xl transition-all ${location.pathname === item.path
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <div className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
              {item.icon}
            </div>
            {!isCollapsed && (
              <span className="font-semibold text-sm tracking-wide transition-opacity duration-300">
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg overflow-hidden relative">
          {!isCollapsed && (
            <div className="relative z-10">
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-1">Status</p>
              <p className="text-sm font-medium">All tasks synced</p>
            </div>
          )}
          <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-white/10 rounded-full blur-2xl"></div>
        </div>
      </div>
    </aside>
  );
};