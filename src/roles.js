export const ADMINS = [
  'mehranislam111@gmail.com',
  'ahmed.mehran2011.16@gmail.com',
  'shahnaj.khanam77@gmail.com',
];

export function getRole(email) {
  return ADMINS.includes(email?.toLowerCase()) ? 'admin' : 'user';
}

const ENDINGS = ['d','a','f','u','c','k'];

export function generateAuthCode() {
  const digits = Array.from({length:4}, (_,i) =>
    i < 3 ? Math.floor(Math.random()*10) : ENDINGS[Math.floor(Math.random()*ENDINGS.length)]
  );
  return digits.join('');
}

export function getOrCreateAuthCode(uid) {
  const key = `authcode_${uid}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const code = generateAuthCode();
  localStorage.setItem(key, code);
  return code;
}
