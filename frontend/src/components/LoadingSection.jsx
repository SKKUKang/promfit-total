// src/components/LoadingSection.jsx
import React from 'react';

export default function LoadingSection({ label = '로딩 중' }) {
  return (
    <section className="loading-wrap">
      <div className="loading-card">
        <div className="spinner" aria-hidden />
        <div className="loading-text">{label}</div>
      </div>
    </section>
  );
}
