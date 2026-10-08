import React from 'react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-surface">
            <header className="p-4 bg-white shadow">App Header</header>
            <main className="p-6">{children}</main>
        </div>
    );
}
