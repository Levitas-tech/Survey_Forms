import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className, 
  hover = true 
}) => {
  return (
    <div
      className={cn(
        'card',
        hover && 'hover:shadow-lg hover:-translate-y-1',
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('card-header', className)}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('card-body', className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className={cn('card-footer', className)}>
      {children}
    </div>
  );
};
