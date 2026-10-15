import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "./components/brand";
import { SectionLink } from "./components/section-link";
import {
  HeroStage,
  BookingLinkPreview,
  MeetingPreview,
  WeekPreview,
} from "./landing/illustrations";
import { Questions } from "./landing/questions";
import { ScrollStory } from "./landing/scroll-story";
import { AmbientScene } from "./landing/ambient-scene";
import "./landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: "Zentro — Make room for what matters." },
};

export default function HomePage() {
  return (
    <div className="landing">
      <AmbientScene />
      <header className="site-header">
        <Brand />
        <nav aria-label="Website">
          <SectionLink href="#how-it-works">The idea</SectionLink>
          <SectionLink href="#questions">Questions</SectionLink>
        </nav>
        <Link className="primary-link header-action" href="/dashboard">
          Workspace <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <main id="main-content" tabIndex={-1}>
        <ScrollStory>
          <section className="landing-hero">
            <div className="hero-copy">
              <p className="hero-eyebrow">
                <span className="status-dot" /> A calmer way to meet · In
                development
              </p>
              <h1>
                Make room for <em>what matters.</em>
              </h1>
              <p className="hero-description">
                Your week deserves less back-and-forth. A thoughtful space for
                the meetings that matter.
              </p>
              <div className="hero-actions">
                <Link className="primary-link" href="/dashboard">
                  Step inside the preview <span aria-hidden="true">↗</span>
                </Link>
                <SectionLink className="text-link" href="#how-it-works">
                  See the idea <span aria-hidden="true">↓</span>
                </SectionLink>
              </div>
              <p className="hero-note">
                Scheduling and account features aren’t available yet.
              </p>
            </div>
            <HeroStage />
          </section>
          <div className="landing-divider">
            <span>01 — Protect your time</span>
            <span>02 — Share your space</span>
            <span>03 — Meet with intention</span>
          </div>
          <section className="story-section" id="how-it-works">
            <header className="story-heading" data-reveal>
              <p className="eyebrow">A little simplicity goes a long way</p>
              <h2>
                From “when works?”
                <br />
                to <em>“see you then.”</em>
              </h2>
              <p>Three small steps. A different kind of week.</p>
              <ol className="chapter-index" aria-label="Story chapters">
                <li>
                  01 <span>Find your rhythm</span>
                </li>
                <li>
                  02 <span>Make the invitation</span>
                </li>
                <li>
                  03 <span>Come together</span>
                </li>
              </ol>
            </header>
            <div className="story-pin">
              <div className="story-track">
                <article className="story-step story-rhythm">
                  <div className="story-copy">
                    <p className="story-number">01 / YOUR RHYTHM</p>
                    <h3>
                      A week that
                      <br />
                      <em>feels like you.</em>
                    </h3>
                    <p>
                      Early starts. Long lunches. A Friday afternoon to
                      yourself. The plan is to make your availability fit the
                      life you actually live.
                    </p>
                    <span className="story-detail">
                      Your hours. Your boundaries.
                    </span>
                  </div>
                  <div className="story-art">
                    <WeekPreview />
                  </div>
                </article>
                <article className="story-step story-link">
                  <div className="story-copy">
                    <p className="story-number">02 / ONE SIMPLE LINK</p>
                    <h3>
                      An invitation,
                      <br />
                      <em>without the inbox.</em>
                    </h3>
                    <p>
                      A simple link will let your guest choose a time. Share it
                      once, and get back to the rest of your day.
                    </p>
                    <span className="story-detail">
                      One host. One guest. One good conversation.
                    </span>
                  </div>
                  <div className="story-art">
                    <BookingLinkPreview />
                  </div>
                </article>
                <article className="story-step story-meet">
                  <div className="story-copy">
                    <p className="story-number">03 / THE GOOD PART</p>
                    <h3>
                      Show up for
                      <br />
                      <em>the moment.</em>
                    </h3>
                    <p>
                      A clear time and a shared plan. That’s the experience
                      we’re building, so you can give the conversation your full
                      attention.
                    </p>
                    <span className="story-detail">
                      Make a little room. See what happens.
                    </span>
                  </div>
                  <div className="story-art">
                    <MeetingPreview />
                  </div>
                </article>
              </div>
            </div>
          </section>
          <section className="landing-principle">
            <p className="eyebrow">Time, with intention</p>
            <h2>
              Good conversations
              <br />
              deserve <em>a little room.</em>
            </h2>
            <p>
              Time to focus. Time to connect. One considered place for both.
            </p>
            <Link className="primary-link" href="/dashboard">
              Take a look around <span aria-hidden="true">↗</span>
            </Link>
            <span className="principle-flower" aria-hidden="true">
              ✳
            </span>
          </section>
          <section className="questions-section" id="questions">
            <header data-reveal>
              <p className="eyebrow">Before we meet</p>
              <h2>
                A few things
                <br />
                <em>to know.</em>
              </h2>
              <p>Clear answers, from the start.</p>
            </header>
            <Questions />
          </section>
        </ScrollStory>
      </main>
      <footer className="site-footer">
        <Brand />
        <p>A little room for what matters.</p>
        <SectionLink href="#main-content">Back to the top ↑</SectionLink>
      </footer>
    </div>
  );
}
