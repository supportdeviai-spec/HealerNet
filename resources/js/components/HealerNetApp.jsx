import React, { useState } from 'react';
import AuthLayout from './auth/AuthLayout';
import LoginForm from './auth/LoginForm';
import RegisterForm from './auth/RegisterForm';

export default function HealerNetApp() {
    const [view, setView] = useState('login'); // 'login' | 'register' | 'dashboard'

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
            {view === 'login' && (
                <AuthLayout
                    page="login"
                    title="Welcome Back"
                    subtitle="Sign in to continue to your HealerNet clinical workspace."
                >
                    <LoginForm onSwitchToRegister={() => setView('register')} />
                </AuthLayout>
            )}

            {view === 'register' && (
                <AuthLayout
                    page="registration"
                    title="Create your Account"
                    subtitle="Join the global network of evidence-based practitioners and patients."
                >
                    <RegisterForm onSwitchToLogin={() => setView('login')} />
                </AuthLayout>
            )}
        </div>
    );
}
