import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, LogOut, Settings, Home, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  title?: string;
  showSearch?: boolean;
}

export const Header = ({ title = "Task Manager", showSearch = false }: HeaderProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">TM</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">{title}</h1>
          </Link>
        </div>

        {showSearch && (
          <div className="relative flex-1 max-w-md mx-6">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        )}

        <nav className="flex items-center space-x-2">
          {user ? (
            <>
              <button
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                onClick={() => navigate('/dashboard')}
                title="Dashboard"
              >
                <Home className="w-5 h-5" />
              </button>
              <button
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                onClick={() => navigate('/settings')}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <div className="h-6 w-px bg-gray-200 mx-2"></div>
              <div className="flex items-center space-x-3 px-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden md:inline text-sm font-medium text-gray-700">{user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Login</Link>
              <Link to="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">Sign Up</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};