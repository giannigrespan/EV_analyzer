"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const SOURCE_OPTIONS = [
  { value: "octopus_bill", label: "Bolletta Octopus (mensile)" },
  { value: "wallbox_export", label: "Export Wallbox Silla" },
  { value: "drivvo_export", label: "Export Drivvo" },
  { value: "abrp_export", label: "Export ABRP" },
];

export function ImportUploadForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState("octopus_bill");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato");

      const path = `${user.id}/${sourceType}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("raw-imports")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const registerRes = await fetch("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: path,
          sourceType,
          originalFilename: file.name,
        }),
      });
      if (!registerRes.ok) throw new Error("Registrazione import fallita");
      const { id } = await registerRes.json();

      const processRes = await fetch(`/api/imports/${id}/process`, {
        method: "POST",
      });
      const result = await processRes.json();

      if (result.status === "success") {
        toast.success(`Import completato: ${result.inserted} righe importate.`);
      } else if (result.status === "partial_error") {
        toast.warning(
          `Import parziale: ${result.inserted} righe importate, alcuni errori.`
        );
      } else {
        toast.error("Import fallito. Controlla i dettagli nello storico qui sotto.");
      }

      setFile(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore durante l'upload");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-1.5">
        <Label>Tipo di dato</Label>
        <Select
          value={sourceType}
          onValueChange={(value) => setSourceType(value ?? "octopus_bill")}
        >
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOURCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>File CSV</Label>
        <Input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <Button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? "Caricamento..." : "Carica"}
      </Button>
    </div>
  );
}
