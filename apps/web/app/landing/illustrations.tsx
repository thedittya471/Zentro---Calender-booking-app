export function HeroStage() {
  return (
    <div className="hero-art">
      <div className="console-bar">
        <span>
          <span className="status-dot" /> THE TIME STUDIO
        </span>
        <span>PRODUCT CONCEPT / 001</span>
      </div>
      <div className="time-studio">
        <div className="studio-agenda" aria-hidden="true">
          <p className="small-label">A DAY, ON YOUR TERMS</p>
          <strong>
            Tuesday<span>in balance.</span>
          </strong>
          <div className="agenda-item">
            <span>09:00</span>
            <p>
              Deep work<small>Room for your next idea</small>
            </p>
          </div>
          <div className="agenda-item agenda-meeting">
            <span>11:30</span>
            <p>
              A good conversation<small>30 minutes · One-to-one</small>
            </p>
          </div>
          <div className="agenda-item">
            <span>14:00</span>
            <p>
              A little breathing room<small>Time that stays yours</small>
            </p>
          </div>
        </div>
        <WeekPreview />
        <div className="floating-note" aria-hidden="true">
          <span>THE GOOD PART</span>
          <strong>
            Less arranging.
            <br />
            More connecting.
          </strong>
          <div className="studio-orbit">↗</div>
          <p>
            One host. One guest.
            <br />A fresh perspective.
          </p>
        </div>
      </div>
      <div className="console-footer">
        <span>Built around your boundaries</span>
        <span>Illustrative product concept ↗</span>
      </div>
    </div>
  );
}

export function WeekPreview() {
  return (
    <figure className="week-preview">
      <div className="week-window" aria-hidden="true">
        <div className="window-bar">
          <span className="window-dots">● ● ●</span>
          <span>zentro / your week</span>
        </div>
        <div className="week-title">
          <span>Your kind of week.</span>
          <span className="tiny-pill">A little breathing room</span>
        </div>
        <div className="week-days">
          {["MON", "TUE", "WED", "THU", "FRI"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="week-grid">
          {Array.from({ length: 20 }, (_, index) => (
            <div
              key={index}
              className={`week-cell ${[2, 6, 13, 17].includes(index) ? "week-cell-filled" : ""}`}
            >
              {index === 6
                ? "A good conversation"
                : index === 13
                  ? "Time to focus"
                  : index === 17
                    ? "A fresh idea"
                    : ""}
            </div>
          ))}
        </div>
        <div className="week-footer">
          <span className="status-dot" /> Space for work. Space for life.
        </div>
      </div>
      <figcaption>Illustrative scheduling preview</figcaption>
    </figure>
  );
}

export function BookingLinkPreview() {
  return (
    <figure className="booking-link-preview">
      <div className="booking-link-window" aria-hidden="true">
        <div className="booking-profile">
          <div className="sample-avatar">Y</div>
          <p className="small-label">YOUR PERSONAL INVITATION</p>
          <strong>
            Let’s make
            <br />a little time.
          </strong>
          <p>A conversation, a fresh idea, or a new beginning.</p>
          <div className="sample-time">
            <span>◷ 30 minutes</span>
            <span>↗ One-to-one</span>
          </div>
        </div>
        <div className="booking-slots">
          <p className="small-label">A TIME THAT FITS</p>
          <strong>
            Tuesday <span>18</span>
          </strong>
          <div className="sample-slot">
            09:30 <span>AM</span>
          </div>
          <div className="sample-slot slot-highlight">
            11:30 <span>AM ↗</span>
          </div>
          <div className="sample-slot">
            02:00 <span>PM</span>
          </div>
        </div>
        <div className="sample-link">
          <span>zentro / your-link</span>
          <span>↗</span>
        </div>
      </div>
      <figcaption>Illustration of a booking link</figcaption>
    </figure>
  );
}

export function MeetingPreview() {
  return (
    <figure className="meeting-preview">
      <div className="meeting-window" aria-hidden="true">
        <div className="ticket-top">
          <span className="small-label">A LITTLE TIME, TOGETHER</span>
          <div className="meeting-check">✓</div>
        </div>
        <strong>
          See you
          <br />
          <em>then.</em>
        </strong>
        <div className="meeting-people">
          <span>Y</span>
          <span>+</span>
          <span>G</span>
        </div>
        <div className="ticket-details">
          <p>
            Tuesday, 18<span>11:30 — 12:00</span>
          </p>
          <p>
            One good conversation<span>30 minutes · One-to-one</span>
          </p>
        </div>
        <div className="meeting-note">
          ILLUSTRATIVE MEETING PASS <span>↗</span>
        </div>
      </div>
      <figcaption>Illustration of the planned meeting outcome</figcaption>
    </figure>
  );
}
