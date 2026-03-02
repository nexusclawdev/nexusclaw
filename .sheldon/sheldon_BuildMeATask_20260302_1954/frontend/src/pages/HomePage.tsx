import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';

export const HomePage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
                    Manage Your Tasks with <span className="text-blue-600">Precision</span>
                </h1>
                <p className="text-xl text-gray-600 mb-10 max-w-2xl">
                    The ultimate task management platform designed for high-performance teams and individuals.
                </p>
                <div className="flex gap-4">
                    <Link
                        to="/register"
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Get Started
                    </Link>
                    <Link
                        to="/login"
                        className="px-8 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                        Login
                    </Link>
                </div>
            </main>
        </div>
    );
};
