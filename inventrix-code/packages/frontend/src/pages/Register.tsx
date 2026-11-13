import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { explodeOut } from "../fx/explodeOut";
import { shake } from "../fx/shake";
import { toApiError } from "../lib/api";
import { readRedirect } from "../lib/redirect";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useToast } from "../ui/Toast";

const RECOMMENDED_PASSWORD_LENGTH = 8;

function PasswordMeter({ length }: { length: number }) {
  const ratio = Math.min(1, length / RECOMMENDED_PASSWORD_LENGTH);
  const color =
    ratio < 0.5 ? "bg-neon-red" : ratio < 1 ? "bg-neon-orange" : "bg-neon-lime";
  return (
    <span className="flex flex-col gap-1.5">
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <span
          className={`block h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </span>
      <span>
        {length >= RECOMMENDED_PASSWORD_LENGTH
          ? "Strong enough to launch."
          : `Use at least ${RECOMMENDED_PASSWORD_LENGTH} characters (${length}/${RECOMMENDED_PASSWORD_LENGTH}).`}
      </span>
    </span>
  );
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await register(email.trim(), password, name.trim());
      await explodeOut(cardRef.current);
      toast.success(`Welcome aboard, ${user.name}`, "Your account is live.");
      navigate(readRedirect(location.state), { replace: true });
    } catch (err: unknown) {
      setError(toApiError(err).message);
      shake(cardRef.current);
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      ref={cardRef}
      kicker="New pilot"
      headline="JOIN THE ORBIT."
      subline="One account. Infinite neon. Zero boring checkouts."
    >
      <h2 className="font-display text-3xl font-black tracking-tight">
        Register
      </h2>
      <p className="mt-1 text-sm text-white/55">
        Create your account to start launching orders.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Input
          label="Full name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          data-testid="register-name"
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="register-email"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          hint={<PasswordMeter length={password.length} />}
          data-testid="register-password"
        />
        {error && (
          <p
            role="alert"
            data-testid="register-error"
            className="rounded-xl border border-neon-red/60 bg-neon-red/10 px-4 py-3 text-sm text-neon-red"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          loadingText="Creating pilot…"
          data-testid="register-submit"
        >
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-white/55">
        Already flying with us?{" "}
        <Link
          to="/login"
          state={location.state}
          data-testid="register-to-login"
          className="font-bold text-neon-cyan hover:text-neon-pink"
        >
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
