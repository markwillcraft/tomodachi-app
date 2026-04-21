import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <SignIn />
    </div>
  );
}
