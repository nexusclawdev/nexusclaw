import { Check, X, Plus, Trash2, Edit, ArrowRight, Loading2 } from 'lucide-react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400',
  ghost: 'text-gray-700 hover:bg-gray-100',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  className = '',
  children,
  onClick,
  type = 'button',
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';
  
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && <Loading2 className="w-4 h-4 mr-2 animate-spin" />}
      {icon && !loading && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};

export const PrimaryButton = Button;
export const SecondaryButton = (props: Omit<ButtonProps, 'variant'>) => <Button variant="secondary" {...props} />;
export const DangerButton = (props: Omit<ButtonProps, 'variant'>) => <Button variant="danger" {...props} />;
export const OutlineButton = (props: Omit<ButtonProps, 'variant'>) => <Button variant="outline" {...props} />;
export const GhostButton = (props: Omit<ButtonProps, 'variant'>) => <Button variant="ghost" {...props} />;

export const IconButton = ({ 
  icon, 
  variant = 'ghost', 
  size = 'md', 
  ...props 
}: Omit<ButtonProps, 'children'> & { icon: React.ReactNode }) => (
  <Button variant={variant} size={size} icon={icon} {...props} />
);

export const ActionButtons = ({
  onEdit,
  onDelete,
  onArchive,
  onDuplicate
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
}) => (
  <div className="flex space-x-2">
    {onEdit && (
      <IconButton icon={<Edit className="w-4 h-4" />} onClick={onEdit} title="Edit" />
    )}
    {onDelete && (
      <IconButton icon={<Trash2 className="w-4 h-4" />} variant="danger" onClick={onDelete} title="Delete" />
    )}
    {onArchive && (
      <IconButton icon={<X className="w-4 h-4" />} onClick={onArchive} title="Archive" />
    )}
    {onDuplicate && (
      <IconButton icon={<Plus className="w-4 h-4" />} onClick={onDuplicate} title="Duplicate" />
    )}
  </div>
);