import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam',
  'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram',
  'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod'
];

// Common KSRTC bus stations/locations for autocomplete
const COMMON_LOCATIONS = [
  'Thiruvananthapuram', 'Attingal', 'Nedumangad', 'Neyyattinkara', 'Kollam', 
  'Kottarakkara', 'Punalur', 'Karunagappally', 'Pathanamthitta', 'Adoor', 
  'Thiruvalla', 'Chengannur', 'Alappuzha', 'Kayamkulam', 'Mavelikara', 
  'Kottayam', 'Changanassery', 'Pala', 'Ettumanoor', 'Idukki', 'Thodupuzha', 
  'Munnar', 'Kumily', 'Ernakulam', 'Aluva', 'Angamaly', 'Muvattupuzha', 
  'Perumbavoor', 'Kothamangalam', 'Thrissur', 'Chalakudy', 'Irinjalakuda', 
  'Guruvayur', 'Kunnamkulam', 'Palakkad', 'Ottapalam', 'Shornur', 'Mannarkkad', 
  'Malappuram', 'Manjeri', 'Tirur', 'Perinthalmanna', 'Ponnani', 'Kozhikode', 
  'Vadakara', 'Thamarassery', 'Wayanad', 'Kalpetta', 'Sulthan Bathery', 
  'Mananthavady', 'Kannur', 'Thalassery', 'Payyanur', 'Iritty', 'Kasaragod', 
  'Kanhangad', 'Ettimadai', 'Coimbatore'
].sort();

