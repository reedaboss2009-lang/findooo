
import React from 'react';
import { PharmaciesDirectory } from './PharmaciesDirectory';
import { Pharmacy, Doctor } from '../types';

interface HealthDirectoryProps {
    onSelectPharmacy: (pharmacy: Pharmacy) => void;
    onSelectDoctor: (doctor: Doctor) => void;
}

export const HealthDirectory: React.FC<HealthDirectoryProps> = ({ onSelectPharmacy }) => {
    return (
        <div className="w-full bg-gray-50 dark:bg-gray-950 transition-colors">
            {/* Content Area */}
            <div className="animate-fade-in relative z-0">
                <PharmaciesDirectory onSelectPharmacy={onSelectPharmacy} />
            </div>
        </div>
    );
};
