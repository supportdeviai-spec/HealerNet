import React from 'react';
import AuthLayout from '../../components/auth/AuthLayout';
import RegisterForm from '../../components/auth/RegisterForm';

export default function RegisterPage({ onNavigate }) {
 return (
  <AuthLayout
    page="registration"
    title="Join the HealerNet Community"
    subtitle="Create your account and become part of a global community dedicated to evidence-based healing, collaboration, and well-being."
  >
    <RegisterForm
      onNavigate={onNavigate}
      onSuccessRedirect={(data) => onNavigate('register-thanks', data)}
    />
  </AuthLayout>
)
}
