import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  type OpenAILanguageModelResponsesOptions,
  openai,
} from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { wrapLanguageModel } from "ai";

// When LLM_BASE_URL is set the agents talk to an OpenAI-compatible gateway
// (e.g. the self-hosted DeepSeek cluster) instead of OpenAI. LLM_FALLBACK_*
// names a second model that takes over when the primary call fails before it
// starts answering (gateway down, model restarting, 5xx).
const gatewayUrl = process.env.LLM_BASE_URL;
const PROVIDER = "gateway";

function gatewayModel(baseURL: string, modelId: string, apiKey?: string) {
  return createOpenAICompatible({
    apiKey: apiKey || undefined,
    baseURL,
    includeUsage: true,
    name: PROVIDER,
  }).chatModel(modelId);
}

type Model = ReturnType<typeof gatewayModel>;

function withFallback(primary: Model, fallback: Model): Model {
  const warn = (err: unknown) =>
    console.warn(
      `LLM ${primary.modelId} failed, falling back to ${fallback.modelId}:`,
      err instanceof Error ? err.message : err
    );
  return Object.assign(Object.create(Object.getPrototypeOf(primary)), primary, {
    async doGenerate(options: Parameters<Model["doGenerate"]>[0]) {
      try {
        return await primary.doGenerate(options);
      } catch (err) {
        warn(err);
        return fallback.doGenerate(options);
      }
    },
    async doStream(options: Parameters<Model["doStream"]>[0]) {
      try {
        return await primary.doStream(options);
      } catch (err) {
        warn(err);
        return fallback.doStream(options);
      }
    },
  });
}

function createBase() {
  if (!gatewayUrl) {
    return openai("gpt-5.6-luna");
  }
  const primary = gatewayModel(
    gatewayUrl,
    process.env.LLM_MODEL ?? "deepseek-v4.1-flash",
    process.env.LLM_API_KEY
  );
  const fallbackModel = process.env.LLM_FALLBACK_MODEL;
  if (!fallbackModel) {
    return primary;
  }
  return withFallback(
    primary,
    gatewayModel(
      process.env.LLM_FALLBACK_BASE_URL ?? gatewayUrl,
      fallbackModel,
      process.env.LLM_FALLBACK_API_KEY ?? process.env.LLM_API_KEY
    )
  );
}

const base = createBase();

export const model =
  process.env.NODE_ENV === "development"
    ? wrapLanguageModel({ middleware: devToolsMiddleware(), model: base })
    : base;

// Thinking mode: medium reasoning effort. OpenAI streams condensed summaries;
// the gateway streams the model's reasoning_content. Both render as
// reasoning parts (Reasoning component).
export const reasoningProviderOptions = {
  [PROVIDER]: { reasoningEffort: "medium" },
  openai: {
    reasoningEffort: "medium",
    reasoningSummary: "auto",
  } satisfies OpenAILanguageModelResponsesOptions,
};
