import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  BookOpen, 
  BarChart3, 
  Settings, 
  Users, 
  TrendingUp, 
  FileText, 
  Search, 
  Plus, 
  Menu, 
  X 
} from 'lucide-react';

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, exact: true },
    { name: 'Literature Review', href: '/research', icon: BookOpen },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Team', href: '/team', icon: Users },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings }
  ];

  const quickActions = [
    { name: 'New Research', href: '/research/new', icon: Plus },
    { name: 'Search Papers', href: '/search', icon: Search },
    { name: 'Trending', href: '/trending', icon: TrendingUp }
  ];

  return (
    <div className="w-64 bg-gray-900 text-white shadow-lg sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      {/* Collapsed header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          {!isCollapsed && <span className="text-xl font-bold">AI Research</span>}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </button>
      </div>

      {/* Main menu */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
              location.pathname === item.href || (!item.exact && location.pathname.startsWith(item.href))
                ? 'bg-primary-600 text-white shadow-lg'
                : 'hover:bg-gray-800 hover:text-white'
            } ${
              isCollapsed ? 'justify-center' : ''
            }`}
          >
            <item.icon className={`h-4 w-4 ${isCollapsed ? 'h-5 w-5' : ''}`} />
            {!isCollapsed && <span className="font-medium">{item.name}</span>}
          </Link>
        ))}
      </nav>

      {/* Quick actions */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-800">
          <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                to={action.href}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                <action.icon className="h-4 w-4" />
                <span className="text-sm">{action.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Dr. Sarah Chen</p>
            <p className="text-xs text-gray-400 truncate">Premium User</p>
          </div>
        </div>
      </div>
    </div>
  );
};

