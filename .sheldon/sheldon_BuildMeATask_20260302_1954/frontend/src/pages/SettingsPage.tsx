import React from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export const SettingsPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                            <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Display Name</label>
                                    <input type="text" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="Your Name" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                    <input type="email" className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder="you@example.com" />
                                </div>
                                <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                    Save Changes
                                </button>
                            </div>
                        </div>

                        <div className="mt-8 bg-white rounded-xl shadow-sm border border-red-100 p-8">
                            <h2 className="text-xl font-semibold text-red-600 mb-6">Danger Zone</h2>
                            <p className="text-gray-600 mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                            <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                                Delete Account
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
