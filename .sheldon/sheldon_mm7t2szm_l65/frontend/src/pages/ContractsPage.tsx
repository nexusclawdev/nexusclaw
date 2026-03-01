import React, { useState, useEffect } from 'react';
import {
    FileText,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Download,
    Trash2,
    FileCheck
} from 'lucide-react';
import api from '../api';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

export const ContractsPage: React.FC = () => {
    const [contracts, setContracts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const response = await api.get('/contracts');
                setContracts(response.data);
            } catch (err: any) {
                toast.error('Failed to load contracts');
            } finally {
                setLoading(false);
            }
        };
        fetchContracts();
    }, []);

    const filteredContracts = contracts.filter(c =>
        c.partyA.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.partyB.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
                    <p className="mt-1 text-gray-500 font-medium font-inter">Review and manage your signed and pending agreements</p>
                </div>
                <Link
                    to="/contracts/new"
                    className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Contract
                </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
                {/* Toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="relative flex-grow max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by party or content..."
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
                            <Filter className="w-4 h-4" />
                        </button>
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                        <span className="text-sm font-medium text-gray-500">{filteredContracts.length} Results</span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-24 flex flex-col items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600 mb-4"></div>
                        <p className="text-gray-500 font-medium">Loading repository...</p>
                    </div>
                ) : filteredContracts.length === 0 ? (
                    <div className="p-24 text-center">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileCheck className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No contracts found</h3>
                        <p className="text-gray-500 mt-1 max-w-xs mx-auto mb-6">Create your first contract using our AI swarms or upload an existing file for analysis.</p>
                        <Link to="/contracts/new" className="text-primary-600 font-bold hover:text-primary-700">Get Started →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                        {filteredContracts.map((contract) => (
                            <div key={contract.id} className="group relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-2 rounded-xl ${contract.riskLevel === 'high' ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <button className="p-1 hover:bg-gray-100 rounded-lg text-gray-400">
                                        <MoreVertical className="w-4 h-4" />
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 mb-1 truncate">{contract.partyA} / {contract.partyB}</h3>
                                <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">{contract.contractType}</p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Effective Date</span>
                                        <span className="text-xs font-semibold text-gray-700">{new Date(contract.effectiveDate).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all shadow-sm group-hover:shadow-md">
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {contract.riskLevel === 'high' && (
                                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                        <AlertCircle className="w-3 h-3" />
                                        High Risk
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
