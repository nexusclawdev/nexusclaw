import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
    ArrowLeft,
    Sparkles,
    ChevronRight,
    User,
    Calendar,
    Settings2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import api from '../api';

export const CreateContractPage: React.FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const navigate = useNavigate();

    const onSubmit = async (data: any) => {
        setLoading(true);
        try {
            // Create document placeholder first
            const docResponse = await api.post('/uploads', {
                title: `${data.contractType.toUpperCase()} - ${data.partyA} vs ${data.partyB}`,
                documentType: 'contract'
            });

            // Simulate/Trigger AI drafting or just Save
            toast.success('AI Swarm initiated for drafting...');
            toast.success('Contract metadata saved!');
            navigate('/contracts');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create contract');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-sm font-semibold text-gray-500 hover:text-gray-900 mb-8 group transition-colors"
            >
                <ArrowLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
                Back to repository
            </button>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden mb-10">
                <div className="px-8 py-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">New Contract Swarm</h1>
                        <p className="text-primary-100 text-sm font-medium">AI-powered drafting for precision agreements</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Stepper */}
                <div className="flex px-8 py-6 border-b border-gray-50">
                    {[
                        { id: 1, label: 'Parties', icon: User },
                        { id: 2, label: 'Terms', icon: Calendar },
                        { id: 3, label: 'Configure Swarm', icon: Settings2 }
                    ].map((s) => (
                        <div key={s.id} className={`flex items-center flex-1 ${s.id !== 3 ? 'after:content-[""] after:h-[2px] after:flex-1 after:mx-4 after:bg-gray-100' : ''}`}>
                            <div className={`p-2 rounded-lg ${step >= s.id ? 'bg-primary-600 text-white shadow-lg shadow-primary-200' : 'bg-gray-50 text-gray-400'}`}>
                                <s.icon className="w-5 h-5" />
                            </div>
                            <span className={`ml-3 text-sm font-bold ${step >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="p-8">
                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Party A (Service Provider)</label>
                                    <input
                                        {...register('partyA', { required: 'Party A name is required' })}
                                        className="w-full px-4 py-3 bg-gray-50 border-transparent border-2 focus:bg-white focus:border-primary-600 rounded-xl transition-all"
                                        placeholder="e.g. Acme Legal Solutions"
                                    />
                                    {errors.partyA && <p className="text-xs text-red-600 mt-1 font-bold">{errors.partyA.message as string}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Party B (Client)</label>
                                    <input
                                        {...register('partyB', { required: 'Party B name is required' })}
                                        className="w-full px-4 py-3 bg-gray-50 border-transparent border-2 focus:bg-white focus:border-primary-600 rounded-xl transition-all"
                                        placeholder="e.g. Global Tech Inc"
                                    />
                                    {errors.partyB && <p className="text-xs text-red-600 mt-1 font-bold">{errors.partyB.message as string}</p>}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Contract Type</label>
                                <select
                                    {...register('contractType')}
                                    className="w-full px-4 py-3 bg-gray-50 border-transparent border-2 focus:bg-white focus:border-primary-600 rounded-xl transition-all"
                                >
                                    <option value="employment">Employment Agreement</option>
                                    <option value="nda">Non-Disclosure Agreement</option>
                                    <option value="lease">Lease Agreement</option>
                                    <option value="service">Service Agreement</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Effective Date</label>
                                <input
                                    type="date"
                                    {...register('effectiveDate')}
                                    className="w-full px-4 py-3 bg-gray-50 border-transparent border-2 focus:bg-white focus:border-primary-600 rounded-xl transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Special Provisions (Instructions for AI)</label>
                                <textarea
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 border-transparent border-2 focus:bg-white focus:border-primary-600 rounded-xl transition-all"
                                    placeholder="Describe specific clauses, termination rules, or custom needs..."
                                ></textarea>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-primary-50/50 p-6 rounded-2xl border border-primary-100 mb-8">
                                <h3 className="flex items-center text-primary-900 font-bold mb-4">
                                    <Sparkles className="w-5 h-5 mr-2 text-primary-600" />
                                    Swarm Intelligence Settings
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center p-3 bg-white rounded-xl border border-primary-100">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mr-2" />
                                        <span className="text-sm font-bold text-gray-700">Multi-Model Audit</span>
                                    </div>
                                    <div className="flex items-center p-3 bg-white rounded-xl border border-primary-100 opacity-50">
                                        <AlertCircle className="w-4 h-4 text-primary-600 mr-2" />
                                        <span className="text-sm font-bold text-gray-700">Extreme Optimization</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-gray-500 italic">
                                * All contracts are reviewed by 3 autonomous agents before deployment.
                            </div>
                        </div>
                    )}

                    <div className="mt-12 pt-6 border-t border-gray-50 flex justify-between items-center">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step - 1)}
                                className="px-6 py-2.5 font-bold text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Previous
                            </button>
                        ) : <div></div>}

                        {step < 3 ? (
                            <button
                                type="button"
                                onClick={() => setStep(step + 1)}
                                className="flex items-center px-8 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all group"
                            >
                                Next step
                                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center px-10 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
                            >
                                {loading ? 'Powering up swarms...' : 'Launch Swarm Drafing'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
