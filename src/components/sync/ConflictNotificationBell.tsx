import React, { useEffect, useState } from 'react';
import { ConflictService } from '../../services/sync/ConflictService';
import { ConflictResolverModal } from './ConflictResolverModal';
import { AlertTriangle } from 'lucide-react';

export const ConflictNotificationBell: React.FC<{ managerName?: string }> = ({ managerName }) => {
    const [count, setCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    
    // Poll for conflicts every 15 seconds
    useEffect(() => {
        const check = async () => {
            const conflicts = await ConflictService.fetchPendingConflicts();
            setCount(conflicts.length);
        };
        
        check();
        const interval = setInterval(check, 15000);
        return () => clearInterval(interval);
    }, []);

    if (count === 0) return null;

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="تضارب بيانات يحتاج مراجعة"
            >
                <AlertTriangle className="w-6 h-6 text-amber-500 animate-pulse" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                    {count}
                </span>
            </button>

            {isOpen && (
                <ConflictResolverModal 
                    onClose={() => {
                        setIsOpen(false);
                        // Refresh count on close
                        ConflictService.fetchPendingConflicts().then(c => setCount(c.length));
                    }} 
                    managerName={managerName}
                />
            )}
        </>
    );
};
