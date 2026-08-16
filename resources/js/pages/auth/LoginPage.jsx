import React from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import LoginForm from '../../components/auth/LoginForm';

export default function LoginPage({ onNavigate }) {
 return (
  <AuthLayout
    page="login"
    title="Welcome Back"
    subtitle="Sign in to your HealerNet administrator account to securely manage the platform."
  >
    <LoginForm
      onSwitchToRegister={() => onNavigate('register')}
      onNavigate={onNavigate}
    />
  </AuthLayout>
)
}

