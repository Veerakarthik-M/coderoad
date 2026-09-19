import { Link } from 'react-router-dom';

export default function Downloads() {
  return (
    <div className="landing-section" style={{ minHeight: '80vh', background: 'var(--bg-subtle)' }}>
      <div className="container">
        <h1 className="landing-section__title" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>Downloads & Forms</h1>
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="hero-action-row" style={{ background: '#fff', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <span className="hero-action-row__label" style={{ color: 'var(--text)', fontSize: '1rem' }}>📄 Form 26 — Student Concession Application</span>
            <a href="/forms/form-26-concession.html" target="_blank" rel="noopener" className="btn btn--primary" style={{ padding: '0.5rem 1rem' }}>Download Form</a>
          </div>
          
          <div className="hero-action-row" style={{ background: '#fff', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <span className="hero-action-row__label" style={{ color: 'var(--text)', fontSize: '1rem' }}>📋 Instructions & Eligibility Guide</span>
            <a href="/forms/instructions.html" target="_blank" rel="noopener" className="btn btn--primary" style={{ padding: '0.5rem 1rem' }}>Download Guide</a>
          </div>
          
          <div className="hero-action-row" style={{ background: '#fff', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <span className="hero-action-row__label" style={{ color: 'var(--text)', fontSize: '1rem' }}>🏫 Institution Registration Form</span>
            <a href="/forms/institution-registration.html" target="_blank" rel="noopener" className="btn btn--primary" style={{ padding: '0.5rem 1rem' }}>Download Form</a>
          </div>
          
          <div className="hero-action-row" style={{ background: '#fff', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
            <span className="hero-action-row__label" style={{ color: 'var(--text)', fontSize: '1rem' }}>🔄 Pass Renewal Application Form</span>
            <a href="/forms/form-26-concession.html" target="_blank" rel="noopener" className="btn btn--primary" style={{ padding: '0.5rem 1rem' }}>Download Form</a>
          </div>

        </div>
      </div>
    </div>
  );
}
