import React from 'react';

const BrandMark = ({ variant = 'header' }) => (
    <span className={`brand-mark brand-mark-${variant}`}>
        <img className="brand-supplied-logo" src="/brand/new-sahara-logo.png" alt="New Sahara Gold and Diamond" width="192" height="128" />
    </span>
);

export default BrandMark;
