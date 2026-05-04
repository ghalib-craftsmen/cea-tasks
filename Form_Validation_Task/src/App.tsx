import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { applicationSchema, stepSchemas } from "./schema";
import type { FormData } from "./schema";
import { submitApplication } from "./mockApi";
import PersonalInfo from "./components/PersonalInfo";
import Experience from "./components/Experience";
import Review from "./components/Review";
import Toast from "./components/Toast";
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
      location: "",
      linkedIn: "",
      github: "",
      portfolio: "",
      currentRole: "",
      noticePeriod: "",
      salaryExpectation: "",
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
    <>
      <header className="page-header">
        <div className="page-header__brand">
          <img src="/brand/logo.png" alt="" className="page-header__icon" />
          <div className="page-header__text">
            <span className="page-header__name">Craftsmen</span>
            <span className="page-header__tagline">Software Maestros.</span>
          </div>
        </div>
      </header>

      <main>
        <div className="form-title">
          <h1>Join Our Team</h1>
          <p>Complete the form below and we'll be in touch shortly.</p>
        </div>

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
            {step === 0 && <PersonalInfo />}
            {step === 1 && <Experience />}
            {step === 2 && <Review />}

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
          <Toast
            ok={toast.ok}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </main>
    </>
  );
}
