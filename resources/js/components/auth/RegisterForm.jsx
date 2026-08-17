import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../services/api';
import { locationApi } from '../../services/locationApi';
import LocationPicker, { useLocationPickerState } from '../location/LocationPicker';
import { useCountries } from '../../hooks/useCountries';
import { CheckCircle2, Loader2, Send } from 'lucide-react';

const LABEL = 'block text-xs font-bold uppercase tracking-wider text-[#0F382C] dark:text-emerald-200 mb-1.5';
const INPUT = 'w-full h-12 px-4 rounded-xl bg-[#071812] border border-white/20 text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#65A30D]/40 focus:border-[#65A30D] transition-all disabled:opacity-60';
const SELECT = INPUT + ' cursor-pointer';
const BTN_PRIMARY = 'px-4 py-3 rounded-xl bg-[#0F382C] hover:bg-[#145240] text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 whitespace-nowrap';
const FIELD_ERROR = 'text-xs text-rose-500 font-medium mt-1.5';
const OTP_LENGTH = 4;
const TITLE_OPTIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Other'];
const MAX_NAME_LENGTH = 255;
const MAX_BUSINESS_NAME_LENGTH = 255;

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

function formatDobDisplay(raw) {
  const incoming = String(raw || '').replace(/\D/g, '');
  let out = '';

  for (let i = 0; i < incoming.length && out.length < 8; i += 1) {
    const ch = incoming[i];
    if (ch < '0' || ch > '9') continue;
    const pos = out.length;

    if (pos === 0) {
      if (ch > '3') {
        out += `0${ch}`;
      } else {
        out += ch;
      }
      continue;
    }

    if (pos === 1) {
      if (out[0] === '0' && ch === '0') continue;
      if (out[0] === '3' && ch > '1') continue;
      out += ch;
      continue;
    }

    if (pos === 2) {
      if (ch > '1') {
        out += `0${ch}`;
      } else {
        out += ch;
      }
      continue;
    }

    if (pos === 3) {
      if (out[2] === '0' && ch === '0') continue;
      if (out[2] === '1' && ch > '2') continue;
      out += ch;
      continue;
    }

    out += ch;
  }

  const day = out.slice(0, 2);
  const month = out.slice(2, 4);
  const year = out.slice(4, 8);
  if (out.length <= 2) return day;
  if (out.length <= 4) return `${day} / ${month}`;
  return `${day} / ${month} / ${year}`;
}

function parseDobToIso(displayValue) {
  const digits = String(displayValue || '').replace(/\D/g, '');
  if (!digits) {
    return { iso: null, error: '' };
  }
  if (digits.length !== 8) {
    return { iso: null, error: 'Enter date of birth as DD / MM / YYYY.' };
  }

  const day = parseInt(digits.slice(0, 2), 10);
  const month = parseInt(digits.slice(2, 4), 10);
  const year = parseInt(digits.slice(4, 8), 10);

  if (month < 1 || month > 12) {
    return { iso: null, error: 'Month must be between 01 and 12.' };
  }
  if (day < 1 || day > 31) {
    return { iso: null, error: 'Day must be between 01 and 31.' };
  }

  const maxDay = daysInMonth(month, year);
  if (day > maxDay) {
    return { iso: null, error: `That date is not valid. Use DD / MM / YYYY.` };
  }

  if (year < 1900) {
    return { iso: null, error: 'Year must be 1900 or later.' };
  }

  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date > today) {
    return { iso: null, error: 'Date of birth cannot be in the future.' };
  }

  const oldest = new Date(today);
  oldest.setFullYear(today.getFullYear() - 120);
  if (date < oldest) {
    return { iso: null, error: 'Enter a valid date of birth.' };
  }

  return {
    iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    error: '',
  };
}

