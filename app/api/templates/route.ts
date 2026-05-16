import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, config, created_at, updated_at")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  let body: { name?: string; config?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) return NextResponse.json({ message: "Name is required" }, { status: 400 });
  if (!body.config)        return NextResponse.json({ message: "Config is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("templates")
    .insert({ name: body.name.trim(), config: body.config })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
