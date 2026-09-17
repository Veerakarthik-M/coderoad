import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import StepIndicator from '../components/StepIndicator';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram','Kollam','Pathanamthitta','Alappuzha','Kottayam',
  'Idukki','Ernakulam','Thrissur','Palakkad','Malappuram',
  'Kozhikode','Wayanad','Kannur','Kasaragod',
];

const LOCATIONS = [
  'Thiruvananthapuram','Attingal','Nedumangad','Neyyattinkara','Kollam',
  'Kottarakkara','Punalur','Karunagappally','Pathanamthitta','Adoor',
  'Thiruvalla','Chengannur','Alappuzha','Kayamkulam','Mavelikara',
  'Kottayam','Changanassery','Pala','Ettumanoor','Idukki','Thodupuzha',
  'Munnar','Kumily','Ernakulam','Aluva','Angamaly','Muvattupuzha',
  'Perumbavoor','Kothamangalam','Thrissur','Chalakudy','Irinjalakuda',
  'Guruvayur','Kunnamkulam','Palakkad','Ottapalam','Shornur','Mannarkkad',
  'Malappuram','Manjeri','Tirur','Perinthalmanna','Ponnani','Kozhikode',
  'Vadakara','Thamarassery','Kalpetta','Sulthan Bathery','Mananthavady',
  'Kannur','Thalassery','Payyanur','Iritty','Kasaragod','Kanhangad',
  'Ettimadai','Coimbatore','Amritapuri',
].sort();

// Step 0: Student Type (School vs College)
// Step 1: Personal + Email OTP
// Step 2: College details
// Step 3: Travel / Route
// Step 4: ID Card Upload
// Step 5: Review & Submit
const STEPS = ['Student Type', 'Personal', 'Institution', 'Travel', 'Documents', 'Review'];

const INITIAL_FORM = {
  // Personal
  name: '', dateOfBirth: '', gender: '', guardianName: '',
  phone: '', aadhaarNumber: '', email: '', username: '', password: '', confirmPassword: '',
  address: '', place: '', postalName: '', pincode: '', district: '',
  // College
  studentType: 'college', // 'college' | 'school'
  institutionId: '', rollNo: '', course: '', department: '', yearOfStudy: '', semester: '', academicYear: '2026-27',
  // Travel
  routeFrom: '', routeTo: '', distanceKm: '', concessionCategory: 'General',
};

function FieldError({ msg }) {
  return msg ? <div className="form-error" role="alert">{msg}</div> : null;
}

