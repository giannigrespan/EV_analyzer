import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const VALID_SOURCE_TYPES = [
  "octopus_bill",
  "wallbox_export",
  "drivvo_export",
  "abrp_export",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { storagePath, sourceType, originalFilename } = body as {
    storagePath?: string;
    sourceType?: string;
    originalFilename?: string;
  };

  if (!storagePath || !sourceType || !VALID_SOURCE_TYPES.includes(sourceType)) {
    return NextResponse.json(
      { error: "Missing or invalid storagePath/sourceType" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("raw_imports")
    .insert({
      user_id: user.id,
      source_type: sourceType,
      storage_path: storagePath,
      original_filename: originalFilename,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
