import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { ResumeData, DEFAULT_RESUME_DATA } from "@/lib/types";

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  let name: string;
  let resume_data: ResumeData;

  try {
    ({ name, resume_data } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ message: "Profile name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({ name: name.trim(), resume_data: resume_data ?? DEFAULT_RESUME_DATA })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
