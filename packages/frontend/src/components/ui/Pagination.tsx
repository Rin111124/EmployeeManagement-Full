import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export default function Pagination({
    page,
    limit,
    total,
    totalPages,
    onPageChange,
    className
}: PaginationProps) {
    const { t } = useTranslation();

    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;
        
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={cn(
                        "w-9 h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                        page === i 
                            ? "bg-secondary text-white shadow-md shadow-secondary/20" 
                            : "bg-white text-outline hover:bg-surface border border-outline-variant/30"
                    )}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    const startIdx = (page - 1) * limit + 1;
    const endIdx = Math.min(page * limit, total);

    return (
        <div className={cn("flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-4 border-t border-outline-variant/10 bg-surface/10", className)}>
            <div className="text-[11px] font-black text-outline uppercase tracking-wider">
                {t('common:showing')} <span className="text-primary-container">{startIdx}</span> - <span className="text-primary-container">{endIdx}</span> {t('common:of')} <span className="text-primary-container">{total}</span> {t('common:results')}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-outline-variant/30 text-outline hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1.5">
                    {renderPageNumbers()}
                </div>

                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-outline-variant/30 text-outline hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