function OtpDigitBoxes({ value, onChange, onComplete, disabled, verifying }) {
  const inputsRef = useRef([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');

  const focusIndex = (index) => {
    inputsRef.current[index]?.focus();
  };

  const applyValue = (nextDigits, focusAt) => {
    const joined = nextDigits.join('').slice(0, OTP_LENGTH);
    onChange(joined);
    if (focusAt !== undefined) {
      focusIndex(Math.min(focusAt, OTP_LENGTH - 1));
    }
    if (joined.length === OTP_LENGTH) {
      onComplete(joined);
    }
  };

  const handleChange = (index, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    applyValue(next, digit && index < OTP_LENGTH - 1 ? index + 1 : index);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = '';
        applyValue(next, index);
      } else if (index > 0) {
        next[index - 1] = '';
        applyValue(next, index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      focusIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || '');
    applyValue(next, pasted.length >= OTP_LENGTH ? OTP_LENGTH - 1 : pasted.length);
  };

  return (
    <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full max-w-[280px] sm:max-w-none">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled || verifying}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          aria-label={`OTP digit ${index + 1}`}
          className={[
            'w-9 h-9 sm:w-10 sm:h-10 flex-1 sm:flex-none max-w-12 shrink-0 text-center font-mono font-semibold text-base rounded-xl transition-all',
            'bg-white dark:bg-[#071812] text-slate-900 dark:text-white',
            'border border-[#0F382C]/20 dark:border-[#1E4E3D]',
            'focus:outline-none focus:ring-2 focus:ring-[#65A30D]/50 focus:border-[#65A30D]',
            'disabled:opacity-60',
            digit ? 'border-[#65A30D]/60' : '',
          ].join(' ')}
        />
      ))}
      {verifying && (
        <Loader2 size={15} className="animate-spin text-[#65A30D] shrink-0 ml-0.5" aria-label="Verifying OTP" />
      )}
    </div>
  );
}

const PHONE_RULES = {
  '+91': {
    length: 10,
    pattern: /^[6-9]\d{9}$/,
    hint: 'Enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).',
    placeholder: '9876543210',
  },
  '+1': {
    length: 10,
    pattern: /^\d{10}$/,
    hint: 'Enter a valid 10-digit mobile number.',
    placeholder: '2025550123',
  },
  '+44': {
    length: 11,
    pattern: /^\d{10,11}$/,
    hint: 'Enter a valid UK mobile number (10–11 digits).',
    placeholder: '7123456789',
  },
  '+61': {
    length: 9,
    pattern: /^[4-5]\d{8}$/,
    hint: 'Enter a valid 9-digit Australian mobile number.',
    placeholder: '412345678',
  },
};

function getPhoneRule(phoneCode) {
  return PHONE_RULES[phoneCode] || {
    length: 15,
    pattern: /^\d{6,15}$/,
    hint: 'Enter a valid mobile number.',
    placeholder: 'Mobile number',
  };
}

function sanitizePhoneDigits(value, maxLength) {
  return value.replace(/\D/g, '').slice(0, maxLength);
}

function validatePhoneNumber(phoneCode, phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, '');
  const rule = getPhoneRule(phoneCode);
  if (digits.length !== rule.length) {
    return rule.hint;
  }
  if (!rule.pattern.test(digits)) {
    return rule.hint;
  }
  return '';
}

