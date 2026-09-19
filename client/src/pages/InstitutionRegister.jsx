import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
  'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
  'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

export default function InstitutionRegister({ onAuth }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    institutionName: '', place: '', postalName: '', pincode: '', district: '',
    institutionType: '', educationLevel: '', headName: '',
    affiliationUniversity: '', affiliationNumber: '',
    name: '', email: '', phone: '', password: '', confirmPassword: ''
  });

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

    if (!form.headName.trim() || !/^[a-zA-Z\s]+$/.test(form.headName)) {
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
      onAuth(data.user, data.token);
      navigate('/institution');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-shell register-shell--institution">
      <div className="register-container">
        <div className="register-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Institution Registration</h1>
          <p className="page-subtitle">Register your school or college to approve student concessions</p>
        </div>

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
                <input className="form-input" value={form.headName} onChange={e => updateForm('headName', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">University of Affiliation</label>
                <input className="form-input" value={form.affiliationUniversity} onChange={e => updateForm('affiliationUniversity', e.target.value)} />
              </div>
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
