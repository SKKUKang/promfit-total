import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "ap-northeast-2_uV8vEmX2v",
      userPoolClientId: "3ihbvo5jfqieb0pkio2slmvuds",
      identityPoolId: undefined, // 쓰면 넣고, 안 쓰면 제거
      loginWith: {
        email: true,
      },
    }
  }
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Provider는 Router '밖'에 두는 것이 안정적 */}
    <Authenticator.Provider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Authenticator.Provider>
  </React.StrictMode>
);

reportWebVitals();
