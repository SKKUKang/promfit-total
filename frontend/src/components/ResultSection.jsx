// src/components/ResultSection.jsx
import React, { useCallback, useState } from 'react';

export default function ResultSection({ title, content, onCopy, compact = false, question }) {
  const [copied, setCopied] = useState(false);

  // 실제 복사 로직 (onCopy 제공 시 우선 사용, 없으면 내부 구현)
  const handleCopy = useCallback(async () => {
    try {
      if (typeof onCopy === 'function') {
        await onCopy(); // 기존 외부 핸들러와의 호환성 유지
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback (일부 구형 브라우저/HTTP 환경)
        const ta = document.createElement('textarea');
        ta.value = content;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1500); // 1.5초 후 상태 복구
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  }, [content, onCopy]);

  return (
    <section className="result-wrap">
      {title && <div className="result-banner">{title}</div>}

        <div className={`result-card${compact ? ' compact' : ''}`}>
        {/* ✅ 최신 결과 전용: 당시 질문 표시 */}
        {typeof question === 'string' && question.trim() && (
          <div className="result-question" aria-label="입력한 질문">
            <div className="rq-title">입력한 질문</div>
            <pre className="rq-pre">{question}</pre>
          </div>
        )}
        <pre className="result-pre" aria-live="polite">{content}</pre>

        <button
          className={`floating-copy-btn${copied ? ' is-copied' : ''}`}
          onClick={handleCopy}
          aria-live="polite"
          aria-label={copied ? '복사됨' : '클립보드에 복사'}
          disabled={copied}
          title={copied ? '복사됨!' : '클립보드 복사'}
        >
          {copied ? '복사됨!' : '클립보드 복사'}
        </button>
      </div>
    </section>
  );
}
