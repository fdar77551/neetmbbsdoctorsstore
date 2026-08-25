import React, { useState } from 'react';
import { X, Lock, Mail, User, KeyRound, AlertCircle, CheckCircle2, ShieldCheck, Loader2, Send } from 'lucide-react';
import { 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  updateProfile,
  isUserAdmin,
  getAdminRequiredPassword
} from '../lib/firebase';
import { registerNewUser, getRegisteredUsers } from '../lib/storage';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userProfile: UserProfile) => void;
  initialMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const cleanEmail = email.trim().toLowerCase();
  const requiredAdminPassword = getAdminRequiredPassword(cleanEmail);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setResetEmailSent(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/user-not-found':
        return 'No account found with this email. Please click "Sign Up" above to create your account first.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect password. Please try again or use "Forgot Password?" below to reset your password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered! Please switch to the "Log In" tab or click "Forgot Password?".';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters long.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Access to this account has been temporarily disabled due to many failed attempts. You can restore access by resetting your password.';
      case 'auth/network-request-failed':
        return 'Network connection error. Please check your internet connection and try again.';
      default:
        return err?.message || 'Authentication error occurred. Please try again.';
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    // Validation for admin accounts without leaking the password in the error
    if (requiredAdminPassword && password !== requiredAdminPassword) {
      setErrorMessage('Invalid administrator credentials provided for this email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify your confirm password.');
      return;
    }

    setLoading(true);

    try {
      // 1. Create account in Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCred.user;
      
      if (fbUser && name.trim()) {
        try {
          await updateProfile(fbUser, { displayName: name.trim() });
        } catch (profileErr) {
          console.warn('Profile name update note:', profileErr);
        }
      }

      const isAdmin = isUserAdmin(cleanEmail);
      const newProfile: UserProfile = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: name.trim(),
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0
      };

      // 2. Persist profile metadata
      registerNewUser(newProfile);

      setSuccessMessage(isAdmin ? 'Admin account created and verified! Welcome.' : 'Account created successfully! Welcome to NEET MBBS Doctors Store.');
      setTimeout(() => {
        onLoginSuccess(newProfile);
        onClose();
        resetForm();
      }, 500);
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setErrorMessage(`This email is already registered! Please switch to the "Log In" tab to sign in.`);
      } else {
        setErrorMessage(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!cleanEmail) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    // Prevent unauthorized login attempts on admin emails if master password doesn't match
    if (requiredAdminPassword && password !== requiredAdminPassword) {
      setErrorMessage('Incorrect email or password. Please check your credentials and try again.');
      return;
    }

    setLoading(true);

    try {
      // 1. Single source of truth for passwords: Firebase Authentication
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCred.user;

      // 2. Retrieve or build user profile metadata
      const existingUsers = getRegisteredUsers();
      const existing = existingUsers.find(u => u.email.toLowerCase() === cleanEmail);
      const isAdmin = isUserAdmin(cleanEmail);

      const userProfile: UserProfile = {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: fbUser.displayName || existing?.displayName || (isAdmin ? (cleanEmail.includes('fdar') ? 'Faisal Dar (Admin)' : 'Shahzaib Husain (Admin)') : cleanEmail.split('@')[0]),
        phoneNumber: existing?.phoneNumber,
        savedAddresses: existing?.savedAddresses,
        avatarUrl: existing?.avatarUrl,
        photoURL: fbUser.photoURL || existing?.photoURL,
        role: isAdmin ? 'admin' : (existing?.role || 'user'),
        createdAt: existing?.createdAt || new Date().toISOString(),
        totalOrders: existing?.totalOrders || 0,
        totalSpent: existing?.totalSpent || 0
      };

      registerNewUser(userProfile);

      setSuccessMessage('Login successful! Welcome back.');
      setTimeout(() => {
        onLoginSuccess(userProfile);
        onClose();
        resetForm();
      }, 400);
    } catch (err: any) {
      console.error('Login error:', err);
      const code = err?.code || '';

      // If it is an authorized admin using their master password, but Firebase Auth account does not exist yet:
      if (requiredAdminPassword && password === requiredAdminPassword && (code === 'auth/user-not-found' || code === 'auth/invalid-credential')) {
        try {
          // Auto-provision into Firebase Auth on the fly
          const newUserCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          const newFbUser = newUserCred.user;
          const defaultAdminName = cleanEmail.includes('fdar') ? 'Faisal Dar (Admin)' : 'Shahzaib Husain (Admin)';
          try {
            await updateProfile(newFbUser, { displayName: defaultAdminName });
          } catch (pErr) {}

          const adminProfile: UserProfile = {
            uid: newFbUser.uid,
            email: cleanEmail,
            displayName: defaultAdminName,
            role: 'admin',
            createdAt: new Date().toISOString(),
            totalOrders: 0,
            totalSpent: 0
          };
          registerNewUser(adminProfile);

          setSuccessMessage('Admin account authenticated! Welcome.');
          setTimeout(() => {
            onLoginSuccess(adminProfile);
            onClose();
            resetForm();
          }, 500);
          return;
        } catch (createErr: any) {
          console.warn('Auto-create fallback note:', createErr);
          setErrorMessage('Unable to complete admin authentication. Please verify credentials.');
          return;
        }
      }

      setErrorMessage(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Official Firebase Password Reset Email Flow
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetEmailSent(true);
      setSuccessMessage(`Password reset link sent to ${cleanEmail}! Please check your inbox and spam folder.`);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        id="auth-modal"
        className="bg-white text-slate-900 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
          <div>
            <h2 className="font-black text-sm tracking-wide flex items-center gap-1.5 font-['Outfit',sans-serif]">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>NEET MBBS Doctors Store</span>
            </h2>
            <p className="text-[10px] text-slate-400">
              {mode === 'login' && 'Sign in to access your orders & purchased PDFs'}
              {mode === 'signup' && 'Create your aspirant or admin account'}
              {mode === 'forgot' && 'Reset account password with Firebase'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch for Login / Signup */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold">
            <button
              onClick={() => {
                setMode('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 text-center transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setMode('signup');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2.5 text-center transition cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Form Body */}
        <div className="p-4 space-y-3">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-2.5 rounded-xl flex items-start gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-2.5 rounded-xl flex items-start gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-tight">{successMessage}</span>
            </div>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. Aryan Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="aspirant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 transition disabled:opacity-50 mt-1 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign Up & Continue</span>}
              </button>
            </form>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="aspirant@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setResetEmailSent(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 transition disabled:opacity-50 mt-1 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Log In to Account</span>}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM (Official Firebase Reset Email) */}
          {mode === 'forgot' && (
            <div className="space-y-3">
              {resetEmailSent ? (
                <div className="space-y-3 text-center py-2">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                    <Send className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900">
                    Password Reset Link Sent!
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed px-2">
                    We sent an official Firebase password reset link to <strong className="text-slate-900">{email}</strong>.
                    Please check your inbox (and spam folder) and click the link to reset your password on Firebase.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Once reset, return here and log in with your updated password.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setResetEmailSent(false);
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your registered email address. We will send you an official Firebase password reset link to create a new password securely.
                  </p>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Registered Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        placeholder="e.g. aspirant@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Reset Link to Email</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    className="w-full text-center text-xs font-bold text-slate-600 hover:text-slate-950 py-1 cursor-pointer"
                  >
                    ← Back to Login
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

