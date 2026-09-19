export default function About() {
  return (
    <div style={{ minHeight: '80vh', padding: '4rem 2rem', background: '#f9fafb', textAlign: 'center' }}>
      <div className="container">
        <h1 style={{ fontSize: '2.5rem', color: '#064e3b', marginBottom: '1rem', fontWeight: 800 }}>About ANAVANDI</h1>
        <div style={{ maxWidth: '800px', margin: '0 auto', color: '#4b5563', lineHeight: 1.8, fontSize: '1.1rem', textAlign: 'left', background: '#fff', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--border)' }}>
          <p style={{ marginBottom: '1.5rem' }}>
            The <strong>ANAVANDI Student Concession Portal</strong> is an initiative by the Kerala State Road Transport Corporation (KSRTC) to digitize and streamline the issuance of student concession passes.
          </p>
          <p style={{ marginBottom: '1.5rem' }}>
            Our goal is to eliminate paper-based workflows, reduce administrative overhead for educational institutions, and empower students with a modern, fast, and cryptographically secure digital transit pass.
          </p>
          <h3 style={{ fontSize: '1.25rem', color: '#064e3b', marginBottom: '1rem', fontWeight: 700 }}>Key Features</h3>
          <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', listStyleType: 'disc' }}>
            <li><strong>100% Digital Application Process:</strong> Apply for a new concession directly from your smartphone.</li>
            <li><strong>Instant Verification:</strong> School and college authorities verify student eligibility securely online.</li>
            <li><strong>Cryptographic Security:</strong> Each pass is signed using ECDSA P-256 for unbreakable security.</li>
            <li><strong>Offline Conductor Validation:</strong> KSRTC conductors can scan and validate QR codes in under 2 seconds, even without internet access.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
