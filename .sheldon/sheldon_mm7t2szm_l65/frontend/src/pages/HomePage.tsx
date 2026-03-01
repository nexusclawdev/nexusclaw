import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, FileSearch, ArrowRight, Gavel, CheckCircle } from 'lucide-react';

export const HomePage: React.FC = () => {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white pt-16 pb-32">
                <div className="relative">
                    <div className="lg:mx-auto lg:grid lg:max-w-7xl lg:grid-flow-col-dense lg:grid-cols-2 lg:gap-24 lg:px-8">
                        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:mx-0 lg:max-w-none lg:py-16 lg:px-0">
                            <div>
                                <div>
                                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
                                        <Zap className="h-8 w-8 text-white" aria-hidden="true" />
                                    </span>
                                </div>
                                <div className="mt-6">
                                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                                        Smarter Legal Document Automation
                                    </h1>
                                    <p className="mt-4 text-lg text-gray-500">
                                        Accelerate your legal workflow with AI-powered document generation and analysis.
                                        Save hundreds of hours on contract drafting and due diligence.
                                    </p>
                                    <div className="mt-8 flex gap-4">
                                        <Link
                                            to="/dashboard"
                                            className="inline-flex items-center rounded-lg bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-primary-700 transition-all"
                                        >
                                            Get Started <ArrowRight className="ml-2 w-4 h-4" />
                                        </Link>
                                        <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all">
                                            View Demo
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 sm:mt-16 lg:mt-0">
                            <div className="pl-4 -mr-48 sm:pl-6 md:-mr-16 lg:relative lg:m-0 lg:h-full lg:px-0">
                                <div className="w-full rounded-2xl shadow-2xl border border-gray-100 bg-gray-50 aspect-video flex items-center justify-center overflow-hidden">
                                    <div className="grid grid-cols-2 gap-4 p-8 w-full max-w-lg">
                                        <div className="h-40 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse"></div>
                                        <div className="h-40 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse delay-100"></div>
                                        <div className="h-40 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse delay-200"></div>
                                        <div className="h-40 rounded-xl bg-white shadow-sm border border-gray-200 animate-pulse delay-300"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Section */}
            <div className="bg-gray-50 py-24 sm:py-32">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center">
                        <h2 className="text-base font-semibold leading-7 text-primary-600 uppercase tracking-wide">Faster Analysis</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Everything you need to automate legal tasks
                        </p>
                    </div>
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                    <FileSearch className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                                    AI-Powered Review
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                    <p className="flex-auto italic font-light">
                                        "Our AI analyzes complex contracts in seconds, identifying risks and missing clauses better than manual review."
                                    </p>
                                </dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                    <Shield className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                                    Verified Compliance
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                    <p className="flex-auto">
                                        Ensure all your documents meet the latest regulatory requirements with our automated compliance checks.
                                    </p>
                                </dd>
                            </div>
                            <div className="flex flex-col">
                                <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                                    <Gavel className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                                    Drafting Swarms
                                </dt>
                                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                                    <p className="flex-auto">
                                        Generate multi-clause agreements by just describing your deal structure. Our AI handles the legalese.
                                    </p>
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
};
