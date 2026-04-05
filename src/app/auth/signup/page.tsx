"use client";
import { Suspense } from "react";
import SignUpForm from "./SignUpForm";

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="glass rounded-2xl p-8 animate-pulse">
        <div className="h-8 bg-white/5 rounded mb-4 w-48" />
        <div className="h-4 bg-white/5 rounded mb-8 w-64" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/5 rounded" />)}
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}
