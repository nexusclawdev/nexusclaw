import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    FileText,
    Upload,
    Plus,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronRight,
    TrendingUp,
    FileSearch
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';

export const DashboardPage: React.FC = () => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocs = async () => {
            try {
                const response = await api.get('/documents');
                setDocuments(response.data);
            } catch (err: any) {
                toast.error('Failed to load documents');
            } finally {
                setLoading(false);
            }
        };
        fetchDocs();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="mt-1 text-gray-500 font-medium">Manage your legal documents and analysis reports</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        to="/contracts/new"
                        className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        New Contract
                    </Link>
                    <button className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm transition-all">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload File
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                {[
                    { label: 'Total Documents', value: documents.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active Analysis', value: '3', icon: FileSearch, color: 'text-primary-600', bg: 'bg-primary-50' },
                    { label: 'Urgent Risks', value: '1', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Verified', value: documents.filter(d => d.status === 'processed').length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.bg} p-2 rounded-xl`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-green-600">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                +12%
                            </span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Recent Documents Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">Recent Documents</h2>
                    <Link to="/contracts" className="text-sm font-semibold text-primary-600 hover:text-primary-700">View all</Link>
                </div>

                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600"></div>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No documents found. Start by uploading one!</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Document Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                                    <th className="relative px-6 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {documents.slice(0, 5).map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="bg-primary-50 p-2 rounded-lg mr-3 group-hover:bg-primary-100 transition-colors">
                                                    <FileText className="w-5 h-5 text-primary-600" />
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900">{doc.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-600 capitalize">{doc.documentType}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${doc.status === 'processed' ? 'bg-green-100 text-green-700' :
                                                    doc.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {doc.status === 'processing' && <Clock className="w-3 h-3 mr-1 animate-pulse" />}
                                                {doc.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recommended Actions */}
            <h2 className="text-lg font-bold text-gray-900 mb-4">Recommended Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-dashed border-gray-200 p-6 rounded-2xl hover:border-primary-300 hover:bg-primary-50/10 transition-all cursor-pointer group">
                    <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">Automate Service Agreement</h3>
                    <p className="text-sm text-gray-500 mb-4">Generate a compliant service agreement based on your project requirements.</p>
                    <button className="text-sm font-bold text-primary-600 flex items-center">
                        Start Drafter <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
                <div className="bg-white border-2 border-dashed border-gray-200 p-6 rounded-2xl hover:border-blue-300 hover:bg-blue-50/10 transition-all cursor-pointer group">
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">Analyze NDA for Risks</h3>
                    <p className="text-sm text-gray-500 mb-4">Upload an NDA to identify non-standard clauses and unfavorable terms.</p>
                    <button className="text-sm font-bold text-blue-600 flex items-center">
                        Upload NDA <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};
