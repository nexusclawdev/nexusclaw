import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Settings, LayoutDashboard, LogOut, Gavel } from 'lucide-react';

export const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <Gavel className="h-8 w-8 text-primary-600" />
                            <span className="text-xl font-bold text-gray-900 bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-indigo-600">
                                LegalAI
                            </span>
                        </Link>

                        <nav className="hidden md:ml-8 md:flex md:space-x-8">
                            <Link to="/dashboard" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-all">
                                <LayoutDashboard className="w-4 h-4 mr-1.5" />
                                Dashboard
                            </Link>
                            <Link to="/contracts" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-all">
                                <FileText className="w-4 h-4 mr-1.5" />
                                Contracts
                            </Link>
                            <Link to="/settings" className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary-600 border-b-2 border-transparent hover:border-primary-600 transition-all">
                                <Settings className="w-4 h-4 mr-1.5" />
                                Settings
                            </Link>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</span>
                            <span className="text-xs text-gray-500 leading-none capitalize">{user?.role}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
