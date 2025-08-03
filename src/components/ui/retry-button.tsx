import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RetryButtonProps {
  onRetry: () => void | Promise<void>;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function RetryButton({ 
  onRetry, 
  disabled = false, 
  children = "Try again",
  className,
  variant = "outline"
}: RetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      variant={variant}
      className={cn(className)}
    >
      <RefreshCw className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} />
      {isRetrying ? "Retrying..." : children}
    </Button>
  );
}