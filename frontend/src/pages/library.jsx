// src/pages/Library.jsx
import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import NavBar from "../components/navBar";
import "./home.css"; // 모노톤 변수 재사용
import { API_BASE } from "../config";
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';


async function getIdToken() {
  try {
    const session = await fetchAuthSession();
    return session?.tokens?.idToken?.toString() || null;
  } catch (err) {
    console.error("Failed to fetch ID token:", err);
    return null;
  }
}


const NAME_LIMIT = 10;
const CORE_FRAMEWORKS = new Set(["RTF", "TAG", "BAB", "CARE", "CO_STAR"]); // 삭제 불가 목록

export default function Library() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading"); // 'loading' | 'error' | 'done'
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  // 작성 모달 상태
  const [showForm, setShowForm] = useState(false);
  const [fwName, setFwName] = useState("");
  const [fwDesc, setFwDesc] = useState("");
  const [fwPrompt, setFwPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // auth token (AWS Cognito)
  const { authStatus, user } = useAuthenticator(context => [context.authStatus, context.user]);
const [token, setToken] = useState(null);

useEffect(() => {
  async function loadToken() {
    if (authStatus === 'authenticated') {
      const idToken = await getIdToken();
      setToken(idToken);
    } else {
      setToken(null);
    }
  }
  loadToken();
}, [authStatus]);

  


  // 모달 내 첫 입력 자동 포커스
  const nameInputRef = useRef(null);

  // 초기 로드
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    (async () => {
      try {
        setState("loading");
        const res = await fetch(`${API_BASE}/api/frameworks`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
            "Authorization": `Bearer ${token}`
          },
          cache: "no-store",
          signal: controller.signal,
        });
    //     if (res.status === 401) {
    //   alert("로그인이 만료되었거나 로그인이 필요합니다.");
    //   return;
    // }

        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json")
          ? await res.json()
          : await res.text();

        if (!res.ok) {
          const msg =
            typeof body === "string"
              ? body.slice(0, 200)
              : body?.error || "목록 조회 실패";
          throw new Error(msg);
        }
        if (!ct.includes("application/json")) {
          throw new Error(
            "서버가 JSON 대신 HTML/텍스트를 반환했어요:\n" +
              String(body).slice(0, 200)
          );
        }
        if (!isMounted) return;

        setList(Array.isArray(body?.frameworks) ? body.frameworks : []);
        setState("done");
      } catch (e) {
        if (!isMounted) return;
        console.error("[Library] GET error:", e);
        setError(e.message || "네트워크 오류");
        setState("error");
      }
    })();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [token]);

  // 간단 검색(이름/설명)
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((f) =>
      `${f.framework} ${f.description || ""}`.toLowerCase().includes(term)
    );
  }, [list, q]);

  // 모달 열기/닫기
  const openForm = useCallback(() => {
    setFormError("");
    setFwName("");
    setFwDesc("");
    setFwPrompt("");
    setShowForm(true);
  }, []);
  const closeForm = useCallback(() => {
    if (saving) return;
    setShowForm(false);
  }, [saving]);

  // ESC로 모달 닫기
  useEffect(() => {
    if (!showForm) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeForm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showForm, closeForm]);

  // 모달 열릴 때 첫 입력 포커스
  useEffect(() => {
    if (showForm && nameInputRef.current) {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [showForm]);

  // 모달 열릴 때 배경 스크롤 잠금
  useEffect(() => {
    const original = document.body.style.overflow;
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original;
    }
    return () => {
      document.body.style.overflow = original;
    };
  }, [showForm]);

  // 저장 (POST)
  const handleSave = useCallback(async () => {
    setFormError("");
    const nameTrim = fwName.trim();

    if (!nameTrim || !fwPrompt.trim()) {
      setFormError("이름(framework)과 변환 규칙(prompt_text)은 필수입니다.");
      return;
    }
    if (nameTrim.length > NAME_LIMIT) {
      setFormError(`이름은 최대 ${NAME_LIMIT}자까지 가능합니다.`);
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/frameworks`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          framework: nameTrim,
          prompt_text: fwPrompt,
          description: fwDesc,
        }),
      });
              if (res.status === 401) {
      alert("로그인이 만료되었거나 로그인이 필요합니다.");
      return;
    }

      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof body === "string"
            ? body.slice(0, 200)
            : body?.error || "생성 실패";
        throw new Error(msg);
      }

      // 성공: 목록 **끝에** 추가 (우측 하단 유지)
      setList((prev) => [
        ...prev,
        {
          framework: nameTrim,
          prompt_text: fwPrompt,
          author: "system",
          likes: 0,
          description: fwDesc,
        },
      ]);

      setShowForm(false);
    } catch (e) {
      console.error("[Library] POST error:", e);
      setFormError(e.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [fwName, fwDesc, fwPrompt]);

  // 삭제 (DELETE)
  const handleDelete = useCallback(async (name) => {
    if (CORE_FRAMEWORKS.has(name)) {
      alert("기본 프레임워크(RTF, TAG, BAB, CARE, CO_STAR)는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm(`'${name}' 프레임워크를 삭제할까요?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/frameworks`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ framework: name }),
      });
      if (res.status === 401) {
      alert("로그인이 만료되었거나 로그인이 필요합니다.");
      return;
    }

      const ct = res.headers.get("content-type") || "";
      const body = ct.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg =
          typeof body === "string"
            ? body.slice(0, 200)
            : body?.error || "삭제 실패";
        throw new Error(msg);
      }

      // 성공 시 목록에서 제거
      setList((prev) => prev.filter((f) => f.framework !== name));
    } catch (e) {
      console.error("[Library] DELETE error:", e);
      alert(e.message || "삭제 중 오류가 발생했습니다.");
    }
  }, [token]);

  // 모달 내부에서 Ctrl/Cmd+Enter로 저장
  const handleFormKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && !saving) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, saving]
  );

  return (
    <div className="app-root" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      <NavBar />

      <main className="main-section">
        <h1 className="lib-title">Framework Library</h1>

        <div className="lib-toolbar">
          <input
            className="lib-search"
            type="search"
            placeholder="프레임워크 검색 (이름/설명)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {state === "loading" && (
          <section className="loading-wrap">
            <div className="loading-card">
              <div className="spinner" aria-hidden />
              <div className="loading-text">목록을 불러오는 중…</div>
            </div>
          </section>
        )}

        {state === "error" && (
          <div className="lib-error">
            <div className="lib-error-title">불러오기 실패</div>
            <div className="lib-error-desc">{error}</div>
          </div>
        )}

        {state === "done" && (
          <>
            <section className="lib-grid">
              {/* 기존 카드들 */}
              {filtered.length === 0 ? (
                <article className="lib-card" tabIndex={0}>
                  <h3 className="lib-card-title">결과 없음</h3>
                  <p className="lib-card-desc">
                    검색어에 일치하는 프레임워크가 없습니다.
                  </p>
                </article>
              ) : (
                filtered.map((fw) => {
                  const protectedFw = CORE_FRAMEWORKS.has(fw.framework);
                  return (
                    <article key={fw.framework} className="lib-card" tabIndex={0}>
                      <div
                        className="lib-card-head"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <h3 className="lib-card-title">{fw.framework}</h3>

                        {/* 삭제 버튼 (기본 프레임워크는 비활성화) */}
                        <button
                          type="button"
                          className="lib-del-btn"
                          onClick={() => handleDelete(fw.framework)}
                          disabled={protectedFw}
                          title={
                            protectedFw
                              ? "기본 프레임워크는 삭제할 수 없습니다"
                              : "삭제"
                          }
                          style={{
                            cursor: protectedFw ? "not-allowed" : "pointer",
                            opacity: protectedFw ? 0.4 : 1,
                            background: "transparent",
                            border: "1px solid var(--line)",
                            color: "var(--muted)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            fontSize: 13,
                          }}
                        >
                          🗑️
                        </button>
                      </div>

                      <p className="lib-card-desc">
                        {fw.description || "설명이 없습니다."}
                      </p>
                    </article>
                  );
                })
              )}

              {/* ➕ 추가 카드: 항상 그리드의 맨 끝(우측 하단) */}
              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  className="lib-card lib-add-card"
                  onClick={openForm}
                  aria-label="나만의 프레임워크 추가"
                >
                  <div className="lib-add-plus">＋</div>
                  <div className="lib-add-text">새 프레임워크</div>
                </button>
              </div>
            </section>
          </>
        )}

        {/* 작성 모달 */}
        {showForm && (
          <div className="lib-modal-overlay" onClick={closeForm}>
            <div
              className="lib-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="lib-modal-title"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={handleFormKeyDown}
            >
              <h2 id="lib-modal-title" className="lib-modal-title">
                새 프레임워크 추가
              </h2>

              <label className="lib-field">
                <span className="lib-label">
                  이름 (framework) *{" "}
                  <small style={{ color: "var(--muted)", fontWeight: 500 }}>
                    {fwName.length}/{NAME_LIMIT}
                  </small>
                </span>
                <input
                  ref={nameInputRef}
                  className="lib-input"
                  type="text"
                  placeholder="예: MY_FRAME"
                  value={fwName}
                  maxLength={NAME_LIMIT}
                  onChange={(e) => setFwName(e.target.value)}
                />
              </label>

              <label className="lib-field">
                <span className="lib-label">설명 (description)</span>
                <textarea
                  className="lib-textarea"
                  rows={3}
                  placeholder="프레임워크에 대한 간단한 설명"
                  value={fwDesc}
                  onChange={(e) => setFwDesc(e.target.value)}
                />
              </label>

              <label className="lib-field">
                <span className="lib-label">변환 규칙 (prompt_text) *</span>
                <textarea
                  className="lib-textarea"
                  rows={8}
                  placeholder="LLM에 전달할 변환 규칙(템플릿)"
                  value={fwPrompt}
                  onChange={(e) => setFwPrompt(e.target.value)}
                />
              </label>

              {formError && <div className="lib-form-error">{formError}</div>}

              <div className="lib-modal-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn btn-solid-black"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "저장 중..." : "완료"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
