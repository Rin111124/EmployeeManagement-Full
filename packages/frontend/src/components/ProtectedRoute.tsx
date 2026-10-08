import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const MANAGEMENT_ROLES = ['Admin', 'HR', 'Manager'];

export default function ProtectedRoute({ children }: { children: ReactNode }) {
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-container mx-auto mb-4"></div>
                    <p className="text-sm text-outline font-medium">{t('common:checking_authentication')}</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export function RoleRoute({ children, roles = MANAGEMENT_ROLES }: { children: ReactNode; roles?: string[] }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-container mx-auto mb-4"></div>
                    <p className="text-sm text-outline font-medium">{t('common:checking_authorization')}</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const allowed = user?.roles?.some((role) => roles.includes(role));
    if (!allowed) {
        return <Navigate to="/me" replace />;
    }

    return children;
}
