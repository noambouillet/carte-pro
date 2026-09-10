import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://localhost:3000/api/v1';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

const EMPLOYEE_EMAIL = __ENV.EMPLOYEE_EMAIL || 'romain.mercier.0@ministere-exemple.test';
const EMPLOYEE_PASSWORD = __ENV.EMPLOYEE_PASSWORD || 'Recette2026!';
const PARTNER_EMAIL = __ENV.PARTNER_EMAIL || 'contact@le-comptoir-du-midi.test';
const PARTNER_PASSWORD = __ENV.PARTNER_PASSWORD || 'Recette2026!';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'claire.marchand@ministere-exemple.test';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'Recette2026!';

const unexpectedError = new Rate('unexpected_errors');

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    employee_and_partner_flow: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      exec: 'employeeAndPartnerFlow',
    },
    admin_flow: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
      exec: 'adminFlow',
    },
  },
  thresholds: {
    unexpected_errors: ['rate<0.01'],
    http_req_duration: ['p(95)<800'],
  },
};

function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    JSON_HEADERS
  );
  unexpectedError.add(res.status !== 200);
  check(res, { 'login is 200': (r) => r.status === 200 });
  return res.status === 200;
}

function get(path, label) {
  const res = http.get(`${BASE_URL}${path}`);
  unexpectedError.add(res.status !== 200);
  check(res, { [`${label} is 200`]: (r) => r.status === 200 });
  return res;
}

export function employeeAndPartnerFlow() {
  if (!login(EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD)) {
    sleep(1);
    return;
  }

  get('/auth/me', 'employee me');
  get('/employees/balance', 'employee balance');
  get('/employees/transactions', 'employee transactions');

  const qr = http.post(`${BASE_URL}/employees/qrcode`, null, JSON_HEADERS);
  const qrOk = qr.status === 200 || qr.status === 201;
  unexpectedError.add(!qrOk);
  check(qr, { 'qrcode generation ok': () => qrOk });
  const qrToken = qrOk ? qr.json('token') : null;

  if (!login(PARTNER_EMAIL, PARTNER_PASSWORD)) {
    sleep(1);
    return;
  }

  get('/auth/me', 'partner me');
  get('/partners/search?q=midi', 'partner search');
  get('/partners/transactions', 'partner transactions');

  if (qrToken) {
    const idempotencyKey = `k6-${__VU}-${__ITER}-${Date.now()}`;
    const redeem = http.post(
      `${BASE_URL}/partners/transactions`,
      JSON.stringify({ qrToken, amountCents: 10, idempotencyKey }),
      JSON_HEADERS
    );
    const handled = redeem.status === 201 || redeem.status === 402;
    unexpectedError.add(!handled);
    check(redeem, { 'redeem handled (201 or 402)': () => handled });
  }

  sleep(1);
}

export function adminFlow() {
  if (!login(ADMIN_EMAIL, ADMIN_PASSWORD)) {
    sleep(1);
    return;
  }

  get('/auth/me', 'admin me');
  get('/admin/accounts', 'admin accounts');
  get('/admin/scoreboard', 'admin scoreboard');

  sleep(1);
}