export default function StudentRegister({ onAuth }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [institutions, setInstitutions] = useState([]);

  const [form, setForm] = useState({
    name: '', dateOfBirth: '', gender: '', guardianName: '',
    phone: '', aadhaarNumber: '', email: '', username: '', password: '', confirmPassword: '',
    address: '', place: '', postalName: '', pincode: '', district: '',
    institutionId: '', rollNo: '', course: '', academicYear: '2026-27',
    routeFrom: '', routeTo: '', distanceKm: ''
  });

  useEffect(() => {
    api.get('/auth/institutions').then(setInstitutions).catch(console.error);
  }, []);

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age;
  };

  const handleSubmit = async () => {
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Register the student
      const regData = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: 'student'
      });
      
      onAuth(regData.user, regData.token);

      // Submit the application
      await api.post('/student/apply', {
        institutionId: parseInt(form.institutionId),
        dateOfBirth: form.dateOfBirth,
        age: calculateAge(form.dateOfBirth),
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
        academicYear: form.academicYear,
        routeFrom: form.routeFrom,
        routeTo: form.routeTo,
        distanceKm: parseFloat(form.distanceKm) || 0
      });

      navigate('/student');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setError('');
    if (tab === 0) {
      if (!form.name || !form.dateOfBirth || !form.gender || !form.guardianName || !form.phone || !form.email || !form.username || !form.password || !form.confirmPassword || !form.address || !form.place || !form.pincode || !form.district) {
        setError('Please fill all required fields before proceeding.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    } else if (tab === 1) {
      if (!form.institutionId || !form.rollNo || !form.course) {
        setError('Please fill all required institution details.');
        return;
      }
    } else if (tab === 2) {
      if (!form.routeFrom || !form.routeTo) {
        setError('Please fill all required route details.');
        return;
      }
    }
    setTab(tab + 1);
  };

  const tabs = ['Personal Details', 'Institution Details', 'Route Details', 'Review & Submit'];

  return (
    <div className="page">
      <div className="container container-narrow">
        <div className="page-header" style={{ textAlign: 'center' }}>
          <h1 className="page-title">Student Registration</h1>
          <p className="page-subtitle">Apply for KSRTC Student Concession Pass</p>
        </div>

        <div className="tabs">
          {tabs.map((label, i) => (
            <div
              key={i}
              className={`tab ${tab === i ? 'active' : ''}`}
              style={{ cursor: 'default' }}
            >
              {label}
            </div>
          ))}
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <div className="card">
          {/* Tab 0: Personal Details */}
          {tab === 0 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Personal Info
              </h3>
              <div className="form-group">
                <label className="form-label">Name <span className="required">*</span></label>
                <input className="form-input" value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="Full name" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date of Birth <span className="required">*</span></label>
                  <input type="date" className="form-input" value={form.dateOfBirth} onChange={e => updateForm('dateOfBirth', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Age</label>
                  <input className="form-input" value={calculateAge(form.dateOfBirth)} readOnly style={{ opacity: 0.7 }} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Gender <span className="required">*</span></label>
                  <select className="form-select" value={form.gender} onChange={e => updateForm('gender', e.target.value)}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Guardian Name <span className="required">*</span></label>
                  <input className="form-input" value={form.guardianName} onChange={e => updateForm('guardianName', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number <span className="required">*</span></label>
                  <input className="form-input" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="10-digit number" />
                </div>
                <div className="form-group">
                  <label className="form-label">Aadhaar Number</label>
                  <input className="form-input" value={form.aadhaarNumber} onChange={e => updateForm('aadhaarNumber', e.target.value)} placeholder="XXXX-XXXX-XXXX" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email <span className="required">*</span></label>
                  <input type="email" className="form-input" value={form.email} onChange={e => updateForm('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Username <span className="required">*</span></label>
                  <input className="form-input" value={form.username} onChange={e => updateForm('username', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password <span className="required">*</span></label>
                  <input type="password" className="form-input" value={form.password} onChange={e => updateForm('password', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password <span className="required">*</span></label>
                  <input type="password" className="form-input" value={form.confirmPassword} onChange={e => updateForm('confirmPassword', e.target.value)} />
                </div>
              </div>

              <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, margin: '1.5rem 0 1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Address Info
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Address <span className="required">*</span></label>
                  <textarea className="form-textarea" value={form.address} onChange={e => updateForm('address', e.target.value)} rows={2} />
                </div>
                <div className="form-group">
                  <label className="form-label">Place <span className="required">*</span></label>
                  <input className="form-input" value={form.place} onChange={e => updateForm('place', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Postal Name</label>
                  <input className="form-input" value={form.postalName} onChange={e => updateForm('postalName', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code <span className="required">*</span></label>
                  <input className="form-input" value={form.pincode} onChange={e => updateForm('pincode', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">District <span className="required">*</span></label>
                <select className="form-select" value={form.district} onChange={e => updateForm('district', e.target.value)}>
                  <option value="">Select District</option>
                  {KERALA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Tab 1: Institution Details */}
          {tab === 1 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Institution Details
              </h3>
              <div className="form-group">
                <label className="form-label">Select Institution <span className="required">*</span></label>
                <select className="form-select" value={form.institutionId} onChange={e => updateForm('institutionId', e.target.value)}>
                  <option value="">Select your institution</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} — {inst.place}, {inst.district}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Roll Number <span className="required">*</span></label>
                  <input className="form-input" value={form.rollNo} onChange={e => updateForm('rollNo', e.target.value)} placeholder="e.g. 21CS045" />
                </div>
                <div className="form-group">
                  <label className="form-label">Course/Class <span className="required">*</span></label>
                  <input className="form-input" value={form.course} onChange={e => updateForm('course', e.target.value)} placeholder="e.g. B.Tech Computer Science" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Academic Year</label>
                <input className="form-input" value={form.academicYear} onChange={e => updateForm('academicYear', e.target.value)} />
              </div>
            </div>
          )}

          {/* Tab 2: Route Details */}
          {tab === 2 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Route Details
              </h3>

              <datalist id="locations-list">
                {COMMON_LOCATIONS.map(loc => <option key={loc} value={loc} />)}
              </datalist>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Route From <span className="required">*</span></label>
                  <input 
                    className="form-input" 
                    list="locations-list"
                    value={form.routeFrom} 
                    onChange={e => updateForm('routeFrom', e.target.value)} 
                    placeholder="Search or type starting point" 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Route To <span className="required">*</span></label>
                  <input 
                    className="form-input" 
                    list="locations-list"
                    value={form.routeTo} 
                    onChange={e => updateForm('routeTo', e.target.value)} 
                    placeholder="Search or type destination" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Approximate Distance (km)</label>
                <input type="number" className="form-input" value={form.distanceKm} onChange={e => updateForm('distanceKm', e.target.value)} placeholder="e.g. 18" />
              </div>
            </div>
          )}

          {/* Tab 3: Review */}
          {tab === 3 && (
            <div>
              <h3 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Review Your Application
              </h3>
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
                {[
                  ['Name', form.name],
                  ['Date of Birth', form.dateOfBirth],
                  ['Gender', form.gender],
                  ['Guardian', form.guardianName],
                  ['Phone', form.phone],
                  ['Email', form.email],
                  ['District', form.district],
                  ['Institution', institutions.find(i => i.id == form.institutionId)?.name || '—'],
                  ['Roll No', form.rollNo],
                  ['Course', form.course],
                  ['Route', `${form.routeFrom} → ${form.routeTo}`],
                  ['Distance', `${form.distanceKm} km`],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    <span style={{ fontWeight: 600 }}>{value || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button
              className="btn btn-outline"
              onClick={() => setTab(Math.max(0, tab - 1))}
              disabled={tab === 0}
            >
              ← Previous
            </button>
            {tab < 3 ? (
              <button className="btn btn-primary" onClick={handleNext}>
                Next →
              </button>
            ) : (
              <button className="btn btn-success btn-lg" onClick={handleSubmit} disabled={loading}>
                {loading ? <span className="spinner"></span> : '🚀 Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
