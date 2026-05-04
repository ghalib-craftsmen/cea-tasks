import { useFormContext, useFieldArray } from "react-hook-form";
import type { FormData } from "../schema";

export default function Experience() {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<FormData>();
  const { fields, append, remove } = useFieldArray({ control, name: "jobs" });

  return (
    <section aria-labelledby="step2-heading">
      <h2 id="step2-heading">Work Experience</h2>

      <div className="field-group">
        <label htmlFor="yearsOfExperience">Years of experience *</label>
        <input
          id="yearsOfExperience"
          type="number"
          min={0}
          aria-invalid={!!errors.yearsOfExperience}
          aria-describedby={errors.yearsOfExperience ? "yoe-error" : undefined}
          {...register("yearsOfExperience", { valueAsNumber: true })}
        />
        {errors.yearsOfExperience && (
          <p id="yoe-error" role="alert" className="error">
            {errors.yearsOfExperience.message}
          </p>
        )}
      </div>

      <fieldset>
        <legend>Previous Jobs</legend>

        {fields.map((field, index) => (
          <div key={field.id} className="job-row">
            <div className="field-group">
              <label htmlFor={`jobs.${index}.company`}>Company *</label>
              <input
                id={`jobs.${index}.company`}
                type="text"
                aria-invalid={!!errors.jobs?.[index]?.company}
                aria-describedby={
                  errors.jobs?.[index]?.company
                    ? `jobs-${index}-company-error`
                    : undefined
                }
                {...register(`jobs.${index}.company`)}
              />
              {errors.jobs?.[index]?.company && (
                <p id={`jobs-${index}-company-error`} role="alert" className="error">
                  {errors.jobs[index].company?.message}
                </p>
              )}
            </div>

            <div className="field-group">
              <label htmlFor={`jobs.${index}.title`}>Job title *</label>
              <input
                id={`jobs.${index}.title`}
                type="text"
                aria-invalid={!!errors.jobs?.[index]?.title}
                {...register(`jobs.${index}.title`)}
              />
              {errors.jobs?.[index]?.title && (
                <p role="alert" className="error">
                  {errors.jobs[index].title?.message}
                </p>
              )}
            </div>

            <div className="field-row">
              <div className="field-group">
                <label htmlFor={`jobs.${index}.startDate`}>Start date *</label>
                <input
                  id={`jobs.${index}.startDate`}
                  type="date"
                  aria-invalid={!!errors.jobs?.[index]?.startDate}
                  {...register(`jobs.${index}.startDate`)}
                />
                {errors.jobs?.[index]?.startDate && (
                  <p role="alert" className="error">
                    {errors.jobs[index].startDate?.message}
                  </p>
                )}
              </div>

              <div className="field-group">
                <label htmlFor={`jobs.${index}.endDate`}>End date *</label>
                <input
                  id={`jobs.${index}.endDate`}
                  type="date"
                  aria-invalid={!!errors.jobs?.[index]?.endDate}
                  {...register(`jobs.${index}.endDate`)}
                />
                {errors.jobs?.[index]?.endDate && (
                  <p role="alert" className="error">
                    {errors.jobs[index].endDate?.message}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove job ${index + 1}`}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            append({ company: "", title: "", startDate: "", endDate: "" })
          }
        >
          + Add previous job
        </button>
      </fieldset>
    </section>
  );
}
