import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    User,
    Mail,
    Shield,
    Bell,
    Cpu,
    Globe,
    Database,
    Lock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="mt-1 text-gray-500 font-medium">Manage your profile, security, and AI preferences</p>
            </div>

            <div className="space-y-6">
                {/* Profile Section */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                            <User className="w-4 h-4 mr-2 text-primary-600" />
                            Public Profile
                        </h2>
                        <button className="text-sm font-bold text-primary-600 hover:text-primary-700">Edit Profile</button>
                    </div>
                    <div className="p-8">
                        <div className="flex items-center gap-6 mb-8">
                            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h3>
                                <p className="text-sm text-gray-500 flex items-center mt-1">
                                    <Mail className="w-4 h-4 mr-1.5" />
                                    {user?.email}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Account Role</span>
                                <span className="text-sm font-bold text-gray-700 capitalize">{user?.role}</span>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1">Timezone</span>
                                <span className="text-sm font-bold text-gray-700">UTC-5 (New York)</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* AI & Intelligence Section */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                            <Cpu className="w-4 h-4 mr-2 text-primary-600" />
                            AI Preferences
                        </h2>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-primary-50/30 rounded-xl border border-primary-100">
                            <div className="flex items-center">
                                <div className="p-2 bg-primary-600 rounded-lg text-white mr-4">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Custom Knowledge Base</h4>
                                    <p className="text-xs text-gray-500">Train AI on your company's past contracts</p>
                                </div>
                            </div>
                            <div className="h-6 w-11 bg-primary-600 rounded-full relative cursor-pointer shadow-inner">
                                <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full shadow-md"></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-gray-100 rounded-xl">
                                    <Globe className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Model Priority</h4>
                                    <select className="mt-1 block w-48 text-sm border-gray-200 rounded-lg focus:ring-primary-600 focus:border-primary-600 bg-gray-50">
                                        <option>GPT-4o (Standard)</option>
                                        <option>Claude 3.5 Sonnet</option>
                                        <option>Gemini 1.5 Pro</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="p-2 bg-gray-100 rounded-xl">
                                    <Shield className="w-5 h-5 text-gray-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Extreme Privacy</h4>
                                    <p className="text-xs text-gray-500 mt-1">Zero-data retention drafting mode.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Security Section */}
                <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden opacity-80">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center">
                            <Lock className="w-4 h-4 mr-2 text-gray-600" />
                            Security
                        </h2>
                        <button className="text-sm font-bold text-gray-400 cursor-not-allowed">Reset Password</button>
                    </div>
                    <div className="p-8">
                        <div className="flex items-center gap-3 text-sm text-gray-500 italic">
                            <Bell className="w-4 h-4" />
                            Two-factor authentication is currently managed by your organization.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
