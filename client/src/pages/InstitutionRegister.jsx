import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
  'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
  'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

const INST_DRAFT_KEY = 'anavandi_inst_draft_v1';

const INITIAL_INST_FORM = {
  institutionName: '', place: '', postalName: '', pincode: '', district: '',
  institutionType: '', educationLevel: '', headName: '', designation: 'Principal',
  affiliationUniversity: '', affiliationNumber: '',
  name: '', email: '', phone: '', password: '', confirmPassword: ''
};

function getSavedInstDraft() {
  try {
    const raw = localStorage.getItem(INST_DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { form: { ...INITIAL_INST_FORM, ...parsed }, isDraft: true };
      }
    }
  } catch (_) {}
  return { form: INITIAL_INST_FORM, isDraft: false };
}

export default function InstitutionRegister({ onAuth }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(null);
  const initialDraft = useRef(getSavedInstDraft()).current;
  const [form, setForm] = useState(initialDraft.form);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(
    initialDraft.isDraft && Object.values(initialDraft.form).some(v => v)
  );

  // Auto-save form to draft
  useEffect(() => {
    try {
      localStorage.setItem(INST_DRAFT_KEY, JSON.stringify(form));
    } catch (_) {}
  }, [form]);

  const handleClearDraft = () => {
    try { localStorage.removeItem(INST_DRAFT_KEY); } catch (_) {}
    setForm(INITIAL_INST_FORM);
    setHasRestoredDraft(false);
  };

  const updateForm = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.institutionName.trim()) { setError('Institution Name is required'); return; }
    if (!form.place.trim()) { setError('Place is required'); return; }
    
    if (!/^\d{6}$/.test(form.pincode)) {
      setError('Please enter a valid 6-digit Pincode');
      return;
    }

    if (!form.headName.trim() || !/^[a-zA-Z\s.]+$/.test(form.headName)) {
      setError('Enter a valid Head of Institution name (letters and spaces only)');
      return;
    }

    if (!form.name.trim() || !/^[a-zA-Z\s]+$/.test(form.name)) {
      setError('Enter a valid Admin name (letters and spaces only)');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError('Please enter a valid email address');
      return;
    }

    const cleanPhone = form.phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone) || /^(\d)\1{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/register', {
        email: form.email,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: 'institution',
        institutionName: form.institutionName,
        institutionPlace: form.place,
        postalName: form.postalName,
        pincode: form.pincode,
        district: form.district,
        institutionType: form.institutionType,
        educationLevel: form.educationLevel,
        headName: form.headName,
        affiliationUniversity: form.affiliationUniversity,
        affiliationNumber: form.affiliationNumber
      });
      try { localStorage.removeItem(INST_DRAFT_KEY); } catch (_) {}
      setSubmittedSuccess({
        institutionName: form.institutionName,
        place: form.place,
        district: form.district,
        pincode: form.pincode,
        institutionType: form.institutionType,
        educationLevel: form.educationLevel,
        headName: form.headName,
        designation: form.designation || 'Principal',
        adminName: form.name,
        email: form.email,
        phone: form.phone,
        affiliationUniversity: form.affiliationUniversity
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="register-shell register-shell--institution">
        <div className="register-container" style={{ maxWidth: '640px', margin: '2rem auto' }}>
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem 2rem', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>🏛️</div>
            <span className="badge badge--pending" style={{ fontSize: '0.85rem', padding: '0.4rem 1rem', borderRadius: '999px', background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b', fontWeight: 800 }}>
              ⏳ Pending KSRTC Verification
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#064e3b', margin: '1rem 0 0.5rem' }}>
              Registration Submitted Successfully
            </h1>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              «Your institution registration has been submitted successfully. KSRTC will verify the institution details before granting access.»
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Submitted Institution Profile
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Institution</span><strong>{submittedSuccess.institutionName}</strong></div>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Location</span><span>{submittedSuccess.place}, {submittedSuccess.district} ({submittedSuccess.pincode})</span></div>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Head of Institution</span><strong>{submittedSuccess.headName} ({submittedSuccess.designation})</strong></div>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Authorized Admin</span><span>{submittedSuccess.adminName}</span></div>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Official Email</span><span>{submittedSuccess.email}</span></div>
                <div><span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contact Phone</span><strong>{submittedSuccess.phone}</strong></div>
              </div>
            </div>

            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '1rem', textAlign: 'left', marginBottom: '1.75rem', fontSize: '0.825rem', color: '#065f46', lineHeight: 1.6 }}>
              📞 <strong>KSRTC Verification Protocol:</strong>
              <div style={{ marginTop: '0.25rem' }}>
                A KSRTC Depot Officer will contact the Head of Institution (<strong>{submittedSuccess.headName}</strong>) at <strong>{submittedSuccess.phone}</strong> to confirm institution legitimacy and affiliation. Once verified, your account will be activated to log in and approve student passes.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn--primary"
                style={{ background: '#059669', padding: '0.625rem 1.5rem', fontWeight: 700 }}
                onClick={() => navigate('/login/institution')}
              >
                Go to Institution Login
              </button>
              <button
                type="button"
                className="btn btn--outline"
                style={{ padding: '0.625rem 1.5rem' }}
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-shell register-shell--institution">
      <div className="register-container">
        <div className="register-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Institution Registration</h1>
          <p className="page-subtitle">Register your school or college to approve student concessions</p>
        </div>


        {hasRestoredDraft && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            padding: '0.625rem 0.875rem',
            marginBottom: '1rem',
            fontSize: '0.8125rem',
            color: '#065f46',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span>💾 <strong>Draft Restored:</strong> Your previously filled institution details were preserved.</span>
            <button
              type="button"
              onClick={handleClearDraft}
              style={{
                background: '#ffffff',
                border: '1px solid #6ee7b7',
                borderRadius: '4px',
                color: '#047857',
                fontWeight: 700,
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer'
              }}
            >
              Clear & Start Over
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="alert alert--info" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          📞 <strong>KSRTC Verification Protocol:</strong> After registration, a KSRTC Depot Officer will contact the Head of Institution at your provided phone number to verify recognition before pass approvals are activated.
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Institution Details
            </h3>
            
            <div className="form-group">
              <label className="form-label">Institution Name <span className="required">*</span></label>
              <input className="form-input" value={form.institutionName} onChange={e => updateForm('institutionName', e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Place <span className="required">*</span></label>
                <input className="form-input" value={form.place} onChange={e => updateForm('place', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">District <span className="required">*</span></label>
                <select className="form-select" value={form.district} onChange={e => updateForm('district', e.target.value)} required>
                  <option value="">Select District</option>
                  {KERALA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Postal Name</label>
                <input className="form-input" value={form.postalName} onChange={e => updateForm('postalName', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode <span className="required">*</span></label>
                <input className="form-input" value={form.pincode} onChange={e => updateForm('pincode', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Institution Type</label>
                <select className="form-select" value={form.institutionType} onChange={e => updateForm('institutionType', e.target.value)}>
                  <option value="">Select Type</option>
                  <option value="School">School</option>
                  <option value="Higher Secondary">Higher Secondary</option>
                  <option value="Arts & Science College">Arts & Science College</option>
                  <option value="Engineering College">Engineering College</option>
                  <option value="Medical College">Medical College</option>
                  <option value="Polytechnic">Polytechnic</option>
                  <option value="ITI">ITI</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Education Level</label>
                <select className="form-select" value={form.educationLevel} onChange={e => updateForm('educationLevel', e.target.value)}>
                  <option value="">Select Level</option>
                  <option value="School">School (1-10)</option>
                  <option value="Higher Secondary">Higher Secondary (11-12)</option>
                  <option value="UG">Undergraduate</option>
                  <option value="PG">Postgraduate</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Head of Institution <span className="required">*</span></label>
                <input className="form-input" placeholder="e.g. Dr. K. Radhakrishnan" value={form.headName} onChange={e => updateForm('headName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Authorized Designation <span className="required">*</span></label>
                <select className="form-select" value={form.designation} onChange={e => updateForm('designation', e.target.value)} required>
                  <option value="Principal">Principal</option>
                  <option value="Headmaster / Headmistress">Headmaster / Headmistress</option>
                  <option value="Dean / Director">Dean / Director</option>
                  <option value="Registrar">Registrar</option>
                  <option value="Student Welfare Officer">Student Welfare Officer</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">University / Board of Affiliation</label>
              <input className="form-input" placeholder="e.g. University of Kerala / KTU / CBSE" value={form.affiliationUniversity} onChange={e => updateForm('affiliationUniversity', e.target.value)} />
            </div>


            <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, margin: '1.5rem 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Admin Account
            </h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Admin Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => updateForm('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="required">*</span></label>
                <input type="email" className="form-input" value={form.email} onChange={e => updateForm('email', e.target.value)} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone <span className="required">*</span></label>
                <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} required />
              </div>
              <div></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password <span className="required">*</span></label>
                <input type="password" className="form-input" value={form.password} onChange={e => updateForm('password', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password <span className="required">*</span></label>
                <input type="password" className="form-input" value={form.confirmPassword} onChange={e => updateForm('confirmPassword', e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1rem' }} disabled={loading}>
              {loading ? <span className="spinner"></span> : '🏫 Register Institution'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
