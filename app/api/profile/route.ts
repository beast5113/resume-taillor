import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  let name: string;
  try {
    ({ name } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ message: "name is required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", existing.id)
      .select("id, name")
      .single();
  } else {
    result = await supabase
      .from("profiles")
      .insert({ name: name.trim() })
      .select("id, name")
      .single();
  }

  if (result.error) return NextResponse.json({ message: result.error.message }, { status: 500 });
  return NextResponse.json(result.data);
}
