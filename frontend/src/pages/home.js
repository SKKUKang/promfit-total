// src/pages/home.js
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import NavBar from '../components/navBar';
import PromptInput from '../components/PromptInput';
import LoadingSection from '../components/LoadingSection';
import ResultSection from '../components/ResultSection';
import './home.css';
import { API_BASE } from '../config';
import { useAuthenticator } from '@aws-amplify/ui-react';

export default function Home() {
  const [viewState, setViewState] = useState('idle');
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState([]);
  
  const { authStatus, user } = useAuthenticator(context => [context.authStatus, context.user]);
  // 1. 토큰 추출 헬퍼 함수를 통해 Access Token을 안전하게 가져옴
  const token = user?.getSignInUserSession?.()?.getIdToken?.()?.getJwtToken?.() || null; 

  // 2. callPromptAPI 함수를 Home 컴포넌트 안에서 정의하고 token을 인수로 받도록 변경
  //    (또는 인수로 받지 않고 내부의 token 변수를 사용하도록 함수 정의)
  //    *현재 구조에서는 token 변수를 클로저로 사용합니다.*
  async function callPromptAPI(prompt, framework) {
    const API_URL = `${API_BASE}/api/prompt`;

    // 3. API 호출 전에 token 유무 재확인 (handleSubmit에서 이미 하지만 안전장치)
    // if (!token) {
    //   throw new Error("로그인이 필요합니다. 토큰이 없습니다.");
    // }

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, // token 사용
      body: JSON.stringify({ prompt, framework }),
    });
    
    // if (res.status === 401) {
    //   alert("로그인이 만료되었거나 로그인이 필요합니다.");
    //   throw new Error("401 Unauthorized: 로그인 필요"); // 에러를 던져서 catch 블록으로 전달
    // }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || '요청 실패');
    }
    return String(data?.refined_prompt ?? '')
      .replace(/^\s*\n/, '')
      .replace(/\s+$/, '');
  }

  // ✅ 단일 선택 프레임워크 상태 (이하 생략)
  const [selectedFramework, setSelectedFramework] = useState(null);
  const [customFrameworks, setCustomFrameworks] = useState([]);
  const showIntro = useMemo(() => viewState === 'idle', [viewState]);

  // 사용자 프레임워크 로드 (GET /api/frameworks)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    
    // 4. 비로그인 상태일 때는 API 호출을 막습니다. (optional)
    if (authStatus !== 'authenticated' || !token) {
        setCustomFrameworks([]);
        return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/frameworks`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'Authorization': `Bearer ${token}` // token 사용
          },
          cache: 'no-store',
          signal: controller.signal,
        });
        
        if (res.status === 401) {
            alert("로그인이 만료되었거나 목록을 불러올 권한이 없습니다.");
            return;
        }
        
        // ... (나머지 성공 로직) ...
        // 이하 목록 처리 로직은 동일
        
        const ct = res.headers.get('content-type') || '';
        const body = ct.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) throw new Error(typeof body === 'string' ? body : (body?.error || '목록 조회 실패'));
        if (!ct.includes('application/json')) throw new Error('JSON이 아닌 응답입니다.');
        if (!isMounted) return;

        const RESERVED = new Set(['RTF','TAG','BAB','CARE','CO_STAR']);
        const names = Array.isArray(body?.frameworks)
            ? body.frameworks
                .map(f => String(f.framework || '').trim())
                .filter(Boolean)
                .filter(name => !RESERVED.has(name.toUpperCase()))
            : [];
        const unique = Array.from(new Set(names.map(n => n.toUpperCase())))
            .map(u => names.find(n => n.toUpperCase() === u)); 

        setCustomFrameworks(unique);
      } catch (e) {
        console.warn('[Home] custom frameworks fetch failed:', e);
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
    // 5. [핵심 수정] 의존성 배열에 token과 authStatus를 추가
    //    -> 로그인 상태가 바뀔 때마다 useEffect가 다시 실행되어 최신 token으로 GET 요청
  }, [authStatus, token]); 

  // 제출(엔터/버튼) → loading → done
  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) return;
    
    // 6. [핵심 수정] 제출 전 로그인 상태 확인
    // if (authStatus !== 'authenticated' || !token) {
    //     alert("로그인이 필요합니다.");
    //     return;
    // }

    setViewState('loading');

    const asked = inputText;
    const framework = selectedFramework ?? 'TAG';

    try {
      // callPromptAPI는 클로저로 token을 사용합니다.
      const converted = await callPromptAPI(asked, framework); 

      // ... (결과 처리 로직) ...
      setResults(prev => [{ id: Date.now(), text: converted, prompt: asked }, ...prev]);
      setInputText('');
      setViewState('done');
    } catch (err) {
      console.error(err);
      alert(err.message || '요청 중 오류가 발생했습니다.');
      setViewState('done');
    } }, [inputText, selectedFramework, authStatus, token]);

  return (
    <div className="app-root" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <NavBar />
      <div style={{ height: 24 }} />

      <main className={`main-section state-${viewState}`}>
        {showIntro && (
          <section className="intro-section">
            <div className="intro-card">
              <img
                src="/slogan.png"
                alt="Prom:Fit — Fit your prompt, Prom:fit"
                className="intro-slogan"
                loading="eager"
                decoding="async"
              />
              <br />
              <p className="intro-desc">좋은 질문이 어느 때보다도 중요해진 시대. 프롬프트와 목적을 입력하세요. </p>
              <p className="intro-desc">단 한 번의 질문으로 완벽한 결과를 얻을 수 있는 프롬프트를 만들어드립니다!</p>
            </div>
          </section>
        )}

        {viewState === 'idle' && (
          <PromptInput
            size="md"
            value={inputText}
            onChange={setInputText}
            onSubmit={handleSubmit}
            // ▼ 기존 options는 폴백용으로만 쓰이므로 전부 false로 둠
            options={{ logical:false, creative:false, academic:false, exploratory:false, reliable:false }}
            // ▼ 새 props: 사용자 프레임워크/현재 선택
            customFrameworks={customFrameworks}
            currentFramework={selectedFramework}
            // PromptInput에서 key 또는 null을 넘겨줌
            onToggleOption={(key) => setSelectedFramework(key)}
          />
        )}

        {viewState === 'loading' && <LoadingSection label="변환 중입니다..." />}

        {viewState === 'done' && (
          <>
            {results.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <ResultSection
                  title="✅변환 완료!"
                  content={results[0].text}
                  onCopy={() => navigator.clipboard.writeText(results[0].text)}
                  question={results[0].prompt}
                />
              </div>
            )}

            <div style={{ height: 16 }} />
            <PromptInput
              size="md"
              value={inputText}
              onChange={setInputText}
              onSubmit={handleSubmit}
              options={{ logical:false, creative:false, academic:false, exploratory:false, reliable:false }}
              customFrameworks={customFrameworks}
              currentFramework={selectedFramework}
              onToggleOption={(key) => setSelectedFramework(key)}
            />

            <div style={{ height: 1, background: '#eee', margin: '24px 0' }} />

            {results.length > 1 && (
              <div className="result-banner" style={{ marginTop: 30, marginBottom: 20 }}>
                📌이전 결과
              </div>
            )}

            {results.slice(1).map((r) => (
              <div key={r.id} style={{ marginBottom: 16 }}>
                <ResultSection
                  title={null}
                  content={r.text}
                  onCopy={() => navigator.clipboard.writeText(r.text)}
                  compact={true}
                />
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}
