import { useState, useEffect } from 'react';
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

const STEPS = ['Personal', 'College', 'Travel', 'Review'];

const INITIAL_FORM = {
  name: '', dateOfBirth: '', gender: '', guardianName: '',
  phone: '', aadhaarNumber: '', email: '', username: '', password: '', confirmPassword: '',
  address: '', place: '', postalName: '', pincode: '', district: '',
  institutionId: '', rollNo: '', course: '', department: '', yearOfStudy: '', semester: '', academicYear: '2026-27',
  routeFrom: '', routeTo: '', distanceKm: '', concessionCategory: 'General',
};

function FieldError({ msg }) {
  return msg ? <div className="form-error" role="alert">{msg}</div> : null;
}

export default function StudentRegister({ onAuth }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [institutions, setInstitutions] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    api.get('/auth/institutions').then(setInstitutions).catch(console.error);
  }, []);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
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
      if (!form.name.trim()) errors.name = 'Full name is required';
      if (!form.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      if (!form.gender) errors.gender = 'Please select a gender';
      if (!form.guardianName.trim()) errors.guardianName = 'Guardian name is required';
      if (!form.phone.match(/^[6-9]\d{9}$/)) errors.phone = 'Enter a valid 10-digit mobile number';
      if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Enter a valid email address';
      if (!form.username.trim()) errors.username = 'Username is required';
      if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
      if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
      if (!form.address.trim()) errors.address = 'Address is required';
      if (!form.place.trim()) errors.place = 'Place is required';
      if (!form.pincode.match(/^\d{6}$/)) errors.pincode = 'Enter a valid 6-digit PIN code';
      if (!form.district) errors.district = 'Please select a district';
    } else if (step === 1) {
      if (!form.institutionId) errors.institutionId = 'Please select your institution';
      if (!form.rollNo.trim()) errors.rollNo = 'Roll / register number is required';
      if (!form.course.trim()) errors.course = 'Course name is required';
    } else if (step === 2) {
      if (!form.routeFrom.trim()) errors.routeFrom = 'Boarding point is required';
      if (!form.routeTo.trim()) errors.routeTo = 'Destination is required';
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

  const handleSubmit = async () => {
    setSubmitError('');
    setLoading(true);
    try {
      const regData = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
        name: form.name,
        phone: form.phone,
        role: 'student',
      });
      onAuth(regData.user, regData.token);

      await api.post('/student/apply', {
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

      navigate('/student');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedInstitution = institutions.find(i => String(i.id) === String(form.institutionId));

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

          {/* ── STEP 0: Personal Details ─────────────────────── */}
          {step === 0 && (
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
                  <input id="p-age" className="form-input" value={calcAge(form.dateOfBirth)} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} aria-readonly="true" />
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
                  <label className="form-label" htmlFor="p-aadhaar">Aadhaar Number <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                  <input id="p-aadhaar" className="form-input" value={form.aadhaarNumber} onChange={e => set('aadhaarNumber', e.target.value)} placeholder="XXXX XXXX XXXX" maxLength={14} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="p-email">Email Address <span className="required">*</span></label>
                  <input id="p-email" type="email" className="form-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="your@email.com" autoComplete="email" />
                  <FieldError msg={fieldErrors.email} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-username">Username <span className="required">*</span></label>
                  <input id="p-username" className="form-input" value={form.username} onChange={e => set('username', e.target.value.toLowerCase())} placeholder="Choose a username" autoComplete="username" />
                  <FieldError msg={fieldErrors.username} />
                </div>
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

          {/* ── STEP 1: College Details ──────────────────────── */}
          {step === 1 && (
            <div>
              <div className="card__section-label">College / Institution Details</div>

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
                {institutions.length === 0 && (
                  <div className="form-hint">Loading institutions… If empty, your institution may not be registered yet.</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="c-rollno">Roll / Register Number <span className="required">*</span></label>
                  <input id="c-rollno" className="form-input" value={form.rollNo} onChange={e => set('rollNo', e.target.value.toUpperCase())} placeholder="e.g. 21CS045" />
                  <FieldError msg={fieldErrors.rollNo} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="c-academic-year">Academic Year</label>
                  <input id="c-academic-year" className="form-input" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} placeholder="e.g. 2026-27" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-course">Course / Programme <span className="required">*</span></label>
                <input id="c-course" className="form-input" value={form.course} onChange={e => set('course', e.target.value)} placeholder="e.g. B.Tech Computer Science" />
                <FieldError msg={fieldErrors.course} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="c-department">Department</label>
                <input id="c-department" className="form-input" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Computer Science & Engineering" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="c-year">Year of Study</label>
                  <select id="c-year" className="form-select" value={form.yearOfStudy} onChange={e => set('yearOfStudy', e.target.value)}>
                    <option value="">Select year</option>
                    <option>1st Year</option>
                    <option>2nd Year</option>
                    <option>3rd Year</option>
                    <option>4th Year</option>
                    <option>5th Year</option>
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
            </div>
          )}

          {/* ── STEP 2: Travel / Route Details ──────────────── */}
          {step === 2 && (
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
                Your institution will verify your eligibility before the pass is issued.
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Submit ──────────────────────── */}
          {step === 3 && (
            <div>
              <div className="card__section-label">Review Your Application</div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Please verify all details below before submitting.
              </p>

              <div className="review-section">
                <div className="review-section__header">
                  <div className="review-section__title">Personal Details</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(0)}>Edit</button>
                </div>
                <div className="review-fields">
                  {[
                    ['Full Name', form.name],
                    ['Date of Birth', `${form.dateOfBirth} (Age: ${calcAge(form.dateOfBirth)})`],
                    ['Gender', form.gender],
                    ['Guardian', form.guardianName],
                    ['Mobile', form.phone],
                    ['Email', form.email],
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
                  <div className="review-section__title">College Details</div>
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(1)}>Edit</button>
                </div>
                <div className="review-fields">
                  {[
                    ['Institution', selectedInstitution ? `${selectedInstitution.name}, ${selectedInstitution.district}` : '—'],
                    ['Roll No', form.rollNo],
                    ['Course', form.course],
                    ['Department', form.department || '—'],
                    ['Year / Semester', `${form.yearOfStudy || '—'} / ${form.semester || '—'}`],
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
                  <button className="btn btn--ghost btn--sm" onClick={() => setStep(2)}>Edit</button>
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
            {step < 3 ? (
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
