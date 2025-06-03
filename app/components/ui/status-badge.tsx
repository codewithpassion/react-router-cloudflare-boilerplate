import { cn } from "~/lib/utils";
import { 
  Clock,
  Eye,
  Vote,
  X,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface StatusBadgeProps {
  status: 'draft' | 'open' | 'voting' | 'closed' | 'pending' | 'approved' | 'rejected';
  size?: 'sm' | 'md';
  variant?: 'solid' | 'outline';
  className?: string;
}

export function StatusBadge({ 
  status, 
  size = 'md', 
  variant = 'solid',
  className 
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          icon: Clock,
          colors: variant === 'solid' 
            ? 'bg-gray-100 text-gray-800 border-gray-200'
            : 'border-gray-300 text-gray-600 bg-transparent'
        };
      case 'open':
        return {
          label: 'Open',
          icon: Eye,
          colors: variant === 'solid'
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'border-green-300 text-green-600 bg-transparent'
        };
      case 'voting':
        return {
          label: 'Voting',
          icon: Vote,
          colors: variant === 'solid'
            ? 'bg-blue-100 text-blue-800 border-blue-200'
            : 'border-blue-300 text-blue-600 bg-transparent'
        };
      case 'closed':
        return {
          label: 'Closed',
          icon: X,
          colors: variant === 'solid'
            ? 'bg-red-100 text-red-800 border-red-200'
            : 'border-red-300 text-red-600 bg-transparent'
        };
      case 'pending':
        return {
          label: 'Pending',
          icon: AlertCircle,
          colors: variant === 'solid'
            ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
            : 'border-yellow-300 text-yellow-600 bg-transparent'
        };
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle,
          colors: variant === 'solid'
            ? 'bg-green-100 text-green-800 border-green-200'
            : 'border-green-300 text-green-600 bg-transparent'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          colors: variant === 'solid'
            ? 'bg-red-100 text-red-800 border-red-200'
            : 'border-red-300 text-red-600 bg-transparent'
        };
      default:
        return {
          label: status,
          icon: AlertCircle,
          colors: variant === 'solid'
            ? 'bg-gray-100 text-gray-800 border-gray-200'
            : 'border-gray-300 text-gray-600 bg-transparent'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        config.colors,
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn(
        size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'
      )} />
      {config.label}
    </span>
  );
}