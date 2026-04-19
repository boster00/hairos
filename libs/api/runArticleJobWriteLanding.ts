import { runTask } from "@/libs/monkey/index";
import type { MonkeyTaskRequest, MonkeyTaskResponse } from "@/libs/monkey/references/types";
import { MarketingPageType } from "@/libs/monkey/references/pageTypes/registry";

function buildQuery(title: string, prompt: string, mainKeyword: string) {
  return [
    `Generate a full scientific / technical landing-style article page.`,
    `Title: ${title}`,
    `Main SEO keyword (use naturally throughout): ${mainKeyword}`,
    ``,
    `Instructions and source context:`,
    prompt,
  ].join("\n");
}

/**
 * Runs WRITE_ARTICLE_LANDING to completion (multi-step) for server-side article_jobs.
 */
export async function runWriteArticleLandingForJob(params: {
  title: string;
  prompt: string;
  mainKeyword: string;
}): Promise<{ html: string } | { error: string }> {
  const { title, prompt, mainKeyword } = params;
  const query = buildQuery(title, prompt, mainKeyword);

  let runId: string | undefined;
  let nextStep: number | null | undefined = 1;
  let last: MonkeyTaskResponse | null = null;

  const baseUserInput = {
    articleType: "LANDING" as const,
    pageType: MarketingPageType.BASE_UNIVERSAL,
    query,
  };

  const maxSteps = 20;
  for (let i = 0; i < maxSteps; i++) {
    const userInput: Record<string, unknown> = { ...baseUserInput, query };
    if (runId && typeof nextStep === "number" && nextStep > 1) {
      userInput.runId = runId;
      userInput.stepIndex = nextStep;
    }

    const request: MonkeyTaskRequest = {
      model: "high",
      taskType: "WRITE_ARTICLE_LANDING",
      campaignContext: {
        offer: { name: title, description: prompt },
        pageType: MarketingPageType.BASE_UNIVERSAL,
      },
      userInput: userInput as MonkeyTaskRequest["userInput"],
      constraints: {
        tone: "scientific",
      },
      outputFormat: "html",
    };

    const res = await runTask(request, {});
    last = res;

    if (!res.ok) {
      const msg = res.errors?.[0]?.message || "Pipeline failed";
      return { error: msg };
    }

    runId = res.runId || runId;
    if (res.output?.html && typeof res.output.html === "string" && res.output.html.length > 0) {
      return { html: res.output.html };
    }

    nextStep = res.meta?.nextStep;
    if (nextStep == null || nextStep === undefined) {
      if (res.output?.html) {
        return { html: res.output.html as string };
      }
      return { error: "Pipeline finished without HTML output" };
    }
  }

  return { error: last?.errors?.[0]?.message || "Exceeded max pipeline steps" };
}
