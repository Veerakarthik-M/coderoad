// Seed script -- creates realistic demo data for ANAVANDI hackathon demo
import { getDb, execute, queryOne, saveDb } from './db.js';
import bcrypt from 'bcryptjs';
import { signCredential } from './crypto/sign.js';

export async function seedIfEmpty() {
  await getDb();
  const userCount = queryOne('SELECT COUNT(*) as count FROM users');
  if (userCount && userCount.count > 0) {
    console.log('Database already has data, skipping seed.');
    return;
  }
  await runSeed();
}

async function runSeed() {
  await getDb();
  console.log('Seeding ANAVANDI demo data...');
  const hash = await bcrypt.hash('demo123', 10);

  execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['admin', 'admin@ksrtc.in', 'ksrtc_admin', hash, 'KSRTC Platform Admin', '9400012345']);
  execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['conductor', 'conductor1@ksrtc.in', 'conductor_rajesh', hash, 'Rajesh Kumar', '9400012346']);
  execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['conductor', 'conductor2@ksrtc.in', 'conductor_pradeep', hash, 'Pradeep Nair', '9400012347']);

  const instUser1 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['institution', 'admin@amrita.edu', 'amrita_admin', hash, 'Dr. Priya Nair', '9400012348']);
  const inst1 = execute(`INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, institution_type, education_level, head_name, affiliation_university, affiliation_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [instUser1, 'Amrita Vishwa Vidyapeetham', 'Ettimadai', 'Ettimadai', '641112', 'Coimbatore', 'Engineering College', 'UG/PG', 'Dr. P. Venkat Rangan', 'Amrita Vishwa Vidyapeetham', 'UGC-2003']);

  const instUser2 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['institution', 'admin@gec.ac.in', 'gec_admin', hash, 'Prof. Suresh Babu', '9400012349']);
  const inst2 = execute(`INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, institution_type, education_level, head_name, affiliation_university, affiliation_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [instUser2, 'Government Engineering College, Thrissur', 'Thrissur', 'Ramavarmapuram', '680009', 'Thrissur', 'Engineering College', 'UG', 'Dr. K. Ramesh', 'APJ Abdul Kalam Technological University', 'KTU-GEC-TCS']);

  const instUser3 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['institution', 'admin@cusat.ac.in', 'cusat_admin', hash, 'Dr. Meena Pillai', '9400012350']);
  const inst3 = execute(`INSERT INTO institutions (user_id, name, place, postal_name, pincode, district, institution_type, education_level, head_name, affiliation_university, affiliation_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [instUser3, 'Cochin University of Science and Technology', 'Kalamassery', 'Kalamassery', '682022', 'Ernakulam', 'University', 'UG/PG/PhD', 'Dr. V. Rajesh', 'CUSAT', 'CUSAT-MAIN']);

  const stu1 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['student', 'karthik@student.in', 'karthik_mv', hash, 'Karthik M V', '9400012351']);
  const stu2 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['student', 'anjali@student.in', 'anjali_s', hash, 'Anjali S', '9400012352']);
  const stu3 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['student', 'meera@student.in', 'meera_r', hash, 'Meera R', '9400012353']);
  const stu4 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['student', 'arjun@student.in', 'arjun_k', hash, 'Arjun K', '9400012354']);
  const stu5 = execute("INSERT OR IGNORE INTO users (role, email, username, password_hash, name, phone) VALUES (?, ?, ?, ?, ?, ?)", ['student', 'devika@student.in', 'devika_p', hash, 'Devika P', '9400012355']);

  const app1 = execute(`INSERT INTO applications (student_user_id, institution_id, status, date_of_birth, age, gender, guardian_name, aadhaar_number, address, place, postal_name, pincode, district, roll_no, course, department, year_of_study, semester, academic_year, route_from, route_to, distance_km, concession_category) VALUES (?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stu1, inst1, '2004-05-15', 22, 'Male', 'Mohan V', '2345-6789-0123', '42, MG Road, Ettimadai', 'Ettimadai', 'Ettimadai', '641112', 'Coimbatore', '21CS045', 'B.Tech Computer Science', 'Computer Science & Engineering', '3rd Year', 'S6', '2026-27', 'Ettimadai', 'Coimbatore Bus Stand', 18, 'General']);
  const cred1Id = `ANV-2026-${String(app1).padStart(6, '0')}`;
  const jws1 = await signCredential({ cid: cred1Id, sid: '21CS045', name: 'Karthik M V', inst: 'Amrita Vishwa Vidyapeetham', instId: inst1, uid: stu1, route: 'Ettimadai to Coimbatore Bus Stand', from_stop: 'Ettimadai', to_stop: 'Coimbatore Bus Stand', km: 18, type: 'Student Concession', from: '2026-04-01', to: '2027-03-31', iss: 'KSRTC-ANAVANDI', iat: Math.floor(Date.now() / 1000) });
  execute(`INSERT INTO credentials (application_id, credential_id, jws_token, valid_from, valid_to) VALUES (?, ?, ?, ?, ?)`, [app1, cred1Id, jws1, '2026-04-01', '2027-03-31']);

  execute(`INSERT INTO applications (student_user_id, institution_id, status, date_of_birth, age, gender, guardian_name, aadhaar_number, address, place, postal_name, pincode, district, roll_no, course, department, year_of_study, semester, academic_year, route_from, route_to, distance_km) VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stu2, inst2, '2005-08-22', 21, 'Female', 'Suresh S', '9876-5432-1098', '15, Temple Street', 'Thrissur', 'Thrissur', '680001', 'Thrissur', '22EC012', 'B.Tech Electronics', 'Electronics & Communication', '2nd Year', 'S4', '2026-27', 'Thrissur Town', 'GEC Thrissur', 4]);
  execute(`INSERT INTO applications (student_user_id, institution_id, status, date_of_birth, age, gender, guardian_name, aadhaar_number, address, place, postal_name, pincode, district, roll_no, course, department, year_of_study, semester, academic_year, route_from, route_to, distance_km) VALUES (?, ?, 'inst_approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stu3, inst3, '2003-12-10', 23, 'Female', 'Rajan R', '5678-9012-3456', '8, Lake Road, Ernakulam', 'Ernakulam', 'Kalamassery', '682022', 'Ernakulam', '20MCA018', 'MCA', 'Computer Applications', '3rd Year', 'S6', '2026-27', 'Ernakulam North', 'CUSAT Kalamassery', 12]);
  execute(`INSERT INTO applications (student_user_id, institution_id, status, date_of_birth, age, gender, guardian_name, aadhaar_number, address, place, postal_name, pincode, district, roll_no, course, department, year_of_study, semester, academic_year, route_from, route_to, distance_km, rejection_reason) VALUES (?, ?, 'rejected', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stu4, inst1, '2005-03-18', 21, 'Male', 'Krishnan K', '3456-7890-1234', '22, East Nada, Guruvayur', 'Guruvayur', 'Guruvayur', '680101', 'Thrissur', '23CS078', 'B.Tech Computer Science', 'Computer Science & Engineering', '1st Year', 'S2', '2026-27', 'Guruvayur', 'Ettimadai', 95, 'Home address not within eligible zone. Please reapply with the correct route.']);

  const app5 = execute(`INSERT INTO applications (student_user_id, institution_id, status, date_of_birth, age, gender, guardian_name, aadhaar_number, address, place, postal_name, pincode, district, roll_no, course, department, year_of_study, semester, academic_year, route_from, route_to, distance_km, concession_category) VALUES (?, ?, 'issued', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [stu5, inst2, '2004-11-05', 22, 'Female', 'Padmakumar P', '6789-0123-4567', '6, Civil Lines, Thrissur', 'Thrissur', 'Thrissur', '680001', 'Thrissur', '21ME034', 'B.Tech Mechanical Engineering', 'Mechanical Engineering', '3rd Year', 'S6', '2026-27', 'Thrissur Town', 'GEC Thrissur', 4, 'SC']);
  const cred5Id = `ANV-2026-${String(app5).padStart(6, '0')}`;
  const jws5 = await signCredential({ cid: cred5Id, sid: '21ME034', name: 'Devika P', inst: 'Government Engineering College, Thrissur', instId: inst2, uid: stu5, route: 'Thrissur Town to GEC Thrissur', from_stop: 'Thrissur Town', to_stop: 'GEC Thrissur', km: 4, type: 'Student Concession', from: '2026-04-01', to: '2027-03-31', iss: 'KSRTC-ANAVANDI', iat: Math.floor(Date.now() / 1000) });
  execute(`INSERT INTO credentials (application_id, credential_id, jws_token, valid_from, valid_to) VALUES (?, ?, ?, ?, ?)`, [app5, cred5Id, jws5, '2026-04-01', '2027-03-31']);

  const con1 = queryOne("SELECT id FROM users WHERE email = 'conductor1@ksrtc.in'");
  const con2 = queryOne("SELECT id FROM users WHERE email = 'conductor2@ksrtc.in'");

  const evs = [
    { d: 0, t: '08:42', m: 'ONLINE',  r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 1, t: '08:38', m: 'OFFLINE', r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 2, t: '08:45', m: 'ONLINE',  r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 3, t: '08:51', m: 'ONLINE',  r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 5, t: '08:33', m: 'OFFLINE', r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 7, t: '08:55', m: 'ONLINE',  r: 'VALID', cid: cred1Id, sn: 'Karthik M V',   iid: inst1, uid: stu1, rf: 'Ettimadai', rt: 'Coimbatore Bus Stand', coid: con1?.id, cn: 'Rajesh Kumar',   dev: 'DEVICE-CON-001' },
    { d: 0, t: '09:10', m: 'ONLINE',  r: 'VALID', cid: cred5Id, sn: 'Devika P',      iid: inst2, uid: stu5, rf: 'Thrissur Town', rt: 'GEC Thrissur',      coid: con2?.id, cn: 'Pradeep Nair',  dev: 'DEVICE-CON-002' },
    { d: 1, t: '09:15', m: 'ONLINE',  r: 'VALID', cid: cred5Id, sn: 'Devika P',      iid: inst2, uid: stu5, rf: 'Thrissur Town', rt: 'GEC Thrissur',      coid: con2?.id, cn: 'Pradeep Nair',  dev: 'DEVICE-CON-002' },
    { d: 2, t: '09:08', m: 'OFFLINE', r: 'VALID', cid: cred5Id, sn: 'Devika P',      iid: inst2, uid: stu5, rf: 'Thrissur Town', rt: 'GEC Thrissur',      coid: con2?.id, cn: 'Pradeep Nair',  dev: 'DEVICE-CON-002' },
  ];
  for (const ev of evs) {
    const dt = new Date();
    dt.setDate(dt.getDate() - ev.d);
    const ds = dt.toISOString().split('T')[0];
    const iname = ev.iid === inst1 ? 'Amrita Vishwa Vidyapeetham' : 'Government Engineering College, Thrissur';
    execute(`INSERT INTO verification_events (credential_id, student_name, institution_name, institution_id, student_user_id, route_from, route_to, pass_id, conductor_id, conductor_name, verification_mode, verification_result, verified_at, device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [ev.cid, ev.sn, iname, ev.iid, ev.uid, ev.rf, ev.rt, ev.cid, ev.coid, ev.cn, ev.m, ev.r, `${ds}T${ev.t}:00.000Z`, ev.dev]);
  }

  saveDb();
  console.log('Seed complete! All passwords: demo123');
  console.log('admin@ksrtc.in | admin@amrita.edu | admin@gec.ac.in | admin@cusat.ac.in');
  console.log('karthik@student.in | anjali@student.in | meera@student.in | devika@student.in');
  console.log('conductor1@ksrtc.in | conductor2@ksrtc.in');
}

if (process.argv[1].endsWith('seed.js')) {
  runSeed().catch(console.error);
}
