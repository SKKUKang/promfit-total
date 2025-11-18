// src/components/PromptInput.jsx
import React, { useRef, useEffect, useMemo } from 'react';

export default function PromptInput({
  size = 'md',
  value,
  onChange,
  onFocus,
  onSubmit,
  options,                 // 기존 5개 boolean 상태(하위호환)
  onToggleOption,          // (key|null) => void  기존 핸들러 그대로 사용
  // ▼ 새 props
  customFrameworks = [],   // ['MY_FRAME', ...] 라이브러리에서 불러온 사용자 프레임워크 이름들
  currentFramework = null, // 현재 선택된 프레임워크 키워드 (기본/커스텀 모두)
}) {
  const isLarge = size === 'lg';

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit?.();
  };

  // 클릭 시: 이미 선택된 키면 null(해제), 아니면 해당 키로 선택
  const toggle = (key, isSelected) => {
    onToggleOption?.(isSelected ? null : key);
  };

  // ▼ 자동 높이 조절을 위한 ref 및 함수
  const taRef = useRef(null);
  const autoResize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';                 // 리셋
    el.style.height = `${el.scrollHeight}px`; // 내용에 맞게 확장
  };

  const handleChange = (e) => {
    onChange?.(e.target.value);
    requestAnimationFrame(autoResize);
  };

  useEffect(() => { autoResize(); }, [value]);
  useEffect(() => { autoResize(); }, []);

  // 기본 프레임워크 키
  const BASE_KEYS = useMemo(() => ({
    logical:    'TAG',
    creative:   'CO_STAR',
    academic:   'CARE',
    exploratory:'BAB',
    reliable:   'RTF',
  }), []);

  // 기본옵션의 선택여부는 currentFramework 우선, 없으면 기존 boolean로 폴백
  const isBaseSelected = (key, fallbackBool) => {
    const fwKey = BASE_KEYS[key];
    return currentFramework
      ? currentFramework === fwKey
      : !!fallbackBool;
  };

  return (
    <section className={`prompt-wrap ${isLarge ? 'lg' : 'md'}`}>
      <div className="panel">
        <textarea
          ref={taRef}
          className="prompt-textarea"
          placeholder="텍스트 필드"
          value={value}
          onChange={handleChange}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          rows={isLarge ? 7 : 4}
        />
        <div className="submit-side">
          <button className="primary-btn" onClick={onSubmit}>입력</button>
        </div>
      </div>

      {/* 세부 기능 섹션 */}
      <div className="options-bar" role="group" aria-label="부가기능 선택">
        <div className="options-head">
          <span className="options-title">원하는 세부 기능을 선택하세요!</span>
        </div>

        {/* 기본 프레임워크 (단일선택) */}
        <div className="options-grid" role="radiogroup" aria-label="단일 선택 - 기본 프레임워크">
          <label className="radio-chip">
            <input
              type="radio"
              name="prompt-option-base"
              checked={isBaseSelected('logical', options?.logical)}
              readOnly
              onClick={() =>
                toggle(BASE_KEYS.logical, isBaseSelected('logical', options?.logical))
              }
            />
            <span>논리적</span>
          </label>

          <label className="radio-chip">
            <input
              type="radio"
              name="prompt-option-base"
              checked={isBaseSelected('creative', options?.creative)}
              readOnly
              onClick={() =>
                toggle(BASE_KEYS.creative, isBaseSelected('creative', options?.creative))
              }
            />
            <span>창의적</span>
          </label>

          <label className="radio-chip">
            <input
              type="radio"
              name="prompt-option-base"
              checked={isBaseSelected('academic', options?.academic)}
              readOnly
              onClick={() =>
                toggle(BASE_KEYS.academic, isBaseSelected('academic', options?.academic))
              }
            />
            <span>학술적</span>
          </label>

          <label className="radio-chip">
            <input
              type="radio"
              name="prompt-option-base"
              checked={isBaseSelected('exploratory', options?.exploratory)}
              readOnly
              onClick={() =>
                toggle(BASE_KEYS.exploratory, isBaseSelected('exploratory', options?.exploratory))
              }
            />
            <span>탐색적</span>
          </label>

          <label className="radio-chip">
            <input
              type="radio"
              name="prompt-option-base"
              checked={isBaseSelected('reliable', options?.reliable)}
              readOnly
              onClick={() =>
                toggle(BASE_KEYS.reliable, isBaseSelected('reliable', options?.reliable))
              }
            />
            <span>신뢰적</span>
          </label>
        </div>

        {/* 사용자 프레임워크 (단일선택) */}
        {Array.isArray(customFrameworks) && customFrameworks.length > 0 && (
          <>
            <div className="options-head" style={{ marginTop: 12 }}>
              <div className="options-inline" style={{ marginTop: 12 }}>
                <span className="options-title">사용자 프레임워크</span>
                <span className="options-hint">Library에서 추가한 템플릿</span>
              </div>
            </div>

            <div className="options-grid" role="radiogroup" aria-label="단일 선택 - 사용자 프레임워크">
              {customFrameworks.map((fw) => {
                const selected = currentFramework === fw;
                return (
                  <label key={fw} className="radio-chip">
                    <input
                      type="radio"
                      name="prompt-option-custom"
                      checked={selected}
                      readOnly
                      onClick={() => toggle(fw, selected)}
                    />
                    <span>{fw}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
