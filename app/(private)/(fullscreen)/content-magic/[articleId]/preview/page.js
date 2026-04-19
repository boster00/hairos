import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import ContentMagicArticlePreview from "@/app/(private)/(shell)/content-magic/components/ContentMagicArticlePreview";

export default async function ArticlePreviewPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const articleId = params.articleId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>Not authenticated</div>;
  }

  const { data: article, error } = await supabase
    .from("content_magic_articles")
    .select("*")
    .eq("id", articleId)
    .eq("user_id", user.id)
    .single();

  if (error || !article) {
    notFound();
  }

  return (
    <Suspense>
      <ContentMagicArticlePreview article={article} />
    </Suspense>
  );
}
