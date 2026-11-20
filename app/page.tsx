import Link from 'next/link'
import Image from 'next/image'
import './landing.css'
import { Network } from '@/components/art'

const verdicts: [string, string, string][] = [
  ['Reproduced', 'ok', 'The runs landed within the tolerance you set before starting. The result stands, under the conditions tested.'],
  ['Not reproduced', 'warn', 'The experiment finished but missed the mark. That is a finding, not an accusation: the paper is not called false.'],
  ['Incomplete', 'info', 'Code, data or compute was out of reach. ARIA records exactly what was missing instead of guessing.'],
  ['Inconclusive', 'gray', 'The runs disagreed with each other too much to say anything honest. More evidence is needed.'],
]
const steps: [string, string][] = [
  ['Bring a paper', 'Upload the PDF or paste a link. Your papers stay private to your account.'],
  ['Name one claim', 'Choose a single measurable result, such as “92% accuracy”, and quote it exactly.'],
  ['Lock the rules', 'Set the metric, the tolerance and the number of runs before anything is run. Once locked, they cannot be edited.'],
  ['Record every run', 'Successes and failures alike, with seeds and notes. Nothing is deleted, and nobody can keep running until it passes.'],
  ['Read the verdict', 'One of four honest answers appears with the evidence beside it, ready to print or share.'],
]
const fields: [string, string][] = [
  ['Machine learning', 'Where ARIA begins, because experiments run on code and can be repeated.'],
  ['Biology and medicine', 'Next, together with qualified domain experts and extra safeguards.'],
  ['The wider laboratory', 'Physics, chemistry and climate science, as the method proves itself.'],
]
const who: [string, string][] = [
  ['AI and ML startups', 'Know whether a method works before you spend months building a product on it.'],
  ['Research laboratories', 'Establish reliable baselines and keep a clear record of every reproduction attempt.'],
  ['Universities', 'Give postgraduate students a rigorous, repeatable way to test published work.'],
  ['Students and independent researchers', 'Hold your reading to the same standard of proof as the biggest labs.'],
]
const promises: [string, string][] = [
  ['Evidence before answers', 'A confident sentence is not proof. Every conclusion in ARIA points back to runs you can inspect.'],
  ['Failure is data', 'A run that did not work stays on the record. Hiding it would make the whole report worthless.'],
  ['Humans stay in the loop', 'A report is only marked as reviewed when a named person says they reviewed it.'],
]

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav"><div className="wrap">
        <Link href="/" className="logo"><svg width="38" height="34"><use href="#mark" /></svg><b style={{ fontSize: '1.5rem' }}>ARIA</b></Link>
        <nav aria-label="Sections"><a href="#how">How it works</a><a href="#verdicts">Verdicts</a><a href="#who">Who it’s for</a><a href="#promise">Our promise</a><Link href="/login">Sign in</Link></nav>
        <Link href="/signup" className="cta sm">Get started</Link>
      </div></header>

      <section className="lp-hero"><div className="wrap">
        <div>
          <h1 className="serif">Science you can <em>test</em>, not merely trust.</h1>
          <p className="lead">ARIA turns the claims inside machine-learning papers into experiments you can repeat. Every run on record, every limit in plain sight, every verdict earned.</p>
          <div className="row"><Link href="/signup" className="cta">Create your account</Link><a href="#how" className="cta ghost">See how it works</a></div>
          <div className="proof"><span>Rules locked before results</span><span>Failures never hidden</span><span>Humans in the loop</span></div>
        </div>
        <div className="shot">
          <div className="crop" role="img" aria-label="A holographic AI chip and brain dashboard in a laboratory" />
          <div className="float f1"><small>Example claim</small><b>“92% accuracy”</b></div>
          <div className="float f2"><small>Example verdict</small><b className="ok">Reproduced</b></div>
        </div>
      </div></section>

      <section className="sec alt"><div className="wrap crisis">
        <div>
          <h2 className="serif">A quiet crisis at the heart of research.</h2>
          <p className="sub">Brilliant results are published every day. Far fewer are ever tested a second time, because reproducing someone else’s experiment takes weeks, specialist skill and compute that most teams do not have.</p>
        </div>
        <div className="statcard">
          <span className="big-n">70%+</span>
          <p>of researchers surveyed have tried and failed to reproduce another scientist’s experiment.</p>
          <p className="src">Nature survey of 1,576 researchers, 2016.</p>
        </div>
      </div></section>

      <section className="sec" id="how"><div className="wrap">
        <h2 className="serif">From a bold claim to solid evidence, in five steps.</h2>
        <p className="sub">ARIA does not ask you to believe it. It gives you a process, and keeps the receipts.</p>
        <div className="steps">{steps.map(([t, d]) => <div className="step" key={t}><div><b>{t}</b><span>{d}</span></div></div>)}</div>
        <p className="road">Coming next: sandboxed automatic runs, a network of expert reviewers, and shared team workspaces.</p>
      </div></section>

      <section className="sec alt" id="verdicts"><div className="wrap">
        <h2 className="serif">Four honest answers. Never just “true” or “false.”</h2>
        <p className="sub">Science rarely deals in absolutes, so ARIA does not either.</p>
        <div className="cards">{verdicts.map(([t, c, d]) => <div className="card2" key={t}><span className={`chip dk ${c}`}>{t}</span><h3 className="serif">{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="sec"><div className="wrap">
        <h2 className="serif">Starting with machine learning. Built for all of science.</h2>
        <p className="sub">Wherever a result can be computed, it can be checked. We begin where experiments run on code, and grow with the right experts beside us.</p>
        <div className="wide"><Image src="/images/ml-lab.jpg" alt="A researcher at a laptop beside a holographic dashboard showing a Reproduced verdict" width={1800} height={771} sizes="(max-width:1180px) 100vw, 1180px" /></div>
        <div className="cards three">{fields.map(([t, d]) => <div className="card2" key={t}><h3 className="serif">{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="banner">
        <Image src="/images/team.jpg" alt="Three smiling students looking at charts and code on a laptop" fill sizes="100vw" />
        <div className="wrap">
          <h2 className="serif" style={{ fontSize: 'clamp(1.9rem,3.8vw,3.1rem)', maxWidth: '16em' }}>For every curious mind in the lab.</h2>
          <p className="sub" style={{ maxWidth: '38em' }}>Students, postgraduates and independent researchers deserve the same standard of proof as the best-funded institutions. ARIA is built so that rigour is not a privilege.</p>
        </div>
      </section>

      <section className="sec" id="who"><div className="wrap">
        <h2 className="serif">For people who cannot afford to build on sand.</h2>
        <div className="cards">{who.map(([t, d]) => <div className="card2" key={t}><h3 className="serif">{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="sec alt" id="promise"><div className="wrap">
        <h2 className="serif">Built on a simple promise.</h2>
        <div className="cards">{promises.map(([t, d]) => <div className="card2" key={t}><h3 className="serif">{t}</h3><p>{d}</p></div>)}</div>
      </div></section>

      <section className="quote"><Network wide /><p>A result that cannot be repeated is only a story.</p></section>

      <section className="final"><div className="wrap">
        <h2 className="serif">Ready to test the evidence?</h2>
        <p className="sub" style={{ margin: '16px auto 0' }}>Bring one paper and one claim. Leave with something you can defend.</p>
        <div className="row"><Link href="/signup" className="cta">Create your account</Link><Link href="/login" className="cta ghost">Sign in</Link></div>
      </div></section>

      <footer className="lp-foot"><div className="wrap">
        <span>© 2026 JNectarTech. Evidence Before Answers. Reproducibility Before Claims.</span>
        <span><Link href="/legal#help">Help</Link> · <Link href="/legal#terms">Terms</Link> · <Link href="/legal#privacy">Privacy</Link></span>
      </div></footer>
    </div>
  )
}
