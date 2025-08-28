'use client';

import React, { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { withoutAuth } from '@/components/auth/ProtectedRoute';

function LoginPage() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10'>
          {showSignup ? (
            <SignupForm onSwitchToLogin={() => setShowSignup(false)} />
          ) : (
            <LoginForm
              onSwitchToSignup={() => setShowSignup(true)}
              onForgotPassword={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default withoutAuth(LoginPage);
