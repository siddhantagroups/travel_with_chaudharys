// Turns on two-factor sign-in for the admin password.
//   npm run setup-mfa
// Prints a new secret. Add it to your authenticator app (Google Authenticator,
// Microsoft Authenticator, Authy…) with "Enter a setup key", then put the
// ADMIN_TOTP_SECRET line in backend/.env and restart the API. From then on the
// sign-in screen asks for the 6-digit code as well as the password.
import crypto from 'crypto';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const bytes = crypto.randomBytes(20);
let bits = 0, value = 0, secret = '';
for (const b of bytes) {
  value = (value << 8) | b;
  bits += 8;
  while (bits >= 5) { secret += alphabet[(value >>> (bits - 5)) & 31]; bits -= 5; }
}
if (bits > 0) secret += alphabet[(value << (5 - bits)) & 31];

const label = encodeURIComponent('Travel With Chaudharys:admin');
console.log('\n1. In your authenticator app choose "Enter a setup key" and type:\n');
console.log(`   Account: Travel With Chaudharys admin`);
console.log(`   Key:     ${secret.match(/.{1,4}/g).join(' ')}`);
console.log(`   Type:    Time based\n`);
console.log(`   (or open this link on the phone: otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('Travel With Chaudharys')})\n`);
console.log('2. Add this line to backend/.env, then restart the API:\n');
console.log(`ADMIN_TOTP_SECRET=${secret}\n`);
console.log('Keep the key somewhere safe — if the phone is lost, you will need it (or remove the line from .env) to sign in.\n');
