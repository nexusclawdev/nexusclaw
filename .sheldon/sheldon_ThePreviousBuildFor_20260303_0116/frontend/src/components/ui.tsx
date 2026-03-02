export { default as Button } from './Button';
export { default as Card, CardContent, CardHeader, CardTitle } from './Card';
export { Header } from './Header';
export { Sidebar } from './Sidebar';

// Input component
export const Input = ({ icon, rightElement, className = '', ...props }: any) => {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          {icon}
        </div>
      )}
      <input
        className={`w-full px-4 py-3 ${icon ? 'pl-10' : ''} ${rightElement ? 'pr-12' : ''} border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${className}`}
        {...props}
      />
      {rightElement && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
};
