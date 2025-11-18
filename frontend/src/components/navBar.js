// src/components/navBar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react'


export default function NavBar() {
  const navigate = useNavigate();
  // 로그인 상태(authStatus)와 로그아웃 함수(signOut)를 가져옵니다.
  const { authStatus, signOut, user } = useAuthenticator((context) => [context.authStatus, context.user]);

  const handleLogout = () => {
    signOut();
    navigate('/'); // 로그아웃 후 메인으로
  };
  return (
    <nav className="navbar" role="navigation" aria-label="Global">
      {/* 좌측: 로고 */}
      <div className="nav-left">
        <img
          src="/logo.png"
          alt="로고"
          className="nav-logo"
        />
      </div>

      <div className="nav-links">
        <Link to="/" className="nav-link">홈</Link>
        <Link to="/library" className="nav-link">둘러보기</Link>
      </div>

<div>
        {/* 로그인 상태가 아니면 '로그인' 버튼 표시 */}
{authStatus !== 'authenticated' ? (
          /* 1. 로그인 안 된 상태: 로그인 버튼 노출 */
          <Link to="/login">
            <button type="button" className="btn btn-outline">로그인 / 회원가입</button>
          </Link>
        ) : (
          /* 2. 로그인 된 상태: 이메일과 로그아웃 버튼 노출 */
          <>
            {/* user.signInDetails.loginId에 이메일이 들어있습니다 */}
            <span>
              {user?.signInDetails?.loginId} 님
            </span>
            <button type="button" className="btn btn-solid-black" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
