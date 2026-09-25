import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, url, noindex = false }) => {
    const siteTitle = 'Sahara Gold & Diamond';
    const siteName = 'Sahara Gold';
    const siteDescription = 'Premium handcrafted gold and diamond jewelry in Bangladesh. Hallmark certified ensuring purity and quality.';
    const siteUrl = (import.meta.env.VITE_SITE_URL || 'https://www.shaharagold.org').replace(/\/$/, '');
    const siteImage = '/assets/images/logo.png';

    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const finalDescription = description || siteDescription;
    const finalImage = image ? (image.startsWith('http') ? image : `${siteUrl}${image.startsWith('/') ? image : `/${image}`}`) : `${siteUrl}${siteImage}`;
    const finalUrl = url ? `${siteUrl}${url.startsWith('/') ? url : `/${url}`}` : `${siteUrl}/`;

    return (
        <Helmet>
            {/* Standard Metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
            <link rel="canonical" href={finalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:locale" content="en_BD" />
            <meta property="og:locale:alternate" content="bn_BD" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={finalImage} />
        </Helmet>
    );
};

export default SEO;
