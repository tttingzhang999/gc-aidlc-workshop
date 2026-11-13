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

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await login(email.trim(), password);
      await explodeOut(cardRef.current);
      toast.success(`Welcome back, ${user.name}`, "Systems online.");
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
      kicker="Access terminal"
      headline="WELCOME BACK."
      subline="Plug back into the orbit. Your orders are waiting."
    >
      <h2 className="font-display text-3xl font-black tracking-tight">Login</h2>
      <p className="mt-1 text-sm text-white/55">
        Enter your credentials to continue.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="login-email"
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          data-testid="login-password"
        />
        {error && (
          <p
            role="alert"
            data-testid="login-error"
            className="rounded-xl border border-neon-red/60 bg-neon-red/10 px-4 py-3 text-sm text-neon-red"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          loading={submitting}
          loadingText="Authenticating…"
          data-testid="login-submit"
        >
          Enter orbit
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-white/55">
        No account yet?{" "}
        <Link
          to="/register"
          state={location.state}
          data-testid="login-to-register"
          className="font-bold text-neon-cyan hover:text-neon-pink"
        >
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
