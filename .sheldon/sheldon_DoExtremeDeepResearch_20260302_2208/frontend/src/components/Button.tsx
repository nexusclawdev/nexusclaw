import { useState } from 'react';
import { Button as LucideButton, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(loading);

  const handleClick = async () => {
    if (onClick) {
      try {
        setIsLoading(true);
        await onClick();
      } catch (error) {
        toast.error('An error occurred');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-base rounded-lg',
    lg: 'px-6 py-3 text-lg rounded-xl',
    xl: 'px-8 py-4 text-xl rounded-2xl',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500/50',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500/50',
    outline: 'border-2 border-gray-300 text-gray-900 hover:bg-gray-50 focus:ring-gray-500/50',
    ghost: 'text-gray-900 hover:bg-gray-100 focus:ring-gray-500/50',
    destructive: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500/50',
  };

  const iconClasses = 'w-4 h-4 mr-2';

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={classes}
      type="button"
    >
      {isLoading && (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      )}
      {icon && !isLoading && (
        <span className={iconPosition === 'left' ? iconClasses : 'ml-2'}>
          {icon}
        </span>
      )}
      {children}
      {icon && !isLoading && (
        <span className={iconPosition === 'right' ? iconClasses : 'mr-2'}>
          {icon}
        </span>
      )}
    </button>
  );
};

export default Button;
export { ButtonProps };