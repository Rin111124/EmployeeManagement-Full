import React from 'react';
import { useRouter } from 'expo-router';
import DeviceDashboard from '../src/components/terminal/DeviceDashboard';

export default function AdminPage() {
  const router = useRouter();

  return (
    <DeviceDashboard onBack={() => router.replace('/')} />
  );
}
