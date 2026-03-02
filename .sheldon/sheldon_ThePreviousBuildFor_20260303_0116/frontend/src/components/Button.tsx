import { useState } from 'react';
import { 
  Loader2, 
  Check, 
  X, 
  Plus, 
  ArrowRight, 
  Trash2, 
  Edit2, 
  Download, 
  Search, 
  Filter 
} from 'lucide-react';

export const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  loading = false, 
  disabled = false, 
  icon: Icon, 
  children, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'transition-all duration-300 font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white shadow-lg shadow-primary-600/30',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/30',
    ghost: 'text-gray-700 hover:bg-gray-100',
    outline: 'border-2 border-primary-600 hover:bg-primary-600 text-primary-600 hover:text-white',
    success: 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg shadow-green-600/30'
  };

  const sizes = {
    small: 'px-3 py-1.5 text-sm rounded-md',
    medium: 'px-4 py-2 rounded-lg',
    large: 'px-6 py-3 rounded-xl text-lg'
  };

  const iconVariants = {
    primary: Check,
    secondary: X,
    danger: Trash2,
    success: Plus,
    download: Download,
    search: Search,
    filter: Filter
  };

  const getIcon = () => {
    if (Icon) return Icon;
    if (loading) return Loader2;
    return iconVariants[variant as keyof typeof iconVariants];
  };

  const icon = getIcon();
  const showIcon = !loading || icon !== Loader2;
  return (
    <button
      className={`${baseClasses} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {showIcon && icon && (
        <span className="mr-2">
          <icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </span>
      )}
      {loading && <span className="animate-pulse">Loading...</span>}
      {!loading && children}
      {showIcon && !children && icon && (
        <span className="ml-2">
          <icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </span>
      )}
    </button>
  );
};

export const IconButton = ({ 
  variant = 'primary', 
  size = 'medium', 
  loading = false, 
  disabled = false, 
  icon: Icon, 
  children, 
  className = '', 
  ...props 
}) => {
  const baseClasses = 'transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 rounded-full';
  
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white shadow-lg shadow-primary-600/30',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/30',
    ghost: 'text-gray-700 hover:bg-gray-100',
    outline: 'border-2 border-primary-600 hover:bg-primary-600 text-primary-600 hover:text-white'
  };

  const sizes = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant as keyof typeof variants]} ${sizes[size as keyof typeof sizes]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {Icon && (
        <span>
          <Icon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </span>
      )}
    </button>
  );
};


export default Button;
