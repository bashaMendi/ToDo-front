import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signupSchema, SignupFormData } from '@/lib/validations';
import { useSignup } from '@/hooks/useQueries';
import { useAuthStore } from '@/store';
import { ERROR_MESSAGES } from '@/lib/constants';

interface SignupFormProps {
  onSwitchToLogin?: () => void;
}

export const SignupForm: React.FC<SignupFormProps> = ({ onSwitchToLogin }) => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const signupMutation = useSignup();
  const { setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  // const password = watch('password'); // Will be used for password confirmation validation

  const onSubmit = async (data: SignupFormData) => {
    setGeneralError(null);

    try {
      const result = await signupMutation.mutateAsync({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (result.data) {
        setUser(result.data.user);
        router.push('/');
      } else if (result.error) {
        // Handle specific field errors
        if (result.error.field) {
          setError(result.error.field as keyof SignupFormData, {
            type: 'server',
            message: result.error.message,
          });
        } else {
          setGeneralError(result.error.message);
        }
      }
    } catch (_error) {
      setGeneralError(ERROR_MESSAGES.NETWORK_ERROR);
    }
  };

  return (
    <div className='w-full max-w-md mx-auto'>
      <div className='text-center mb-8'>
        <h2 className='text-3xl font-bold text-gray-900 mb-2'>
          יצירת חשבון חדש
        </h2>
        <p className='text-gray-600'>מלא את הפרטים ליצירת חשבון חדש</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
        {/* General Error */}
        {generalError && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <p className='text-red-800 text-sm'>{generalError}</p>
          </div>
        )}

        {/* Name Field */}
        <Input
          label='שם מלא'
          type='text'
          placeholder='הכנס את השם המלא שלך'
          leftIcon={<User className='h-4 w-4' />}
          error={errors.name?.message}
          {...register('name')}
        />

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
            placeholder='הכנס סיסמה (לפחות 8 תווים)'
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

        {/* Confirm Password Field */}
        <div className='relative'>
          <Input
            label='אימות סיסמה'
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder='הכנס שוב את הסיסמה'
            leftIcon={<Lock className='h-4 w-4' />}
            rightIcon={
              <button
                type='button'
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className='text-gray-400 hover:text-gray-600'
              >
                {showConfirmPassword ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </button>
            }
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        {/* Submit Button */}
        <Button
          type='submit'
          loading={signupMutation.isPending}
          disabled={signupMutation.isPending}
          className='w-full'
          size='lg'
        >
          {signupMutation.isPending ? 'יוצר חשבון...' : 'צור חשבון'}
        </Button>

        {/* Switch to Login */}
        <div className='text-center'>
          <p className='text-gray-600'>
            יש לך כבר חשבון?{' '}
            <button
              type='button'
              onClick={onSwitchToLogin}
              className='text-blue-600 hover:text-blue-500 font-medium transition-colors'
            >
              התחבר עכשיו
            </button>
          </p>
        </div>
      </form>
    </div>
  );
};
