import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "python",
        version: "3.10.0",
        files: [{ name: "main.py", content: "print('Hello from Piston!')" }],
        stdin: "",
      }),
    });
    const text = await res.text();
    return NextResponse.json({ status: res.status, ok: res.ok, body: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}