const CREDENTIALS = [
  { role: 'Admin', email: 'admin@demo.io' },
  { role: 'Customer', email: 'customer@demo.io' },
  { role: 'Agent', email: 'agent@demo.io' },
];

const DEMO_PASSWORD = 'Demo@1234';

export default function DemoPage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="eyebrow">Evaluator access</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Demo credentials
      </h1>
      <p className="mt-3 text-ink/70">
        Seeded logins for all three roles. Password for every account:{' '}
        <span className="font-mono">{DEMO_PASSWORD}</span>
      </p>

      <table className="mt-6 w-full border border-rule text-sm">
        <thead>
          <tr className="border-b border-rule text-left">
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">Email</th>
          </tr>
        </thead>
        <tbody>
          {CREDENTIALS.map((c) => (
            <tr key={c.email} className="border-b border-rule last:border-0">
              <td className="px-3 py-2">{c.role}</td>
              <td className="px-3 py-2 font-mono">{c.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
