import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
};

export default function Button({ variant = 'primary', children, ...rest }: Props) {
    const base = 'px-4 py-2 rounded-md font-semibold';
    const cls = variant === 'primary' ? `${base} bg-blue-600 text-white` : `${base} bg-gray-200`;
    return (
        <button className={cls} {...rest}>
            {children}
        </button>
    );
}
