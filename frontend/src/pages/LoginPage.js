// src/pages/LoginPage.js
import React, { useEffect } from 'react';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { useNavigate } from 'react-router-dom'; // react-router 사용 시
import '@aws-amplify/ui-react/styles.css';

export default function LoginPage() {
  const { authStatus } = useAuthenticator(context => [context.authStatus]);
  const navigate = useNavigate();

  // 로그인 성공 시 메인으로 자동 이동 (authenticated 상태가 되면)
  useEffect(() => {
    if (authStatus === 'authenticated') {
      navigate('/'); // 메인 페이지 경로로 이동
    }
  }, [authStatus, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
      {/* 이 컴포넌트 하나가 로그인/회원가입 폼 역할을 다 합니다 */}
      <Authenticator /> 
    </div>
  );
}