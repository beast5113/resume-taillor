import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { requireSession } from "@/lib/auth";
import { isAdminRole, scopeOwned } from "@/lib/access";

export async function GET() {
  const session = await requireSession();
  if (!session || !isAdminRole(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const query = scopeOwned(
    session,
    supabase.from("prompts").select("*").order("created_at", { ascending: false })
  );
  const { data, error } = await query;

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await requireSession();
  if (!session || !isAdminRole(session)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  let name: string;
  let content: string;

  try {
    ({ name, content } = await request.json());
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ message: "Prompt name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("prompts")
    .insert({ name: name.trim(), content: content ?? "", owner_id: session.userId })
    .select()
    .single();

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
