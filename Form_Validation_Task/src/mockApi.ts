const TAKEN_EMAILS = ["taken@example.com", "admin@test.com"];

export async function checkEmailTaken(email: string): Promise<boolean> {
  await new Promise((r) => setTimeout(r, 500));
  return TAKEN_EMAILS.includes(email.toLowerCase());
}

export async function submitApplication(data: unknown): Promise<void> {
  await new Promise((r) => setTimeout(r, 1000));
  if (Math.random() < 0.3) throw new Error("Server error");
  console.log("Submitted:", data);
}
