// Makes ADMIN_PASSWORD_HASH for backend/.env from a new admin password.
//   npm run hash-password
// The password is typed (hidden) and checked against the strong-password rule;
// only the hash is printed. Put it in .env as ADMIN_PASSWORD_HASH=... and
// delete the ADMIN_PASSWORD line, then restart the API.
import readline from 'readline';
import { hashPassword, passwordProblems } from '../src/auth.js';

const ask = (question) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); }; // hide typing
  rl.question(question, (answer) => { rl.close(); process.stdout.write('\n'); resolve(answer); });
});

const pw = await ask('New admin password: ');
const problems = passwordProblems(pw);
if (problems.length) {
  console.error(`Too weak — it needs ${problems.join(', ')}.`);
  process.exit(1);
}
if ((await ask('Type it again: ')) !== pw) {
  console.error('The two passwords did not match.');
  process.exit(1);
}
console.log('\nAdd this line to backend/.env (and delete ADMIN_PASSWORD):\n');
console.log(`ADMIN_PASSWORD_HASH=${await hashPassword(pw)}\n`);