// ── File Upload Component ────────────────────────────────────
function FileUpload({ label, id, accept, hint, onFile, file, required = false }) {
  const inputRef = useRef();

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label} {required && <span className="required">*</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        id={`${id}-dropzone`}
        style={{
          border: `2px dashed ${file ? 'var(--border-success)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: file ? 'var(--success-light)' : 'var(--bg-input)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <div>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.375rem' }}>✅</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.875rem' }}>{file.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {(file.size / 1024).toFixed(0)} KB · Click to change
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2rem', marginBottom: '0.375rem', opacity: 0.5 }}>📎</div>
            <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Click or drag & drop to upload
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{hint}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── OTP Input ────────────────────────────────────────────────
function OTPSection({ email, emailVerified, onVerified }) {
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const sendOTP = async () => {
    if (!email) { setError('Please enter your email address first'); return; }
    setError('');
    setDemoOtp('');
    setLoading(true);
    try {
      const res = await api.post('/auth/send-otp', { email });
      setOtpSent(true);
      setResendTimer(60);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) { setError('Enter the 6-digit code'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { email, otp });
      onVerified();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (emailVerified) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.5rem 0.75rem', background: 'var(--success-light)',
        border: '1px solid rgba(14,122,79,0.3)', borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem', fontWeight: 600, color: '#34d399',
      }}>
        ✅ Email verified — {email}
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginTop: '0.25rem' }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
        Email Verification Required
      </div>

      {error && <div className="alert alert--error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

      {!otpSent ? (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={sendOTP}
            disabled={loading || !email}
            id="send-otp-btn"
          >
            {loading ? <span className="spinner" /> : 'Send Verification Code'}
          </button>
        </div>
      ) : (
        <div>
          {demoOtp ? (
            <div style={{ background: '#fefce8', border: '2px solid #eab308', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#854d0e', marginBottom: '0.25rem' }}>
                ⚠️ Email delivery unavailable — use this code:
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 800, letterSpacing: '0.3em', color: '#78350f' }}>
                {demoOtp}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#92400e', marginTop: '0.25rem' }}>
                Copy this code and paste it below. Valid for 10 minutes.
              </div>
            </div>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.625rem', margin: '0 0 0.625rem' }}>
              A 6-digit code was sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Check your inbox (and spam folder).
            </p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-input"
              style={{ maxWidth: '140px', fontFamily: 'monospace', fontSize: '1.125rem', letterSpacing: '0.3em', textAlign: 'center' }}
              placeholder="000000"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              id="otp-input"
              autoComplete="one-time-code"
            />
            <button
              type="button"
              className="btn btn--success btn--sm"
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              id="verify-otp-btn"
            >
              {loading ? <span className="spinner" /> : 'Verify'}
            </button>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={sendOTP}
            disabled={loading || resendTimer > 0}
            style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}
            id="resend-otp-btn"
          >
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function StudentRegister({ onAuth }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [emailVerified, setEmailVerified] = useState(false);
  const [idCardFile, setIdCardFile] = useState(null);
  const [uploadedDocId, setUploadedDocId] = useState(null);

  useEffect(() => {
    api.get('/auth/institutions').then(setInstitutions).catch(console.error);
  }, []);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailVerified(false);
    if (fieldErrors[field]) {
      setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const calcAge = (dob) => {
    if (!dob) return '';
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const validateStep = () => {
    const errors = {};
    if (step === 0) {
      if (!form.studentType) errors.studentType = 'Please select a student type';
    } else if (step === 1) {
      if (!form.name.trim()) errors.name = 'Full name is required';
      if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      if (!form.gender) errors.gender = 'Please select a gender';
      if (!form.guardianName.trim()) errors.guardianName = 'Guardian name is required';
      if (!form.phone.match(/^[6-9]\d{9}$/)) errors.phone = 'Enter a valid 10-digit mobile number';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Enter a valid email address';
      else if (!emailVerified) errors.email = 'Please verify your email with the OTP before continuing';
      if (!form.username.trim()) errors.username = 'Username is required';
      if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
      if (!form.address.trim()) errors.address = 'Address is required';
      if (!form.place.trim()) errors.place = 'Place is required';
      if (!form.pincode.match(/^\d{6}$/)) errors.pincode = 'Enter a valid 6-digit PIN code';
      if (!form.district) errors.district = 'Please select a district';
    } else if (step === 2) {
      if (!form.institutionId) errors.institutionId = 'Please select your institution';
      if (!form.rollNo.trim()) errors.rollNo = 'Roll / register number is required';
      if (!form.course.trim()) errors.course = 'Course name is required';
    } else if (step === 3) {
      if (!form.routeFrom.trim()) errors.routeFrom = 'Boarding point is required';
      if (!form.routeTo.trim()) errors.routeTo = 'Destination is required';
    } else if (step === 4) {
      if (!idCardFile) errors.idCard = 'Please upload your institution ID card';
    }
    return errors;
  };

  const handleNext = () => {
    const errors = validateStep();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setStep(s => s + 1);
  };

  const uploadIdCard = async (studentUserId) => {
    if (!idCardFile) return null;
    const formData = new FormData();
    formData.append('document', idCardFile);
    formData.append('doc_type', 'id_card');
    // We don't have application_id yet, so just upload and link later
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/student/upload-id`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('anavandi_token')}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      return data;
    } catch (err) {
      console.warn('ID card upload error:', err.message);
      return null;
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');
    setLoading(true);
    try {
      // 1. Register user
      const regData = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: 'student',
      });
      onAuth(regData.user, regData.token);

      // 2. Submit application
      const appData = await api.post('/student/apply', {
        institutionId: parseInt(form.institutionId),
        dateOfBirth: form.dateOfBirth,
        age: calcAge(form.dateOfBirth),
        gender: form.gender,
        guardianName: form.guardianName,
        aadhaarNumber: form.aadhaarNumber,
        address: form.address,
        place: form.place,
        postalName: form.postalName,
        pincode: form.pincode,
        district: form.district,
        rollNo: form.rollNo,
        course: form.course,
        department: form.department,
        yearOfStudy: form.yearOfStudy,
        semester: form.semester,
        academicYear: form.academicYear,
        routeFrom: form.routeFrom,
        routeTo: form.routeTo,
        distanceKm: parseFloat(form.distanceKm) || 0,
        concessionCategory: form.concessionCategory,
      });

      // 3. Upload ID card if provided (after we have auth token)
      if (idCardFile) {
        // Add application_id to associate it
        const uploadFormData = new FormData();
        uploadFormData.append('document', idCardFile);
        uploadFormData.append('doc_type', 'id_card');
        if (appData.id) uploadFormData.append('application_id', appData.id);
        try {
          await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/student/upload-id`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${localStorage.getItem('anavandi_token')}` },
              body: uploadFormData,
            }
          );
        } catch (e) {
          console.warn('ID upload failed:', e);
        }
      }

      navigate('/student');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstitution = institutions.find(i => String(i.id) === String(form.institutionId));
  const isSchool = selectedInstitution?.education_level === 'School'
    || form.studentType === 'school';

  return (
    <div className="page">
      <div className="container container--narrow">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div className="page-header__eyebrow">ANAVANDI · KSRTC</div>
          <h1 className="page-header__title">Student Concession Pass Application</h1>
          <p className="page-header__subtitle">
            Complete all steps to apply for your digital bus concession pass
          </p>
        </div>

        <StepIndicator steps={STEPS} currentStep={step} />

        {submitError && (
          <div className="alert alert--error" style={{ marginBottom: '1rem' }} role="alert">
            {submitError}
          </div>
        )}

        <div className="card card--padded">

          {/* ── STEP 0: Institution Type ─────────────── */}
          {step === 0 && (
            <div>
              <div className="card__section-label">Student Type</div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-type">I am a student at a <span className="required">*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginTop: '0.375rem' }}>
                  {[
                    { id: 'type-college', value: 'college', label: '🎓 College / University', desc: 'B.Tech, Degree, Post Grad, Diploma…' },
                    { id: 'type-school', value: 'school', label: '🏫 School', desc: 'Class 8–12, SSC, CBSE, ICSE, Plus Two…' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      id={opt.id}
                      onClick={() => set('studentType', opt.value)}
                      style={{
                        padding: '0.875rem',
                        background: form.studentType === opt.value ? 'var(--primary-light)' : 'var(--bg-elevated)',
                        border: `2px solid ${form.studentType === opt.value ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-lg)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.2rem' }}>{opt.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                    </button>
                  ))}
                </div>
                <FieldError msg={fieldErrors.studentType} />
              </div>
            </div>
          )}

          {/* ── STEP 1: Personal Details + Email OTP ─────────── */}
          {step === 1 && (
            <div>
              <div className="card__section-label">Personal Information</div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-name">Full Name <span className="required">*</span></label>
                <input id="p-name" className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="As per government ID" autoComplete="name" />
                <FieldError msg={fieldErrors.name} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-dob">Date of Birth <span className="required">*</span></label>
                  <input id="p-dob" type="date" className="form-input" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} />
                  <FieldError msg={fieldErrors.dateOfBirth} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-age">Age (calculated)</label>
                  <input id="p-age" className="form-input" value={calcAge(form.dateOfBirth)} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-gender">Gender <span className="required">*</span></label>
                  <select id="p-gender" className="form-select" value={form.gender} onChange={e => set('gender', e.target.value)}>
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                  <FieldError msg={fieldErrors.gender} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-guardian">Guardian Name <span className="required">*</span></label>
                  <input id="p-guardian" className="form-input" value={form.guardianName} onChange={e => set('guardianName', e.target.value)} placeholder="Parent / guardian" />
                  <FieldError msg={fieldErrors.guardianName} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-phone">Mobile Number <span className="required">*</span></label>
                  <input id="p-phone" type="tel" className="form-input" value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile number" maxLength={10} />
                  <FieldError msg={fieldErrors.phone} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-aadhaar">Aadhaar Number</label>
                  <input id="p-aadhaar" className="form-input" value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
                </div>
              </div>

              {/* Email + OTP verification */}
              <div className="form-group">
                <label className="form-label" htmlFor="p-email">Email Address <span className="required">*</span></label>
                {form.studentType === 'college' && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    💡 Tip: Use your official college email (e.g. .edu.in) if you have one. It speeds up institution approval.
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    id="p-email"
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    style={{ flex: 1 }}
                    disabled={emailVerified}
                  />
                  {emailVerified && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setEmailVerified(false); set('email', form.email); }} style={{ whiteSpace: 'nowrap' }}>
                      Change
                    </button>
                  )}
                </div>
                <FieldError msg={fieldErrors.email} />
              </div>

              <OTPSection
                email={form.email}
                emailVerified={emailVerified}
                onVerified={() => setEmailVerified(true)}
              />

              <div className="form-row" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-username">Username <span className="required">*</span></label>
                  <input id="p-username" className="form-input" value={form.username} onChange={e => set('username', e.target.value.toLowerCase())} placeholder="Choose a username" autoComplete="username" />
                  <FieldError msg={fieldErrors.username} />
                </div>
                <div style={{ display: 'none' }}></div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-password">Password <span className="required">*</span></label>
                  <input id="p-password" type="password" className="form-input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min. 6 characters" autoComplete="new-password" />
                  <FieldError msg={fieldErrors.password} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-confirm-password">Confirm Password <span className="required">*</span></label>
                  <input id="p-confirm-password" type="password" className="form-input" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} placeholder="Repeat password" autoComplete="new-password" />
                  <FieldError msg={fieldErrors.confirmPassword} />
                </div>
              </div>

              <div className="card__section-label" style={{ marginTop: '1.5rem' }}>Residential Address</div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-address">Address <span className="required">*</span></label>
                <textarea id="p-address" className="form-textarea" value={form.address} onChange={e => set('address', e.target.value)} rows={2} placeholder="House / flat number, street, ward" />
                <FieldError msg={fieldErrors.address} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-place">Place / Town <span className="required">*</span></label>
                  <input id="p-place" className="form-input" value={form.place} onChange={e => set('place', e.target.value)} />
                  <FieldError msg={fieldErrors.place} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-postal">Post Office Name</label>
                  <input id="p-postal" className="form-input" value={form.postalName} onChange={e => set('postalName', e.target.value)} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-pincode">PIN Code <span className="required">*</span></label>
                  <input id="p-pincode" className="form-input" value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, ''))} maxLength={6} placeholder="6-digit PIN" />
                  <FieldError msg={fieldErrors.pincode} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-district">District <span className="required">*</span></label>
                  <select id="p-district" className="form-select" value={form.district} onChange={e => set('district', e.target.value)}>
                    <option value="">Select district</option>
                    {KERALA_DISTRICTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                  <FieldError msg={fieldErrors.district} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: College / School Details ─────────────── */}
          {step === 2 && (
            <div>
              <div className="card__section-label">Institution Details</div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-institution">Select Institution <span className="required">*</span></label>
                <select id="c-institution" className="form-select" value={form.institutionId} onChange={e => set('institutionId', e.target.value)}>
                  <option value="">Select your college / school</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} — {inst.place}, {inst.district}
                    </option>
                  ))}
                </select>
                <FieldError msg={fieldErrors.institutionId} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="c-rollno">
                    {isSchool ? 'Admission / Register Number' : 'Roll / Register Number'} <span className="required">*</span>
                  </label>
                  <input id="c-rollno" className="form-input" value={form.rollNo} onChange={e => set('rollNo', e.target.value.toUpperCase())} placeholder="e.g. 21CS045" />
                  <FieldError msg={fieldErrors.rollNo} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="c-academic-year">Academic Year</label>
                  <input id="c-academic-year" className="form-input" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} placeholder="e.g. 2026-27" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-course">
                  {isSchool ? 'Class / Standard' : 'Course / Programme'} <span className="required">*</span>
                </label>
                <input id="c-course" className="form-input" value={form.course} onChange={e => set('course', e.target.value)} placeholder={isSchool ? 'e.g. Class 11 — Science' : 'e.g. B.Tech Computer Science'} />
                <FieldError msg={fieldErrors.course} />
              </div>

              {!isSchool && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="c-department">Department</label>
                    <input id="c-department" className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Computer Science & Engineering" />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="c-year">Year of Study</label>
                      <select id="c-year" className="form-select" value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                        <option value="">Select year</option>
                        {['1st Year','2nd Year','3rd Year','4th Year','5th Year'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="c-semester">Semester</label>
                      <select id="c-semester" className="form-select" value={form.semester} onChange={e => set('semester', e.target.value)}>
                        <option value="">Select semester</option>
                        {['S1','S2','S3','S4','S5','S6','S7','S8'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {isSchool && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="c-class">Class</label>
                    <select id="c-class" className="form-select" value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                      <option value="">Select class</option>
                      {['Class 8','Class 9','Class 10','Class 11 (Science)','Class 11 (Commerce)','Class 11 (Humanities)','Class 12 (Science)','Class 12 (Commerce)','Class 12 (Humanities)'].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="c-section">Section</label>
                    <input id="c-section" className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. A, B, C" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Travel / Route Details ──────────────── */}
          {step === 3 && (
            <div>
              <div className="card__section-label">Travel / Concession Details</div>

              <datalist id="location-list">
                {LOCATIONS.map(l => <option key={l} value={l} />)}
              </datalist>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="t-from">Boarding Point <span className="required">*</span></label>
                  <input id="t-from" className="form-input" list="location-list" value={form.routeFrom} onChange={e => set('routeFrom', e.target.value)} placeholder="Where you board the bus" />
                  <FieldError msg={fieldErrors.routeFrom} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="t-to">Destination <span className="required">*</span></label>
                  <input id="t-to" className="form-input" list="location-list" value={form.routeTo} onChange={e => set('routeTo', e.target.value)} placeholder="Your college stop / destination" />
                  <FieldError msg={fieldErrors.routeTo} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="t-distance">Approximate Distance (km)</label>
                  <input id="t-distance" type="number" className="form-input" value={form.distanceKm} onChange={e => set('distanceKm', e.target.value)} placeholder="e.g. 18" min={1} max={500} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="t-category">Concession Category</label>
                  <select id="t-category" className="form-select" value={form.concessionCategory} onChange={e => set('concessionCategory', e.target.value)}>
                    <option>General</option>
                    <option>SC/ST</option>
                    <option>Differently Abled</option>
                    <option>Below Poverty Line</option>
                  </select>
                </div>
              </div>

              <div className="alert alert--info" style={{ marginTop: '0.5rem' }}>
                The concession pass is valid for one-way travel on the specified route during the academic year.
              </div>
            </div>
          )}

          {/* ── STEP 4: Document Upload ──────────────────────── */}
          {step === 4 && (
            <div>
              <div className="card__section-label">
                {isSchool ? 'School ID Card Upload' : 'College ID Card Upload'}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                {isSchool
                  ? 'Upload your school ID card to verify your student status. This is required for school students.'
                  : 'Upload your college/university ID card. This helps verify your enrollment before the pass is issued.'}
              </p>

              <FileUpload
                id="upload-id-card"
                label={isSchool ? 'School ID Card' : 'College / University ID Card'}
                accept="image/jpeg,image/png,image/webp,application/pdf"
                hint="JPEG, PNG, WebP or PDF · Max 5 MB"
                onFile={setIdCardFile}
                file={idCardFile}
                required
              />
              <FieldError msg={fieldErrors.idCard} />

              {!idCardFile && (
                <div className="alert alert--warning" style={{ marginTop: '0.75rem' }}>
                  ⚠️ Your ID card is required. Institution administrators will use this to verify your enrollment.
                </div>
              )}

              {idCardFile && (
                <div className="alert alert--success" style={{ marginTop: '0.75rem' }}>
                  ✅ ID card ready for upload. It will be securely stored on the server.
                </div>
              )}

              <div className="alert alert--info" style={{ marginTop: '0.75rem' }}>
                Your document is stored securely on the server and only accessible to authorised institution 
                administrators for verification purposes.
              </div>
            </div>
          )}

          {/* ── STEP 5: Review & Submit ──────────────────────── */}
          {step === 5 && (
            <div>
              <div className="card__section-label">Review Your Application</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Please verify all details before submitting.
              </p>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Student Type</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(0)}>Edit</button>
                </div>
                <div className="review-fields">
                  <div className="review-field">
                    <span className="review-field__label">Type</span>
                    <span className="review-field__value">
                      {form.studentType === 'school' ? '🏫 School Student' : '🎓 College / University Student'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Personal Details</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-fields">
                  {[
                    ['Full Name', form.name],
                    ['Date of Birth', `${form.dateOfBirth} (Age: ${calcAge(form.dateOfBirth)})`],
                    ['Gender', form.gender],
                    ['Guardian', form.guardianName],
                    ['Mobile', form.phone],
                    ['Email', `${form.email} ✅ Verified`],
                    ['District', form.district],
                  ].map(([l, v]) => (
                    <div key={l} className="review-field">
                      <span className="review-field__label">{l}</span>
                      <span className="review-field__value">{v || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Institution Details</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(2)}>Edit</button>
                </div>
                <div className="review-fields">
                  {[
                    ['Type', form.studentType === 'school' ? 'School Student' : 'College Student'],
                    ['Institution', selectedInstitution ? `${selectedInstitution.name}, ${selectedInstitution.district}` : '—'],
                    ['Roll No', form.rollNo],
                    ['Course', form.course],
                    ['Department', form.department || '—'],
                    ['Year / Sem', `${form.yearOfStudy || '—'} / ${form.semester || '—'}`],
                    ['Academic Year', form.academicYear],
                  ].map(([l, v]) => (
                    <div key={l} className="review-field">
                      <span className="review-field__label">{l}</span>
                      <span className="review-field__value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Travel Details</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(3)}>Edit</button>
                </div>
                <div className="review-fields">
                  {[
                    ['Route', `${form.routeFrom} → ${form.routeTo}`],
                    ['Distance', form.distanceKm ? `${form.distanceKm} km` : '—'],
                    ['Category', form.concessionCategory],
                  ].map(([l, v]) => (
                    <div key={l} className="review-field">
                      <span className="review-field__label">{l}</span>
                      <span className="review-field__value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Documents</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(4)}>Edit</button>
                </div>
                <div className="review-fields">
                  <div className="review-field">
                    <span className="review-field__label">ID Card</span>
                    <span className="review-field__value">
                      {idCardFile ? `📎 ${idCardFile.name}` : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="alert alert--info">
                By submitting, you declare that all information provided is accurate.
                False information may result in cancellation of the concession pass.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button
              className="btn btn--outline"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              id="reg-prev"
            >
              ← Back
            </button>
            {step < 5 ? (
              <button className="btn btn--primary" onClick={handleNext} id="reg-next">
                Continue →
              </button>
            ) : (
              <button className="btn btn--success btn--lg" onClick={handleSubmit} disabled={loading} id="reg-submit">
                {loading ? <span className="spinner" /> : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
