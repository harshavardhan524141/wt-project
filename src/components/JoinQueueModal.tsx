import React, { useState } from 'react';
import { Service } from '../types/index.ts';
import { api, ApiError } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import {
  Ticket,
  Clock,
  Users,
  X,
  AlertCircle,
  CheckCircle2,
  Phone,
  Mail,
  User,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

interface JoinQueueModalProps {
  service: Service | null;
  onClose: () => void;
  onSuccess: (tokenId: number) => void;
  onRequireLogin: () => void;
}

export const JoinQueueModal: React.FC<JoinQueueModalProps> = ({
  service,
  onClose,
  onSuccess,
  onRequireLogin,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [purposeDetail, setPurposeDetail] = useState('');

  // Verification states
  const [verificationType, setVerificationType] = useState<'mobile' | 'gmail'>('mobile');
  const [otpCode, setOtpCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(user));
  const [generatedDemoOtp, setGeneratedDemoOtp] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingTokenId, setExistingTokenId] = useState<number | null>(null);

  if (!service) return null;

  // Send Verification Code (Mobile OTP or Gmail)
  const handleSendCode = async () => {
    const target = verificationType === 'mobile' ? customerPhone.trim() : customerEmail.trim();
    if (!target) {
      setError(`Please enter your ${verificationType === 'mobile' ? 'mobile number' : 'Gmail address'} first.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post<{ success: boolean; demoCode: string; message: string }>('/auth/send-verification', {
        contact: target,
        type: verificationType,
      });
      setIsCodeSent(true);
      setGeneratedDemoOtp(res.demoCode || '123456');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Verify Code
  const handleVerifyCode = async () => {
    const target = verificationType === 'mobile' ? customerPhone.trim() : customerEmail.trim();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/verify-code', {
        contact: target,
        code: otpCode.trim(),
      });
      setIsVerified(true);
      setIsCodeSent(false);
    } catch (err: any) {
      setError(err.message || 'Invalid code. Use 123456 to verify instantly.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Token Generation
  const handleGenerateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      onRequireLogin();
      return;
    }

    if (!customerName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    setLoading(true);
    setError(null);
    setExistingTokenId(null);

    try {
      const res = await api.post<{ token: { id: number } }>('/queue/join', {
        service_id: service.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: customerEmail.trim(),
        notes: purposeDetail.trim() || `${service.name}`,
        verification_method: isVerified
          ? `${verificationType === 'mobile' ? 'Mobile' : 'Gmail'} Verified (${verificationType === 'mobile' ? customerPhone : customerEmail})`
          : 'Customer Verified',
      });

      onSuccess(res.token.id);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.data?.activeTokenId) {
          setExistingTokenId(err.data.activeTokenId);
        }
      } else {
        setError('Failed to issue token. Please check your network.');
      }
    } finally {
      setLoading(false);
    }
  };

  const currentWaiting = service.waiting_count ?? 0;
  const estimatedWait = (currentWaiting + 1) * service.avg_service_time_mins;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Ticket className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Issue Digital Queue Token</h3>
              <p className="text-[11px] text-slate-500">{service.center_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleGenerateToken} className="p-6 overflow-y-auto space-y-4">
          {/* Selected Location & Service Summary */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-blue-800 font-semibold mb-1">
              <span>{service.center_category}</span>
              <span className="font-mono bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">PREFIX: {service.prefix}</span>
            </div>
            <div className="text-sm font-bold text-slate-900">{service.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{service.center_address}</div>

            <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-blue-200/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>{currentWaiting} waiting ahead</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-700">
                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Est. ~{estimatedWait} mins</span>
              </div>
            </div>
          </div>

          {/* Customer Details Gathering */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Customer Details & Purpose
            </span>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name / Student Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Harsha Patnaik"
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setIsVerified(false);
                    }}
                    placeholder="+91 98480 12345"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => {
                      setCustomerEmail(e.target.value);
                      setIsVerified(false);
                    }}
                    placeholder="student@gmail.com"
                    className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Mobile / Gmail Verification Step */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Identity Verification
                </span>
                {isVerified ? (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                    Unverified
                  </span>
                )}
              </div>

              {!isVerified && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 text-[11px]">Verify via:</span>
                    <button
                      type="button"
                      onClick={() => setVerificationType('mobile')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold ${
                        verificationType === 'mobile' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Mobile OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerificationType('gmail')}
                      className={`px-2 py-1 rounded text-[11px] font-semibold ${
                        verificationType === 'gmail' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      Gmail Code
                    </button>
                  </div>

                  {!isCodeSent ? (
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={loading}
                      className="w-full py-1.5 px-3 text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      <span>Send 6-Digit Verification Code</span>
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                          placeholder="Enter 6-digit code (e.g. 123456)"
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-300 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyCode}
                          disabled={loading}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                          Verify
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-blue-700">
                        <span>Code sent! Demo test code: <strong>{generatedDemoOtp || '123456'}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(generatedDemoOtp || '123456')}
                          className="underline font-semibold"
                        >
                          Autofill
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Purpose & Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Purpose / Roll No / Notes (Optional)
              </label>
              <input
                type="text"
                value={purposeDetail}
                onChange={(e) => setPurposeDetail(e.target.value)}
                placeholder="e.g. Fee Challan Reg #210305, Original Marks Memo, KYC..."
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
              />
            </div>
          </div>

          {/* Error Notice */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{error}</p>
                {existingTokenId && (
                  <button
                    type="button"
                    onClick={() => onSuccess(existingTokenId)}
                    className="mt-1 text-blue-700 underline font-bold"
                  >
                    View & Track Your Existing Token →
                  </button>
                )}
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              <span className="font-bold">Login required:</span> Please sign in or register to issue tokens.
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>

            {isAuthenticated ? (
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <Ticket className="w-3.5 h-3.5" />
                {loading ? 'Generating Token...' : 'Generate My Token'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequireLogin}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
              >
                Sign In to Generate
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