export default function RegisterForm({ onNavigate, onSuccessRedirect }) {
  const { login } = useAuth();

  const {
    countryId,
    regionId,
    cityId,
    handleCountryChange: onCountryChange,
    handleRegionChange: onRegionChange,
    handleCityChange: onCityChange,
  } = useLocationPickerState();

  const { countries } = useCountries();

  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    name: '',
    businessName: '',
    dateOfBirth: '',
    email: '',
    otp: '',
    phoneCode: '+91',
    phoneNumber: '',
    acceptedTerms: false,
  });

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccessMsg, setOtpSuccessMsg] = useState('');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);
  const otpBoxRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [phoneError, setPhoneError] = useState('');
  const [dobError, setDobError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!countryId) return;
    const selected = countries.find((c) => String(c.id) === String(countryId));
    if (selected?.phone_code) {
      const rule = getPhoneRule(selected.phone_code);
      setFormData((prev) => ({
        ...prev,
        phoneCode: selected.phone_code,
        phoneNumber: sanitizePhoneDigits(prev.phoneNumber, rule.length),
      }));
      setPhoneError('');
    }
  }, [countryId, countries]);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [countdown]);

  useEffect(() => {
    if (otpSent && !otpVerified) {
      otpBoxRef.current?.querySelector('input')?.focus();
    }
  }, [otpSent, otpVerified]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    setCategoryError('');
    try {
      const data = await locationApi.getCategories();
      setCategories(data.data || []);
      if (!(data.data || []).length) {
        setCategoryError('No categories available. Please contact support.');
      }
    } catch (e) {
      console.error('Failed fetching categories:', e);
      setCategoryError('Unable to load categories. Please refresh the page.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleCountryChange = (value) => {
    onCountryChange(value);
    setLocationError('');
  };

  const handleRegionChange = (value) => {
    onRegionChange(value);
  };

  const handleCityChange = (value) => {
    onCityChange(value);
  };

  const handleSendOtp = async () => {
    const emailVal = formData.email.trim().toLowerCase();
    if (!emailVal) {
      setOtpError('Please enter a valid email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailVal)) {
      setOtpError('Please enter a valid email address.');
      return;
    }

    setOtpError('');
    setSendingOtp(true);
    try {
      const res = await apiFetch('/auth/send-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.success)) {
        setOtpSent(true);
        setOtpSuccessMsg(data.message || '4-digit OTP code sent successfully to your email.');
        setCountdown(60);
      } else {
        setOtpError(data?.message || 'Unable to send OTP. Please try again.');
      }
    } catch (err) {
      console.error('Send OTP error:', err);
      setOtpError('Error connecting to backend API. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (otpOverride) => {
    const otpVal = (otpOverride ?? formData.otp).trim();
    if (otpVal.length !== OTP_LENGTH) {
      setOtpError('Please enter the full 4-digit OTP code.');
      return;
    }

    if (otpVerifying) return;

    setOtpError('');
    setOtpVerifying(true);
    try {
      const res = await apiFetch('/auth/verify-registration-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          otp: otpVal,
        }),
      });
      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.success)) {
        setOtpVerified(true);
        setOtpSuccessMsg('');
        setOtpError('');
      } else {
        setFormData((prev) => ({ ...prev, otp: '' }));
        setOtpError(data?.message || 'Invalid or expired OTP. Please try again.');
        otpBoxRef.current?.querySelector('input')?.focus();
      }
    } catch (err) {
      console.error('Verify OTP error:', err);
      setFormData((prev) => ({ ...prev, otp: '' }));
      setOtpError('Invalid OTP code. Please try again.');
      otpBoxRef.current?.querySelector('input')?.focus();
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');
    setFieldErrors({});

    if (!otpVerified) {
      setFormError('Email verification is required. Please send and verify your OTP first.');
      return;
    }

    if (!countryId || !regionId || !cityId) {
      setFormError('Please select your complete location (Country, State, City).');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Please select a healthcare category.');
      return;
    }

    const fullName = formData.name.trim();
    if (!fullName) {
      setFormError('Please enter your full name.');
      return;
    }

    const businessName = formData.businessName.trim();
    const dobResult = parseDobToIso(formData.dateOfBirth);
    if (dobResult.error) {
      setDobError(dobResult.error);
      setFormError(dobResult.error);
      return;
    }

    if (!formData.phoneNumber.trim()) {
      setFormError('Please enter your mobile number.');
      return;
    }

    const mobileValidationError = validatePhoneNumber(formData.phoneCode, formData.phoneNumber);
    if (mobileValidationError) {
      setPhoneError(mobileValidationError);
      setFormError(mobileValidationError);
      return;
    }

    if (!formData.acceptedTerms) {
      setFormError('You must agree to the Terms of Service & Privacy Policy to register.');
      return;
    }

    setSubmitting(true);
    const fullMobile = `${formData.phoneCode}${formData.phoneNumber.replace(/\D/g, '')}`;

    let registrationSucceeded = false;

    try {
      const selectedCategory = categories.find((cat) => String(cat.id) === String(formData.categoryId));

      const payload = {
        country_id: parseInt(countryId, 10),
        region_id: parseInt(regionId, 10),
        city_id: parseInt(cityId, 10),
        category_id: formData.categoryId,
        title: formData.title || null,
        name: fullName,
        business_name: businessName || null,
        date_of_birth: dobResult.iso,
        email: formData.email.trim().toLowerCase(),
        mobile: fullMobile,
      };

      const res = await apiFetch('/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && (data.status === 'success' || data.success)) {
        registrationSucceeded = true;
        if (data.user && data.token) {
          login(data.user, data.token);
        }

        const registrationResult = {
          user: data.user,
          community: data.community,
          community_groups: data.community_groups || [],
          country_name: data.user?.country?.name || '',
          region_name: data.user?.region?.name || data.user?.state?.name || '',
          state_name: data.user?.region?.name || data.user?.state?.name || '',
          city_name: data.user?.city?.name || '',
          category_name: selectedCategory?.name || data.user?.category?.name || '',
        };

        sessionStorage.setItem('healernet_registration', JSON.stringify(registrationResult));
        setSuccessMsg('Registration successful! Your profile is active. Redirecting…');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        setTimeout(() => {
          if (onSuccessRedirect) {
            onSuccessRedirect(registrationResult);
          } else if (onNavigate) {
            onNavigate('register-thanks', registrationResult);
          }
        }, 900);
      } else {
        if (data?.errors) {
          setFieldErrors(data.errors);
        }
        setFormError(data?.message || 'Registration failed. Please review your inputs.');
      }
    } catch (err) {
      console.error('Registration submit error:', err);
      setFormError('Failed connecting to server. Please try again.');
    } finally {
      if (!registrationSucceeded) {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" />
          {successMsg}
        </div>
      )}
      {formError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className={LABEL}>
            Location <span className="text-rose-500">*</span>
          </label>

          <LocationPicker
            showLabels={false}
            countryId={countryId}
            regionId={regionId}
            cityId={cityId}
            onCountryChange={handleCountryChange}
            onRegionChange={handleRegionChange}
            onCityChange={handleCityChange}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            selectClassName={SELECT}
          />

          {(locationError || categoryError) && (
            <p className={FIELD_ERROR}>{locationError || categoryError}</p>
          )}
        </div>

        <div>
          <label className={LABEL}>
            Category <span className="text-rose-500">*</span>
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            disabled={loadingCategories}
            className={SELECT}
            required
          >
            <option value="">{loadingCategories ? 'Loading categories…' : 'Select Category'}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          {fieldErrors.category_id && <p className={FIELD_ERROR}>{fieldErrors.category_id[0]}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[7.5rem_minmax(0,1fr)] gap-3">
          <div>
            <label className={LABEL} htmlFor="register-title">Title</label>
            <select
              id="register-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={SELECT}
            >
              <option value="">Select</option>
              {TITLE_OPTIONS.map((title) => (
                <option key={title} value={title}>{title}</option>
              ))}
            </select>
            {fieldErrors.title && <p className={FIELD_ERROR}>{fieldErrors.title[0]}</p>}
          </div>
          <div>
            <label className={LABEL} htmlFor="register-full-name">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="register-full-name"
              type="text"
              placeholder="Sarah Jenkins"
              value={formData.name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={INPUT}
              required
              autoComplete="name"
            />
            {(fieldErrors.name || fieldErrors.full_name) && (
              <p className={FIELD_ERROR}>{(fieldErrors.name || fieldErrors.full_name)[0]}</p>
            )}
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="register-date-of-birth">Date of Birth</label>
          <input
            id="register-date-of-birth"
            type="text"
            inputMode="numeric"
            placeholder="DD / MM / YYYY"
            value={formData.dateOfBirth}
            maxLength={14}
            onChange={(e) => {
              const next = formatDobDisplay(e.target.value);
              setFormData({ ...formData, dateOfBirth: next });
              const digits = next.replace(/\D/g, '');
              if (digits.length === 8) {
                setDobError(parseDobToIso(next).error);
              } else {
                setDobError('');
              }
            }}
            onBlur={() => {
              const digits = String(formData.dateOfBirth || '').replace(/\D/g, '');
              if (!digits) {
                setDobError('');
                return;
              }
              setDobError(parseDobToIso(formData.dateOfBirth).error);
            }}
            className={`${INPUT} ${dobError ? 'border-rose-500 focus:ring-rose-500/40 focus:border-rose-500' : ''}`}
            autoComplete="bday"
            aria-invalid={Boolean(dobError)}
          />
          {dobError && <p className={FIELD_ERROR}>{dobError}</p>}
          {fieldErrors.date_of_birth && <p className={FIELD_ERROR}>{fieldErrors.date_of_birth[0]}</p>}
        </div>

        <div>
          <label className={LABEL}>
            Email<span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              placeholder="sarah@healernet.org"
              value={formData.email}
              disabled={otpVerified}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setOtpError('');
              }}
              className={`${INPUT} ${otpVerified ? 'border-emerald-500 pr-28' : 'pr-[6.75rem] sm:pr-[7.75rem]'}`}
              required
            />
            {otpVerified ? (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-emerald-500/20 text-[#A3E635] text-[10px] font-bold flex items-center gap-1">
                <CheckCircle2 size={12} /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || countdown > 0 || !formData.email}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-2.5 sm:px-3 rounded-lg bg-[#145240] hover:bg-[#1a6a52] text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {sendingOtp ? <Loader2 size={13} className="animate-spin" /> : countdown > 0 ? `${countdown}s` : (<><Send size={12} className="hidden sm:block" /> Send OTP</>)}
              </button>
            )}
          </div>
          {otpSuccessMsg && !otpVerified && (
            <p className="text-xs text-[#A3E635] font-medium mt-2">{otpSuccessMsg}</p>
          )}
          {otpSent && !otpVerified && (
            <div ref={otpBoxRef} className="mt-2">
              <OtpDigitBoxes
                value={formData.otp}
                onChange={(val) => {
                  setFormData({ ...formData, otp: val });
                  setOtpError('');
                }}
                onComplete={handleVerifyOtp}
                disabled={otpVerifying}
                verifying={otpVerifying}
              />
            </div>
          )}

          {otpError && <p className={FIELD_ERROR}>{otpError}</p>}
          {fieldErrors.email && <p className={FIELD_ERROR}>{fieldErrors.email[0]}</p>}
        </div>

        <div>
          <label className={LABEL} htmlFor="register-business-name">Business Name</label>
          <input
            id="register-business-name"
            type="text"
            placeholder="Shanti Wellness Center"
            value={formData.businessName}
            maxLength={MAX_BUSINESS_NAME_LENGTH}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            className={INPUT}
            autoComplete="organization"
          />
          {fieldErrors.business_name && <p className={FIELD_ERROR}>{fieldErrors.business_name[0]}</p>}
        </div>

        <div>
          <label className={LABEL}>
            Mobile Number <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={formData.phoneCode}
              onChange={(e) => {
                const phoneCode = e.target.value;
                const rule = getPhoneRule(phoneCode);
                setFormData((prev) => ({
                  ...prev,
                  phoneCode,
                  phoneNumber: sanitizePhoneDigits(prev.phoneNumber, rule.length),
                }));
                setPhoneError('');
              }}
              className={`${SELECT} sm:w-40 shrink-0`}
            >
              <option value="+91">🇮🇳 +91 (IN)</option>
              <option value="+1">🇺🇸 +1 (US)</option>
              <option value="+44">🇬🇧 +44 (UK)</option>
              <option value="+61">🇦🇺 +61 (AU)</option>
            </select>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={getPhoneRule(formData.phoneCode).placeholder}
              value={formData.phoneNumber}
              maxLength={getPhoneRule(formData.phoneCode).length}
              onChange={(e) => {
                const rule = getPhoneRule(formData.phoneCode);
                setFormData((prev) => ({
                  ...prev,
                  phoneNumber: sanitizePhoneDigits(e.target.value, rule.length),
                }));
                setPhoneError('');
              }}
              className={`${INPUT} flex-1 min-w-0`}
              required
            />
          </div>
          {formData.phoneCode === '+91' && !phoneError && (
            <p className="text-[11px] text-slate-500 dark:text-emerald-200/60 mt-1.5">
              10 digits only · must start with 6, 7, 8, or 9
            </p>
          )}
          {phoneError && <p className={FIELD_ERROR}>{phoneError}</p>}
          {fieldErrors.mobile && <p className={FIELD_ERROR}>{fieldErrors.mobile[0]}</p>}
        </div>

        <div className="flex items-start gap-2">
          <input
            id="acceptedTerms"
            name="acceptedTerms"
            type="checkbox"
            checked={formData.acceptedTerms}
            onChange={(e) => setFormData({ ...formData, acceptedTerms: e.target.checked })}
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#0F382C] focus:ring-[#65A30D] cursor-pointer"
            required
          />
          <label htmlFor="acceptedTerms" className="text-xs text-slate-600 dark:text-emerald-200/80 cursor-pointer leading-relaxed">
            I agree to the{' '}
            <a href="/pages/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-[#0F382C] dark:text-[#A3E635] underline font-bold hover:text-[#65A30D]">Terms of Service</a>
            {' '}&{' '}
            <a href="/pages/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-[#0F382C] dark:text-[#A3E635] underline font-bold hover:text-[#65A30D]">Privacy Policy</a>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting || !otpVerified || !formData.acceptedTerms}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#0F382C] via-[#145240] to-[#65A30D] hover:from-[#09261E] hover:to-[#558B2F] text-white font-bold text-sm shadow-lg shadow-[#0F382C]/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (<><Loader2 size={16} className="animate-spin" /> Submitting…</>) : 'Submit'}
        </button>
      </form>
    </div>
  );
}
