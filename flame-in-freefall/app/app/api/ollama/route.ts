import { OLLAMA_URL, ollamaModel } from "@/lib/ask";

export const dynamic = "force-dynamic";

/** GET → { online, model, modelInstalled } — is the local Ollama up and is our model pulled? */
export async function GET() {
  const model = ollamaModel();
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (!res.ok) return Response.json({ online: false, model, modelInstalled: false });
    const { models = [] } = (await res.json()) as { models?: { name: string }[] };
    const names = models.map((m) => m.name);
    const modelInstalled = names.includes(model) || names.includes(`${model}:latest`);
    return Response.json({ online: true, model, modelInstalled });
  } catch {
    return Response.json({ online: false, model, modelInstalled: false });
  }
}
