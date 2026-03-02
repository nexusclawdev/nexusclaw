import { useState } from 'react';
import { 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Download, 
  ArrowUp, 
  ArrowDown, 
  TrendingUp, 
  TrendingDown 
} from 'lucide-react';

export const Card = ({ 
  title, 
  subtitle, 
  children, 
  className = '', 
  actions, 
  variant = 'default', 
  hoverable = true, 
  ...props 
}) => {
  const baseClasses = 'bg-white/70 backdrop-blur-md border border-white/20 shadow-xl shadow-gray-200/50 rounded-2xl transition-all duration-300';
  
  const variants = {
    default: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-xl shadow-gray-200/50',
    glass: 'bg-white/50 backdrop-blur-xl border border-white/10 shadow-2xl shadow-gray-200/60',
    elevated: 'bg-white/70 backdrop-blur-md border border-white/20 shadow-2xl shadow-gray-200/50',
    compact: 'bg-white/70 backdrop-blur-sm border border-white/20 shadow-lg shadow-gray-200/30 rounded-lg'
  };

  const hoverClasses = hoverable ? 'hover:shadow-2xl hover:-translate-y-1' : '';

  const renderActions = () => {
    if (!actions) return null;
    
    return (
      <div className="flex items-center space-x-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <action.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    );
  };

  const renderStats = (stats) => {
    return (
      <div className="grid grid-cols-2 gap-4 mt-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <p className="text-2xl font-bold text-primary-600">{stat.value}</p>
            <p className="text-sm text-gray-600">{stat.label}</p>
            {stat.trend && (
              <div className={`flex items-center space-x-1 text-sm ${
                stat.trend > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{stat.trend}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`${baseClasses} ${variants[variant as keyof typeof variants]} ${hoverClasses} ${className}`} {...props}>
      <div className="p-6">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900">{title}</h3>
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
            {actions && renderActions()}
          </div>
        )}
        {children}
      </div>
      {renderStats}
    </div>
  );
};

export const StatCard = ({ 
  title, 
  value, 
  trend, 
  icon: Icon, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const variants = {
    primary: 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white',
    secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white',
    success: 'bg-gradient-to-r from-green-600 to-green-700 text-white',
    warning: 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white'
  };

  return (
    <div className={`p-6 rounded-2xl ${variants[variant as keyof typeof variants]} ${className}`} {...props}>
      <div className="flex items-center justify-between mb-4">
        {Icon && (
          <div className="p-3 bg-white/20 rounded-xl">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <button className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>
      <h3 className="text-3xl font-bold">{value}</h3>
      <p className="text-white/80 mt-1">{title}</p>
      {trend && (
        <div className={`flex items-center space-x-1 mt-3 ${
          trend > 0 ? 'text-green-200' : 'text-red-200'
        }`}>
          {trend > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          <span className="text-sm">{trend}%</span>
        </div>
      )}
    </div>
  );
};

export default Card;

export const CardContent = ({ children, className = '' }: any) => {
  return <div className={className}>{children}</div>;
};

export const CardHeader = ({ children, className = '' }: any) => {
  return <div className={`mb-4 ${className}`}>{children}</div>;
};

export const CardTitle = ({ children, className = '' }: any) => {
  return <h3 className={`text-xl font-bold text-gray-900 ${className}`}>{children}</h3>;
};
