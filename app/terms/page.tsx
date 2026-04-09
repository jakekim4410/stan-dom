import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white p-8 md:p-16 font-sans">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
        <Link href="/" className="text-neon-cyan text-sm font-black uppercase tracking-widest hover:underline mb-8 inline-block">
          &larr; Back to STAN.DOM
        </Link>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-magenta to-neon-blue tracking-tighter">
          Terms of Service
        </h1>
        <div className="space-y-6 text-zinc-400 leading-relaxed text-sm">
          <p>
            Effective Date: April 2026
          </p>
          <p>
            Welcome to STAN.DOM. By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not access the service.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">1. User Accounts</h2>
          <p>
            To use certain features of the Service (such as extended voting quotas or commenting), you must register for an account using Google or an Email/Password combination. You are responsible for safeguarding your account credentials.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">2. Voting and Interaction Rules</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Fair Play:</strong> Users must not use automated bots, scripts, or multiple fake accounts to bypass daily voting or commenting quotas.</li>
            <li><strong>Content Guidelines:</strong> Comments must not contain hate speech, spam, or abusive language. We reserve the right to moderate or delete comments and ban users who violate community guidelines.</li>
          </ul>

          <h2 className="text-xl font-bold text-white mt-8">3. Intellectual Property</h2>
          <p>
            STAN.DOM and its original content (excluding artist images and trademarks which belong to their respective owners) are protected by copyright, trademark, and other laws.
          </p>

          <h2 className="text-xl font-bold text-white mt-8">4. Termination</h2>
          <p>
            We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>
        </div>
      </div>
    </div>
  );
}
