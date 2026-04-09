import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <Link href="/" className="text-neon-cyan text-sm font-black uppercase tracking-widest hover:underline mb-8 inline-block">
          &larr; Back to STAN.DOM
        </Link>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-magenta tracking-tighter">
          Privacy Policy
        </h1>
        <div className="space-y-6 text-zinc-400 leading-relaxed text-sm">
          <p>
            Effective Date: April 2026
          </p>
          <p>
            STAN.DOM ("we," "us," or "our") respects your privacy. This Privacy Policy outlines how we collect, use, and protect the personal data of our users when they access or interact with the STAN.DOM Global K-POP Fandom Hub.
          </p>
          <h2 className="text-xl font-bold text-white mt-8">1. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Account Data:</strong> Email address, User ID (Nickname), and full name when you register natively or via third-party providers (Google).</li>
            <li><strong>Location Data:</strong> Selected Country Code or automatically detected region to render global telemetry maps.</li>
            <li><strong>Activity Data:</strong> Votes cast, comments submitted, and platform interaction telemetry.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">2. How We Use Your Information</h2>
          <p>
            We use your data solely to operate the platform, authenticate users to prevent spam/bots, calculate regional K-Pop coverage scores, and maintain fairness in voting systems.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">3. Data Security</h2>
          <p>
            All user data is encrypted and stored via secure protocols powered by Supabase. We do not sell or rent your personal information to third parties.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">4. Contact</h2>
          <p>
            If you have questions regarding this policy, please contact us at stan.dom.support@example.com.
          </p>
        </div>
      </div>
    </div>
  );
}
