import React, { useState } from 'react';

interface StaffAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const StaffAvatar: React.FC<StaffAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);

  // Compute initials (up to 2 letters)
  const getInitials = (n: string) => {
    if (!n) return 'ST';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  // Generate consistent color based on name
  const getColorGradient = (n: string) => {
    const gradients = [
      'from-teal-500 to-emerald-600 text-white',
      'from-cyan-600 to-blue-600 text-white',
      'from-indigo-500 to-purple-600 text-white',
      'from-sky-500 to-teal-600 text-white',
      'from-emerald-500 to-teal-700 text-white',
      'from-slate-700 to-slate-900 text-white',
    ];
    let hash = 0;
    for (let i = 0; i < n.length; i++) {
      hash = n.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm font-semibold',
    lg: 'w-14 h-14 text-lg font-bold',
    xl: 'w-18 h-18 text-xl font-bold',
  };

  const hasValidImage = avatarUrl && avatarUrl.trim() !== '' && !imageError;

  if (hasValidImage) {
    return (
      <img
        src={avatarUrl!}
        alt={name}
        onError={() => setImageError(true)}
        className={`${sizeClasses[size]} rounded-2xl object-cover ring-1 ring-slate-200/80 shadow-xs ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-tr ${getColorGradient(
        name
      )} flex items-center justify-center font-bold tracking-wider ring-1 ring-white/20 shadow-xs select-none ${className}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
};
