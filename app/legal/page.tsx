import Link from 'next/link'

export default function Legal() {
  return (
    <main className="legal">
      <p><Link href="/">← Back to ARIA</Link></p>
      <h1>Help, terms and privacy</h1>
      <p className="hint">Plain-language drafts. Have a lawyer review the terms and privacy sections before you open ARIA to the public.</p>

      <section id="help">
        <h2>Help and support</h2>
        <p><b>How do I run a check?</b> Add a paper on the dashboard, quote one claim, set the metric, tolerance and number of runs, then lock them. Run the experiment yourself, record each run, and ARIA gives the verdict.</p>
        <p><b>Why can’t I edit locked criteria?</b> Fixing the rules before seeing results is what keeps a verdict honest.</p>
        <p><b>Why can’t I add more runs?</b> Once the required runs are recorded no more are accepted, so nobody can keep trying until a result passes. Start a new check if you need a fresh attempt.</p>
        <p><b>Does a “not reproduced” verdict mean the paper is wrong?</b> No. It means the result did not reproduce under the conditions tested.</p>
        <p><b>Forgot your password?</b> Contact the ARIA team at JNectarTech.</p>
      </section>

      <section id="terms">
        <h2>Terms of service</h2>
        <p>ARIA helps you record and assess whether computational claims reproduce. Verdicts describe your recorded runs under stated conditions. They are not statements of scientific truth and must not be used for medical, legal, financial or safety decisions.</p>
        <p>You are responsible for the papers, code and data you add, and for having the right to use them. Do not upload private or unlicensed data. Do not misuse the service or try to access other users’ data.</p>
        <p>The service is provided as is while it is in early development, and features may change.</p>
      </section>

      <section id="privacy">
        <h2>Privacy</h2>
        <p>We store your name, email, the papers and links you add, your projects, runs, notes and alerts. Your data is private to your account and protected by row-level access rules in our database.</p>
        <p>We do not sell your data. You can ask for your account and data to be deleted by contacting the ARIA team.</p>
      </section>
    </main>
  )
}
