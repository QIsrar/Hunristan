"use client";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPassword() {
  return (
    <Suspense fallback={
      <div className="glass rounded-2xl p-8 text-center animate-slide-up max-w-md w-full mx-auto">
        <div className="h-12 w-12 bg-accent/10 rounded-xl mx-auto mb-6 animate-pulse" />
        <div className="h-6 bg-accent/10 rounded mb-4 w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-accent/10 rounded w-full animate-pulse" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
