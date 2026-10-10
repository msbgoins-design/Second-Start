import React from 'react';

interface UserGreetingProps {
  displayName?: string | null;
  curfewTime?: string;
}

export const UserGreeting: React.FC<UserGreetingProps> = ({
  displayName,
  curfewTime = '9:00 PM'
}) => {
  // Extract just the first name, fallback to 'Friend' if null
  const firstName = displayName ? displayName.split(' ')[0] : 'Friend';
  
  // Quick logic for dynamic date
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });

  return (
    <header className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {today}
        </p>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Good morning, {firstName}.
        </h1>
      </div>
    </header>
  );
};