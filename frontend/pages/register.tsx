/**
 * Multi-step Registration Page
 * Beautiful, modern registration flow for Shariah-compliant escrow platform
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/auth-context';
import { GuestRoute } from '@/components/auth/ProtectedRoute';
import type { UserRole, RegistrationData, RoleInfo } from '@/types';

// Role definitions with icons and features
const ROLES: RoleInfo[] = [
  {
    id: 'BUYER',
    title: 'Buyer',
    description: 'Purchase products with Shariah-compliant financing options',
    icon: '🛒',
    features: [
      'Browse halal-certified products',
      'Request Islamic financing (Murabaha)',
      'Secure escrow protection',
      'Track deliveries in real-time',
    ],
  },
  {
    id: 'SELLER',
    title: 'Seller',
    description: 'List and sell your products through our trusted platform',
    icon: '🏪',
    features: [
      'List halal products & services',
      'Receive verified payments',
      'AI-powered fraud protection',
      'Access to Islamic banks network',
    ],
  },
  {
    id: 'BANK',
    title: 'Islamic Bank',
    description: 'Provide Shariah-compliant financing and escrow services',
    icon: '🏦',
    features: [
      'Offer Murabaha financing',
      'Manage escrow accounts',
      'AI-assisted risk evaluation',
      'Shariah compliance dashboard',
    ],
  },
  {
    id: 'DELIVERY',
    title: 'Delivery Partner',
    description: 'Handle logistics and delivery for marketplace transactions',
    icon: '🚚',
    features: [
      'Receive delivery assignments',
      'Real-time tracking updates',
      'Proof of delivery system',
      'Integration with escrow release',
    ],
  },
];

// Initial form state
const initialFormState: RegistrationData = {
  role: 'BUYER',
  email: '',
  password: '',
  confirm_password: '',
  first_name: '',
  last_name: '',
  phone: '',
  company_name: '',
  business_license: '',
  address: '',
  city: '',
  country: '',
  shariah_acknowledged: false,
  terms_accepted: false,
};

type Step = 1 | 2 | 3 | 4 | 5;

function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<RegistrationData>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Update form data
  const updateField = useCallback(<K extends keyof RegistrationData>(
    field: K,
    value: RegistrationData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate current step
  const validateStep = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof RegistrationData, string>> = {};

    switch (step) {
      case 1:
        // Role is always selected by default
        break;
      case 2:
        if (!formData.email) {
          newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email';
        }
        if (!formData.password) {
          newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
          newErrors.password = 'Password must be at least 8 characters';
        }
        if (formData.password !== formData.confirm_password) {
          newErrors.confirm_password = 'Passwords do not match';
        }
        break;
      case 3:
        if (!formData.first_name) newErrors.first_name = 'First name is required';
        if (!formData.last_name) newErrors.last_name = 'Last name is required';
        if (!formData.phone) newErrors.phone = 'Phone number is required';
        if ((formData.role === 'SELLER' || formData.role === 'BANK') && !formData.company_name) {
          newErrors.company_name = 'Company name is required for this role';
        }
        break;
      case 4:
        if (!formData.shariah_acknowledged) {
          newErrors.shariah_acknowledged = 'You must acknowledge the Shariah compliance guidelines';
        }
        if (!formData.terms_accepted) {
          newErrors.terms_accepted = 'You must accept the terms and conditions';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [step, formData]);

  // Navigate between steps
  const goToNextStep = useCallback(() => {
    if (validateStep() && step < 5) {
      setStep((step + 1) as Step);
    }
  }, [step, validateStep]);

  const goToPrevStep = useCallback(() => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  }, [step]);

  // Submit registration
  const handleSubmit = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Call the auth context register method
      const result = await registerUser({
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        company_name: formData.company_name,
        business_license: formData.business_license,
        address: formData.address,
        city: formData.city,
        country: formData.country,
        shariah_acknowledged: formData.shariah_acknowledged,
        terms_accepted: formData.terms_accepted,
      });

      if (result.success) {
        // Redirect to success page
        router.push('/register/success');
      } else {
        setSubmitError(result.message);
      }
    } catch (error: any) {
      setSubmitError(error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step indicators
  const steps = [
    { num: 1, label: 'Role' },
    { num: 2, label: 'Account' },
    { num: 3, label: 'Profile' },
    { num: 4, label: 'Compliance' },
    { num: 5, label: 'Review' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Subtle floating shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
              <span className="text-emerald-600">Sharia</span> Escrow
            </h1>
          </Link>
          <p className="text-gray-600 mt-2 text-lg">Create your trusted account</p>
        </div>

        {/* Progress Steps */}
        <div className="w-full max-w-2xl mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
            
            {steps.map(({ num, label }) => (
              <div key={num} className="relative flex flex-col items-center z-10">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${
                    num < step 
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                      : num === step
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-100'
                        : 'bg-white text-gray-400 border-2 border-gray-200'
                  }`}
                >
                  {num < step ? '✓' : num}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  num <= step ? 'text-emerald-700' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-xl shadow-gray-200/50">
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Choose Your Role</h2>
                  <p className="text-gray-500 mt-2">Select how you'll use the platform</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ROLES.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => updateField('role', role.id)}
                      className={`p-5 rounded-xl text-left transition-all duration-300 border-2 ${
                        formData.role === role.id
                          ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-100'
                          : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="text-3xl">{role.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">{role.title}</h3>
                          <p className="text-gray-500 text-sm mt-1">{role.description}</p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-2">
                        {role.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600">
                            <span className="text-emerald-500 mr-2">✓</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Account Credentials */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Account Details</h2>
                  <p className="text-gray-500 mt-2">Set up your login credentials</p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.email ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="you@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => updateField('password', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.password ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-500">{errors.password}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">Minimum 8 characters</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={formData.confirm_password}
                      onChange={(e) => updateField('confirm_password', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.confirm_password ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="••••••••"
                    />
                    {errors.confirm_password && (
                      <p className="mt-1 text-sm text-red-500">{errors.confirm_password}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Personal/Business Info */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {formData.role === 'BUYER' ? 'Personal' : 'Business'} Information
                  </h2>
                  <p className="text-gray-500 mt-2">Tell us more about yourself</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => updateField('first_name', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.first_name ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Ahmed"
                    />
                    {errors.first_name && (
                      <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => updateField('last_name', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.last_name ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="Hassan"
                    />
                    {errors.last_name && (
                      <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                        errors.phone ? 'border-red-400' : 'border-gray-300'
                      }`}
                      placeholder="+251 911 234 567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
                    )}
                  </div>

                  {(formData.role === 'SELLER' || formData.role === 'BANK' || formData.role === 'DELIVERY') && (
                    <>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name
                        </label>
                        <input
                          type="text"
                          value={formData.company_name}
                          onChange={(e) => updateField('company_name', e.target.value)}
                          className={`w-full px-4 py-3 bg-white border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all ${
                            errors.company_name ? 'border-red-400' : 'border-gray-300'
                          }`}
                          placeholder="Your company name"
                        />
                        {errors.company_name && (
                          <p className="mt-1 text-sm text-red-500">{errors.company_name}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business License Number
                          <span className="text-gray-400 ml-1">(Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.business_license}
                          onChange={(e) => updateField('business_license', e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                          placeholder="License number"
                        />
                      </div>
                    </>
                  )}

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address
                      <span className="text-gray-400 ml-1">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="Street address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                      placeholder="Addis Ababa"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      value={formData.country}
                      onChange={(e) => updateField('country', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
                    >
                      <option value="">Select country</option>
                      <option value="ET">Ethiopia</option>
                      <option value="AE">United Arab Emirates</option>
                      <option value="SA">Saudi Arabia</option>
                      <option value="MY">Malaysia</option>
                      <option value="ID">Indonesia</option>
                      <option value="PK">Pakistan</option>
                      <option value="BD">Bangladesh</option>
                      <option value="EG">Egypt</option>
                      <option value="TR">Turkey</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Shariah Compliance Acknowledgment */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Shariah Compliance</h2>
                  <p className="text-gray-500 mt-2">Acknowledge our Islamic finance principles</p>
                </div>

                {/* Shariah Principles Card */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">☪</span>
                    <h3 className="text-lg font-semibold text-emerald-800">Our Shariah Principles</h3>
                  </div>
                  <ul className="space-y-3 text-gray-700 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-0.5">●</span>
                      <span><strong className="text-gray-900">No Riba (Interest):</strong> All transactions are structured to avoid interest-based lending, using Murabaha (cost-plus financing) principles.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-0.5">●</span>
                      <span><strong className="text-gray-900">Halal Products Only:</strong> Only Shariah-compliant products and services are permitted on our platform. AI-powered screening ensures compliance.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-0.5">●</span>
                      <span><strong className="text-gray-900">No Gharar (Uncertainty):</strong> All transaction terms are transparent and clearly defined before agreement.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-0.5">●</span>
                      <span><strong className="text-gray-900">Secure Escrow:</strong> Funds are held in trust until delivery confirmation, protecting all parties.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-0.5">●</span>
                      <span><strong className="text-gray-900">Ethical Business:</strong> We promote fair dealing, honesty, and mutual benefit in all transactions.</span>
                    </li>
                  </ul>
                </div>

                {/* Acknowledgments */}
                <div className="space-y-4">
                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.shariah_acknowledged 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : errors.shariah_acknowledged 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.shariah_acknowledged}
                      onChange={(e) => updateField('shariah_acknowledged', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <div>
                      <p className="text-gray-900 font-medium">I acknowledge the Shariah compliance guidelines</p>
                      <p className="text-gray-500 text-sm mt-1">
                        I understand and agree to conduct all transactions in accordance with Islamic finance principles.
                      </p>
                    </div>
                  </label>
                  {errors.shariah_acknowledged && (
                    <p className="text-sm text-red-500 ml-2">{errors.shariah_acknowledged}</p>
                  )}

                  <label className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    formData.terms_accepted 
                      ? 'border-emerald-500 bg-emerald-50' 
                      : errors.terms_accepted 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={formData.terms_accepted}
                      onChange={(e) => updateField('terms_accepted', e.target.checked)}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
                    />
                    <div>
                      <p className="text-gray-900 font-medium">I accept the Terms & Conditions</p>
                      <p className="text-gray-500 text-sm mt-1">
                        I have read and agree to the{' '}
                        <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>.
                      </p>
                    </div>
                  </label>
                  {errors.terms_accepted && (
                    <p className="text-sm text-red-500 ml-2">{errors.terms_accepted}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review & Submit */}
            {step === 5 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Review Your Information</h2>
                  <p className="text-gray-500 mt-2">Please verify all details before submitting</p>
                </div>

                {/* Summary Cards */}
                <div className="space-y-4">
                  {/* Role */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-500">Account Type</h4>
                      <button 
                        onClick={() => setStep(1)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-2xl">{ROLES.find(r => r.id === formData.role)?.icon}</span>
                      <span className="text-gray-900 font-medium">{ROLES.find(r => r.id === formData.role)?.title}</span>
                    </div>
                  </div>

                  {/* Account Details */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-500">Account Details</h4>
                      <button 
                        onClick={() => setStep(2)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-gray-900 mt-2">{formData.email}</p>
                    <p className="text-gray-400 text-sm">Password: ••••••••</p>
                  </div>

                  {/* Personal/Business Info */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-500">Personal Information</h4>
                      <button 
                        onClick={() => setStep(3)}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-gray-900">{formData.first_name} {formData.last_name}</p>
                      <p className="text-gray-500 text-sm">{formData.phone}</p>
                      {formData.company_name && (
                        <p className="text-gray-500 text-sm">{formData.company_name}</p>
                      )}
                      {formData.city && formData.country && (
                        <p className="text-gray-500 text-sm">{formData.city}, {formData.country}</p>
                      )}
                    </div>
                  </div>

                  {/* Compliance Status */}
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span className="text-emerald-800 font-medium">Shariah Compliance Acknowledged</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-emerald-600">✓</span>
                      <span className="text-emerald-800 font-medium">Terms & Conditions Accepted</span>
                    </div>
                  </div>
                </div>

                {submitError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-600 text-sm">{submitError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              {step > 1 ? (
                <button
                  onClick={goToPrevStep}
                  className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  ← Back
                </button>
              ) : (
                <Link href="/login" className="px-6 py-2.5 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Sign In Instead
                </Link>
              )}

              {step < 5 ? (
                <Button
                  onClick={goToNextStep}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-2.5 rounded-xl font-medium shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
                >
                  Continue →
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  isLoading={isSubmitting}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-8 py-2.5 rounded-xl font-medium shadow-md shadow-emerald-200 transition-all hover:shadow-lg"
                >
                  Create Account
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

// Export wrapped with GuestRoute to redirect authenticated users
export default function Register() {
  return (
    <GuestRoute>
      <RegisterPage />
    </GuestRoute>
  );
}
