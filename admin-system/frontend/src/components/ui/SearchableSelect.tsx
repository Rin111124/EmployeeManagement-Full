import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface Option {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    noOptionsMessage?: string;
    disabled?: boolean;
    className?: string;
    error?: string;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Chọn một mục...',
    searchPlaceholder = 'Tìm kiếm...',
    noOptionsMessage = 'Không tìm thấy kết quả',
    disabled = false,
    className,
    error
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
    };

    return (
        <div className={cn('relative w-full', className)} ref={containerRef}>
            {/* Display / Trigger */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center justify-between w-full p-2.5 bg-white border rounded-xl text-sm transition-all cursor-pointer select-none',
                    isOpen ? 'border-secondary ring-2 ring-secondary/10 shadow-sm' : 'border-outline-variant/40 hover:border-outline-variant/60',
                    error ? 'border-rose-500 ring-rose-500/10' : '',
                    disabled ? 'opacity-50 cursor-not-allowed bg-surface' : ''
                )}
            >
                <span className={cn('truncate font-medium', !selectedOption ? 'text-outline-variant' : 'text-primary-container')}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <div className="flex items-center gap-1">
                    {selectedOption && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 hover:bg-surface rounded-full text-outline-variant hover:text-outline transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown
                        size={16}
                        className={cn('text-outline-variant transition-transform duration-200', isOpen && 'rotate-180')}
                    />
                </div>
            </div>

            {/* Dropdown Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 4, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute z-50 w-full bg-white border border-outline-variant/30 rounded-2xl shadow-xl overflow-hidden"
                    >
                        {/* Search Input */}
                        <div className="p-2 border-b border-outline-variant/10 bg-surface/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" size={14} />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-9 pr-4 py-1.5 bg-white border border-outline-variant/20 rounded-lg text-xs focus:border-secondary focus:ring-2 focus:ring-secondary/10 outline-none transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            'flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer text-sm font-semibold transition-colors',
                                            value === option.value
                                                ? 'bg-secondary/10 text-secondary'
                                                : 'text-primary-container hover:bg-surface'
                                        )}
                                    >
                                        <span className="truncate">{option.label}</span>
                                        {value === option.value && <Check size={14} className="shrink-0" />}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-xs text-outline-variant font-medium">
                                    {noOptionsMessage}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
