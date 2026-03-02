import React from 'react';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';

export const DashboardPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Tasks</h3>
                                <p className="text-4xl font-bold text-blue-600">0</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">In Progress</h3>
                                <p className="text-4xl font-bold text-yellow-500">0</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed</h3>
                                <p className="text-4xl font-bold text-green-500">0</p>
                            </div>
                        </div>

                        <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">No tasks found</h2>
                            <p className="text-gray-500 mb-6">Start by creating your first task to get organized!</p>
                            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                                Create New Task
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
