import React from 'react';
import { Gem } from 'lucide-react';

const BrandMark = ({ variant = 'header' }) => (
    <span className={`brand-mark brand-mark-${variant}`} aria-label="Sahara Gold & Diamond">
        <span className="brand-mark-emblem" aria-hidden="true">
            <span className="brand-mark-letter">S</span>
            <Gem size={variant === 'hero' ? 18 : 12} strokeWidth={1.4} />
        </span>
        <span className="brand-mark-copy">
            <span className="brand-mark-name">SAHARA</span>
            <span className="brand-mark-subtitle">GOLD <b>&amp;</b> DIAMOND</span>
        </span>
    </span>
);

export default BrandMark;
