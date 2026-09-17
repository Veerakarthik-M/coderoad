// Seed script — creates demo data for presentation
// Idempotent: safe to run multiple times, uses INSERT OR IGNORE
import { getDb, execute, queryOne, queryAll, saveDb } from './db.js';
import bcrypt from 'bcryptjs';
import { signCredential } from './crypto/sign.js';

export async function seedIfEmpty() {
  await getDb();
  
  // Check if already seeded
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    console.log('📦 Database already has data, skipping seed.');
    return;
  }

  await runSeed();
}

async function runSeed() {
  console.log('🌱 Seeding demo data...\n');

  const hash = await bcrypt.hash('demo123', 10);

  // 1. Create KSRTC Admin
  execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['admin', 'admin@ksrtc.com', 'ksrtc_admin', hash, 'KSRTC Admin', '9876543210']
  );
  console.log('✅ Admin: admin@ksrtc.com / demo123');

  // 2. Create Conductor
  execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['conductor', 'conductor@ksrtc.com', 'conductor1', hash, 'Rajesh Kumar', '9876543211']
  );
  console.log('✅ Conductor: conductor@ksrtc.com / demo123');

  // 3. Create Institution (Amrita Vishwa Vidyapeetham)
  const instUserId = execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['institution', 'admin@amrita.edu', 'amrita_admin', hash, 'Dr. Priya Nair', '9876543212']
  );

  const existingInst = queryOne("SELECT id FROM institutions WHERE name = 'Amrita Vishwa Vidyapeetham'");
  let instId;
  if (!existingInst) {
    instId = execute(
      `INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, 
       institution_type, education_level, head_name, affiliation_university, affiliation_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [instUserId, 'Amrita Vishwa Vidyapeetham', 'Ettimadai', 'Ettimadai', '641112',
       'Coimbatore', 'Engineering College', 'UG', 'Dr. P. Venkat Rangan',
       'Amrita Vishwa Vidyapeetham', 'UGC-2003']
    );
  } else {
    instId = existingInst.id;
  }
  console.log('✅ Institution: admin@amrita.edu / demo123');

  // 4. Create a second institution (Government College)
  const instUserId2 = execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['institution', 'admin@gec.ac.in', 'gec_admin', hash, 'Prof. Suresh Babu', '9876543215']
  );

  const existingInst2 = queryOne("SELECT id FROM institutions WHERE name = 'Government Engineering College, Thrissur'");
  if (!existingInst2) {
    execute(
      `INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, 
       institution_type, education_level, head_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [instUserId2, 'Government Engineering College, Thrissur', 'Thrissur', 'Ramavarmapuram', '680009',
       'Thrissur', 'Engineering College', 'UG', 'Dr. K. Ramesh']
    );
  }
  console.log('✅ Institution 2: admin@gec.ac.in / demo123');

  // 5. Create demo student — Karthik M V
  const studentUserId = execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['student', 'karthik@student.com', 'karthik_mv', hash, 'Karthik M V', '9876543213']
  );
  console.log('✅ Student: karthik@student.com / demo123');

  // 6. Create a student application (already issued — for demo)
  const existingApp = queryOne("SELECT id FROM applications WHERE student_user_id = ?", [studentUserId]);
  let credentialId;
  if (!existingApp) {
    const appId = execute(
      `INSERT INTO applications (
        student_user_id, institution_id, status,
        date_of_birth, age, gender, guardian_name,
        aadhaar_number, address, place, postal_name, pincode, district,
        roll_no, course, department, year_of_study, semester, academic_year,
        route_from, route_to, distance_km, concession_category
      ) VALUES (?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentUserId, instId,
        '2004-05-15', 22, 'Male', 'Mohan V',
        '1234-5678-9012', '42, MG Road', 'Ettimadai', 'Ettimadai', '641112', 'Coimbatore',
        '21CS045', 'B.Tech Computer Science', 'Computer Science & Engineering', '3rd Year', 'S6', '2026-27',
        'Ettimadai', 'Coimbatore', 18, 'General'
      ]
    );

    // Create signed credential for the demo student
    credentialId = `ANV-2026-${String(appId).padStart(6, '0')}`;
    const now = new Date();
    const validFrom = now.toISOString().split('T')[0];
    const validTo = '2027-03-31';

    const payload = {
      cid: credentialId,
      sid: '21CS045',
      name: 'Karthik M V',
      inst: 'Amrita Vishwa Vidyapeetham',
      instId: instId,
      uid: studentUserId,
      route: 'Ettimadai → Coimbatore',
      from_stop: 'Ettimadai',
      to_stop: 'Coimbatore',
      km: 18,
      type: 'Student Concession',
      from: validFrom,
      to: validTo,
      iss: 'KSRTC-ANAVANDI',
      iat: Math.floor(Date.now() / 1000)
    };

    const jwsToken = await signCredential(payload);

    execute(
      `INSERT INTO credentials (application_id, credential_id, jws_token, valid_from, valid_to)
       VALUES (?, ?, ?, ?, ?)`,
      [appId, credentialId, jwsToken, validFrom, validTo]
    );
    console.log(`✅ Credential issued: ${credentialId}`);

    // 7. Seed some demo verification events for travel history
    const conductorUser = queryOne("SELECT id FROM users WHERE email = 'conductor@ksrtc.com'");
    const conductorId = conductorUser?.id || null;

    const demoEvents = [
      { daysAgo: 0, time: '08:42', mode: 'ONLINE', result: 'VALID' },
      { daysAgo: 1, time: '08:38', mode: 'OFFLINE', result: 'VALID' },
      { daysAgo: 2, time: '08:45', mode: 'ONLINE', result: 'VALID' },
      { daysAgo: 3, time: '08:40', mode: 'ONLINE', result: 'VALID' },
      { daysAgo: 5, time: '08:51', mode: 'OFFLINE', result: 'VALID' },
    ];

    for (const ev of demoEvents) {
      const evDate = new Date();
      evDate.setDate(evDate.getDate() - ev.daysAgo);
      const dateStr = evDate.toISOString().split('T')[0];
      const verifiedAt = `${dateStr}T${ev.time}:00.000Z`;

      execute(
        `INSERT INTO verification_events (
          credential_id, student_name, institution_name, institution_id, student_user_id,
          route_from, route_to, pass_id, conductor_id, conductor_name,
          verification_mode, verification_result, verified_at, device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          credentialId, 'Karthik M V', 'Amrita Vishwa Vidyapeetham', instId, studentUserId,
          'Ettimadai', 'Coimbatore', credentialId, conductorId, 'Rajesh Kumar',
          ev.mode, ev.result, verifiedAt, 'DEVICE-CON-001'
        ]
      );
    }
    console.log('✅ Demo verification events created');
  }

  // 8. Create a second student with pending application
  const studentUserId2 = execute(
    "INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    ['student', 'anjali@student.com', 'anjali_s', hash, 'Anjali S', '9876543214']
  );

  const existingApp2 = queryOne("SELECT id FROM applications WHERE student_user_id = ?", [studentUserId2]);
  if (!existingApp2) {
    execute(
      `INSERT INTO applications (
        student_user_id, institution_id, status,
        date_of_birth, age, gender, guardian_name,
        aadhaar_number, address, place, postal_name, pincode, district,
        roll_no, course, department, year_of_study, semester, academic_year,
        route_from, route_to, distance_km
      ) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentUserId2, instId,
        '2005-08-22', 21, 'Female', 'Suresh S',
        '9876-5432-1098', '15, Temple Street', 'Palghat', 'Palghat', '678001', 'Palakkad',
        '22EC012', 'B.Tech Electronics', 'Electronics & Communication', '2nd Year', 'S4', '2026-27',
        'Palghat', 'Coimbatore', 55
      ]
    );
    console.log('✅ Pending application for Anjali S');
  }

  saveDb();
  console.log('\n🎉 Seed complete! All demo accounts use password: demo123');
  console.log('   admin@ksrtc.com | admin@amrita.edu | admin@gec.ac.in');
  console.log('   karthik@student.com | anjali@student.com | conductor@ksrtc.com');
}

// Direct run support: node seed.js
if (process.argv[1].endsWith('seed.js')) {
  runSeed().catch(console.error);
}
