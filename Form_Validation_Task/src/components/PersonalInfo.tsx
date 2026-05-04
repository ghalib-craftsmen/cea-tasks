import { useFormContext } from "react-hook-form";
import type { FormData } from "../schema";
import { checkEmailTaken } from "../mockApi";

const NOTICE_OPTIONS = [
  "Immediately",
  "2 weeks",
  "1 month",
  "2 months",
  "3+ months",
];

export default function PersonalInfo() {
  const {
    register,
    setError,
    clearErrors,
    getFieldState,
    formState: { errors },
  } = useFormContext<FormData>();

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    if (getFieldState("email").invalid) return;
    const taken = await checkEmailTaken(e.target.value);
    if (taken) {
      setError("email", { type: "manual", message: "This email is already registered" });
    } else {
      clearErrors("email");
    }
  };

  return (
    <section aria-labelledby="step1-heading">
      <h2 id="step1-heading">Personal Information</h2>

      {/* ── Basic Info ── */}
      <div className="field-row">
        <div className="field-group">
          <label htmlFor="firstName">First name *</label>
          <input
            id="firstName"
            type="text"
            aria-invalid={!!errors.firstName}
            aria-describedby={errors.firstName ? "firstName-error" : undefined}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p id="firstName-error" role="alert" className="error">{errors.firstName.message}</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="lastName">Last name *</label>
          <input
            id="lastName"
            type="text"
            aria-invalid={!!errors.lastName}
            aria-describedby={errors.lastName ? "lastName-error" : undefined}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p id="lastName-error" role="alert" className="error">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="field-row">
        <div className="field-group">
          <label htmlFor="email">Email address *</label>
          <input
            id="email"
            type="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            {...register("email", { onBlur: handleEmailBlur })}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="error">{errors.email.message}</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" type="tel" {...register("phone")} />
        </div>
      </div>

      <div className="field-group">
        <label htmlFor="location">Location *</label>
        <input
          id="location"
          type="text"
          placeholder="City, Country"
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "location-error" : undefined}
          {...register("location")}
        />
        {errors.location && (
          <p id="location-error" role="alert" className="error">{errors.location.message}</p>
        )}
      </div>

      {/* ── Professional Profiles ── */}
      <div className="field-section-label">Professional Profiles</div>

      <div className="field-group">
        <label htmlFor="linkedIn">LinkedIn URL *</label>
        <input
          id="linkedIn"
          type="url"
          placeholder="https://linkedin.com/in/yourprofile"
          aria-invalid={!!errors.linkedIn}
          aria-describedby={errors.linkedIn ? "linkedIn-error" : undefined}
          {...register("linkedIn")}
        />
        {errors.linkedIn && (
          <p id="linkedIn-error" role="alert" className="error">{errors.linkedIn.message}</p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="github">GitHub URL *</label>
        <input
          id="github"
          type="url"
          placeholder="https://github.com/yourusername"
          aria-invalid={!!errors.github}
          aria-describedby={errors.github ? "github-error" : undefined}
          {...register("github")}
        />
        {errors.github && (
          <p id="github-error" role="alert" className="error">{errors.github.message}</p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="portfolio">Portfolio / Website (optional)</label>
        <input
          id="portfolio"
          type="url"
          placeholder="https://yourportfolio.com"
          aria-invalid={!!errors.portfolio}
          aria-describedby={errors.portfolio ? "portfolio-error" : undefined}
          {...register("portfolio")}
        />
        {errors.portfolio && (
          <p id="portfolio-error" role="alert" className="error">{errors.portfolio.message}</p>
        )}
      </div>

      {/* ── Current Status ── */}
      <div className="field-section-label">Current Status</div>

      <div className="field-group">
        <label htmlFor="currentRole">Current Role / Title (optional)</label>
        <input
          id="currentRole"
          type="text"
          placeholder="e.g. Senior Frontend Engineer"
          {...register("currentRole")}
        />
      </div>

      <div className="field-row">
        <div className="field-group">
          <label htmlFor="noticePeriod">Notice Period *</label>
          <select
            id="noticePeriod"
            aria-invalid={!!errors.noticePeriod}
            aria-describedby={errors.noticePeriod ? "noticePeriod-error" : undefined}
            {...register("noticePeriod")}
          >
            <option value="">Select…</option>
            {NOTICE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          {errors.noticePeriod && (
            <p id="noticePeriod-error" role="alert" className="error">{errors.noticePeriod.message}</p>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="salaryExpectation">Expected Salary (optional)</label>
          <input
            id="salaryExpectation"
            type="text"
            placeholder="e.g. $80,000 – $100,000"
            {...register("salaryExpectation")}
          />
        </div>
      </div>
    </section>
  );
}
