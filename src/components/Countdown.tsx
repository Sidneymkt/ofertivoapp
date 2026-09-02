import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownProps {
  endDate: string;
  className?: string;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'badge';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

const calculateTimeLeft = (endDate: string): TimeLeft => {
  const difference = new Date(endDate).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
};

export const Countdown = ({ 
  endDate, 
  className, 
  showIcon = true,
  variant = 'default' 
}: CountdownProps) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.days === 0 && timeLeft.hours < 24;
  const isCritical = timeLeft.total > 0 && timeLeft.days === 0 && timeLeft.hours < 2;

  // Formato compacto para badges
  if (variant === 'badge') {
    if (isExpired) {
      return (
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive",
          className
        )}>
          <CheckCircle className="w-3 h-3" />
          Encerrado
        </span>
      );
    }

    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
        isCritical 
          ? "bg-destructive/10 text-destructive animate-pulse" 
          : isUrgent 
            ? "bg-warning/10 text-warning" 
            : "bg-primary/10 text-primary",
        className
      )}>
        {showIcon && <Clock className="w-3 h-3" />}
        {timeLeft.days > 0 
          ? `${timeLeft.days}d ${timeLeft.hours}h`
          : timeLeft.hours > 0
            ? `${timeLeft.hours}h ${timeLeft.minutes}m`
            : `${timeLeft.minutes}m ${timeLeft.seconds}s`
        }
      </span>
    );
  }

  // Formato compacto inline
  if (variant === 'compact') {
    if (isExpired) {
      return (
        <div className={cn("flex items-center gap-1 text-sm text-destructive", className)}>
          <CheckCircle className="w-4 h-4" />
          <span>Encerrado</span>
        </div>
      );
    }

    return (
      <div className={cn(
        "flex items-center gap-1 text-sm",
        isCritical 
          ? "text-destructive animate-pulse font-medium" 
          : isUrgent 
            ? "text-warning font-medium" 
            : "text-muted-foreground",
        className
      )}>
        {showIcon && (isCritical ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />)}
        <span>
          {timeLeft.days > 0 
            ? `${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m`
            : timeLeft.hours > 0
              ? `${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`
              : `${timeLeft.minutes}m ${timeLeft.seconds}s`
          }
        </span>
      </div>
    );
  }

  // Formato padrão com boxes
  if (isExpired) {
    return (
      <div className={cn("flex items-center gap-2 text-destructive", className)}>
        <CheckCircle className="w-5 h-5" />
        <span className="font-medium">Encerrado</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl border-2 w-full",
      isCritical 
        ? "bg-gradient-to-r from-destructive/20 to-destructive/10 border-destructive/50 shadow-lg shadow-destructive/20" 
        : isUrgent 
          ? "bg-gradient-to-r from-warning/20 to-warning/10 border-warning/50 shadow-lg shadow-warning/20" 
          : "bg-gradient-to-r from-primary/15 to-accent/15 border-primary/30 shadow-lg shadow-primary/10",
      className
    )}>
      {showIcon && (
        <div className={cn(
          "p-1.5 sm:p-2 rounded-full shrink-0",
          isCritical 
            ? "bg-destructive/20 text-destructive animate-pulse" 
            : isUrgent 
              ? "bg-warning/20 text-warning" 
              : "bg-primary/20 text-primary"
        )}>
          {isCritical 
            ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            : <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          }
        </div>
      )}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-1 justify-center">
        {timeLeft.days > 0 && (
          <>
            <TimeBox value={timeLeft.days} label="d" urgent={isUrgent} critical={isCritical} />
            <span className={cn(
              "text-sm sm:text-lg font-bold",
              isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-primary"
            )}>:</span>
          </>
        )}
        <TimeBox value={timeLeft.hours} label="h" urgent={isUrgent} critical={isCritical} />
        <span className={cn(
          "text-sm sm:text-lg font-bold",
          isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-primary"
        )}>:</span>
        <TimeBox value={timeLeft.minutes} label="m" urgent={isUrgent} critical={isCritical} />
        <span className={cn(
          "text-sm sm:text-lg font-bold",
          isCritical ? "text-destructive" : isUrgent ? "text-warning" : "text-primary"
        )}>:</span>
        <TimeBox value={timeLeft.seconds} label="s" urgent={isUrgent} critical={isCritical} />
      </div>
    </div>
  );
};

const TimeBox = ({ 
  value, 
  label, 
  urgent, 
  critical 
}: { 
  value: number; 
  label: string;
  urgent?: boolean;
  critical?: boolean;
}) => (
  <div className={cn(
    "flex flex-col items-center justify-center px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded-lg min-w-[2.25rem] sm:min-w-[3rem] font-mono shadow-sm",
    critical 
      ? "bg-destructive text-destructive-foreground animate-pulse shadow-destructive/30" 
      : urgent 
        ? "bg-warning text-warning-foreground shadow-warning/30" 
        : "bg-primary text-primary-foreground shadow-primary/30"
  )}>
    <span className="font-bold text-sm sm:text-lg leading-none">
      {value.toString().padStart(2, '0')}
    </span>
    <span className="text-[8px] sm:text-[10px] uppercase opacity-80 font-medium">{label}</span>
  </div>
);

export default Countdown;
