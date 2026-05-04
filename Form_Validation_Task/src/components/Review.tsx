import { useFormContext } from "react-hook-form";
import type { FormData } from "../schema";

export default function Review() {
  const {
    register,
    getValues,
    formState: { errors },
  } = useFormContext<FormData>();
  const values = getValues();

  return (
    <section aria-labelledby="step3-heading">
      <h2 id="step3-heading">Review &amp; Submit</h2>

      <div className="review-summary">
        <h3>Personal Info</h3>
        <p>
          <strong>Name:</strong> {values.firstName} {values.lastName}
        </p>
        <p>
          <strong>Email:</strong> {values.email}
        </p>
        {values.phone && (
          <p>
            <strong>Phone:</strong> {values.phone}
          </p>
        )}

        <h3>Experience</h3>
        <p>
          <strong>Years of experience:</strong> {values.yearsOfExperience}
        </p>
        {values.jobs.length > 0 && (
          <ul>
            {values.jobs.map((job, i) => (
              <li key={i}>
                {job.title} at {job.company} ({job.startDate} – {job.endDate})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="coverLetter">Cover letter (optional)</label>
        <textarea id="coverLetter" rows={5} {...register("coverLetter")} />
      </div>

      <div className="field-group field-group--checkbox">
        <input
          id="agreeToTerms"
          type="checkbox"
          aria-invalid={!!errors.agreeToTerms}
          aria-describedby={errors.agreeToTerms ? "terms-error" : undefined}
          {...register("agreeToTerms")}
        />
        <label htmlFor="agreeToTerms">
          I confirm the information provided is accurate *
        </label>
        {errors.agreeToTerms && (
          <p id="terms-error" role="alert" className="error">
            {errors.agreeToTerms.message}
          </p>
        )}
      </div>
    </section>
  );
}
