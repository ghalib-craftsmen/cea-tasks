import { useFormContext } from "react-hook-form";
import type { FormData } from "../schema";
import { checkEmailTaken } from "../mockApi";

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
      setError("email", {
        type: "manual",
        message: "This email is already registered",
      });
    } else {
      clearErrors("email");
    }
  };

  return (
    <section aria-labelledby="step1-heading">
      <h2 id="step1-heading">Personal Information</h2>

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
          <p id="firstName-error" role="alert" className="error">
            {errors.firstName.message}
          </p>
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
          <p id="lastName-error" role="alert" className="error">
            {errors.lastName.message}
          </p>
        )}
      </div>

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
          <p id="email-error" role="alert" className="error">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="field-group">
        <label htmlFor="phone">Phone (optional)</label>
        <input id="phone" type="tel" {...register("phone")} />
      </div>
    </section>
  );
}
