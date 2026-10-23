import React from 'react';
export default function CollectionHeading({ eyebrow, title, children }) {
  return <header className="collection-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children && <div className="collection-heading-note">{children}</div>}</header>;
}
