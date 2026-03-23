import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const config = {
    ADMIN: { variant: 'danger' as const, label: 'Admin' },
    MENTOR: { variant: 'info' as const, label: 'Mentor' },
    MENTEE: { variant: 'success' as const, label: 'Mentee' },
  };

  const { variant, label } = config[role as keyof typeof config] || { variant: 'default' as const, label: role };

  return <Badge variant={variant}>{label}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { variant: 'success' as const, label: 'Active' },
    COMPLETED: { variant: 'default' as const, label: 'Completed' },
  };

  const { variant, label } = config[status as keyof typeof config] || {
    variant: 'default' as const,
    label: status,
  };

  return <Badge variant={variant}>{label}</Badge>;
}
