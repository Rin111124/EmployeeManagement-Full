import React from 'react';
import { DeviceStatus } from '../../services/device.service';

interface Props {
  status: DeviceStatus;
}

const DeviceStatusBadge: React.FC<Props> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case DeviceStatus.APPROVED:
        return 'bg-green-100 text-green-800 border-green-200 dot-bg-green-500';
      case DeviceStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dot-bg-yellow-500';
      case DeviceStatus.REJECTED:
        return 'bg-red-100 text-red-800 border-red-200 dot-bg-red-500';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dot-bg-gray-500';
    }
  };

  const styleParts = getStyles().split(' ');
  const dotColor = styleParts.find(s => s.startsWith('dot-bg-'))?.replace('dot-bg-', '') || 'bg-gray-500';
  const badgeClasses = styleParts.filter(s => !s.startsWith('dot-bg-')).join(' ');
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${badgeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 bg-${dotColor}`} />
      {status.toUpperCase()}
    </span>
  );
};

export default DeviceStatusBadge;
