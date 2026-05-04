import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationSchema, stepSchemas } from "./schema";
import type { FormData } from "./schema";
import { submitApplication } from "./mockApi";
import "./App.css";

const STEP_LABELS = ["Personal Info", "Experience", "Review & Submit"];

export default function App() {
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(
    null,
  );

  const methods = useForm<FormData>({
    resolver: zodResolver(applicationSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      yearsOfExperience: 0,
      jobs: [],
      coverLetter: "",
      agreeToTerms: undefined,
    },
  });

  const {
    handleSubmit,
    trigger,
    formState: { isValidating, isSubmitting, errors },
  } = methods;

  const goNext = async () => {
    const fields = Object.keys(stepSchemas[step].shape) as (keyof FormData)[];
    const ok = await trigger(fields);
    if (!ok) {
      const firstErrorKey = Object.keys(errors)[0];
      document.getElementById(firstErrorKey)?.focus();
      return;
    }
    setStep((s) => s + 1);
  };

  const onSubmit = async (data: FormData) => {
    try {
      await submitApplication(data);
      setToast({ ok: true, message: "Application submitted successfully!" });
    } catch {
      setToast({ ok: false, message: "Submission failed — please try again." });
    }
  };

  return (
    <main>
      <nav aria-label="Form progress">
        <ol>
          {STEP_LABELS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined}>
              <span aria-hidden="true">{i + 1}</span> {label}
            </li>
          ))}
        </ol>
      </nav>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {step === 0 && <div>Step 1: Personal Info</div>}
          {step === 1 && <div>Step 2: Experience</div>}
          {step === 2 && <div>Step 3: Review</div>}

          <div className="form-actions">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}>
                Back
              </button>
            )}
            {step < 2 && (
              <button type="button" onClick={goNext} disabled={isValidating}>
                {isValidating ? "Checking…" : "Next"}
              </button>
            )}
            {step === 2 && (
              <button type="submit" disabled={isSubmitting || isValidating}>
                {isSubmitting ? "Submitting…" : "Submit Application"}
              </button>
            )}
          </div>
        </form>
      </FormProvider>

      {toast && (
        <div role="alert">
          {toast.message}{" "}
          <button type="button" onClick={() => setToast(null)}>✕</button>
        </div>
      )}
    </main>
  );
}
