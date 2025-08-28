import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { useLogin } from '@/hooks/useQueries';
import { useAuthStore } from '@/store';
import { ERROR_MESSAGES } from '@/lib/constants';

interface LoginFormProps {
  onSwitchToSignup?: () => void;
  onForgotPassword?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSwitchToSignup,
  onForgotPassword,
}) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setGeneralError(null);

    try {
      const result = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
      });

      if (result.data) {
        // Handle both direct user object and nested structure
        const user = result.data.user || result.data;
        
        if (user && (user as any).id) {
          // useLogin already updates the store - no need to call setUser here
          console.log('[LOGIN] User logged in successfully:', user);
        } else {
          setGeneralError('נתוני משתמש לא תקינים');
        }
      } else if (result.error) {
        // Handle different error types
        if (result.error.code === 401) {
          setGeneralError('אימייל או סיסמה שגויים');
        } else if (result.error.code === 0) {
          // Network error - server not available
          setGeneralError(ERROR_MESSAGES.NETWORK_ERROR);
        } else if (result.error.field) {
          setError(result.error.field as keyof LoginFormData, {
            type: 'server',
            message: result.error.message,
          });
        } else {
          setGeneralError(result.error.message);
        }
      }
    } catch {
      setGeneralError(ERROR_MESSAGES.NETWORK_ERROR);
    }
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <div className='text-center mb-8'>
        <h2 className='text-3xl font-bold text-gray-900 mb-2'>
          התחברות למערכת
        </h2>
        <p className='text-gray-600'>הכנס את פרטי ההתחברות שלך</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* General Error */}
        {generalError && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <p className='text-red-800 text-sm'>{generalError}</p>
          </div>
        )}

        {/* Email Field */}
        <Input
          label='אימייל'
          type='email'
          placeholder='הכנס את האימייל שלך'
          leftIcon={<Mail className='h-4 w-4' />}
          error={errors.email?.message}
          {...register('email')}
        />

        {/* Password Field */}
        <div className='relative'>
          <Input
            label='סיסמה'
            type={showPassword ? 'text' : 'password'}
            placeholder='הכנס את הסיסמה שלך'
            leftIcon={<Lock className='h-4 w-4' />}
            rightIcon={
              <button
                type='button'
                onClick={() => setShowPassword(!showPassword)}
                className='text-gray-400 hover:text-gray-600'
              >
                {showPassword ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />
        </div>

        {/* Forgot Password Link */}
        <div className='text-left'>
          <button
            type='button'
            onClick={onForgotPassword}
            className='text-sm text-blue-600 hover:text-blue-500 transition-colors'
          >
            שכחת סיסמה?
          </button>
        </div>

        {/* Submit Button */}
        <Button
          type='submit'
          loading={loginMutation.isPending}
          disabled={loginMutation.isPending}
          className='w-full'
          size='lg'
        >
          {loginMutation.isPending ? 'מתחבר...' : 'התחבר'}
        </Button>

        {/* Switch to Signup */}
        <div className='text-center'>
          <p className='text-gray-600'>
            אין לך חשבון?{' '}
            <button
              type='button'
              onClick={onSwitchToSignup}
              className='text-blue-600 hover:text-blue-500 font-medium transition-colors'
            >
              הירשם עכשיו
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
