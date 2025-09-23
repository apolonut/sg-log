import React, { useState } from "react";
import { auth } from "@/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const signIn = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      setErr(e.message);
    }
  };

  const register = async () => {
    setErr("");
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      setErr(e.message);
    }
  };

  const reset = async () => {
    if (!email) return setErr("Въведи email за възстановяване.");
    try {
      await sendPasswordResetEmail(auth, email);
      setErr("Изпратихме линк за нулиране на парола.");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={signIn} className="w-full max-w-sm space-y-3 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Вход</h1>
        <input
          className="input input-bordered w-full"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className="input input-bordered w-full"
          type="password"
          placeholder="Парола"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          autoComplete="current-password"
        />
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn btn-primary w-full" type="submit">Вход</button>
        <button type="button" className="btn btn-outline w-full" onClick={register}>Регистрация</button>
        <button type="button" className="btn btn-ghost w-full" onClick={reset}>Забравена парола</button>
      </form>
    </div>
  );
}
