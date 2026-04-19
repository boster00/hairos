import { Suspense } from "react";
import ContentMagicArticlePage from "../components/ContentMagicArticlePage";
import ContentMagicList from "../components/ContentMagicList";
import ContentMagicWizard from "../components/ContentMagicWizard";
import { createClient } from "@/libs/supabase/server";
import { createServiceRoleClient } from "@/libs/supabase/serviceRole";
import { getDevFakeArticleById } from "@/libs/content-magic/devFakeArticles";

export default async function Page({ params: paramsPromise }) {
    const params = await paramsPromise;
    const slug = params.slug?.[0];

    // If no slug, show the list
    if (!slug) {
        return (
            <Suspense>
                <ContentMagicList />
            </Suspense>
        );
    }

    // If "new", show the wizard
    if (slug === "new") {
        return (
            <Suspense>
                <ContentMagicWizard />
            </Suspense>
        );
    }

    // Otherwise, fetch and show article detail page
    const fakeAuth = process.env.CJGEO_DEV_FAKE_AUTH === "1";
    let article;
    let error;

    if (fakeAuth) {
        try {
            const svc = createServiceRoleClient();
            const res = await svc
                .from("content_magic_articles")
                .select("*")
                .eq("id", slug)
                .maybeSingle();
            article = res.data;
            error = res.error;
        } catch {
            article = null;
            error = null;
        }
        if (!article) {
            article = getDevFakeArticleById(slug);
            error = article ? null : { message: "not found" };
        }
    } else {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return <div>Not authenticated</div>;
        }
        const res = await supabase
            .from("content_magic_articles")
            .select("*")
            .eq("id", slug)
            .eq("user_id", user.id)
            .single();
        article = res.data;
        error = res.error;
    }

    if (error || !article) {
        return <div>Article not found</div>;
    }

    return (
        <Suspense>
            <ContentMagicArticlePage article={article} />
        </Suspense>
    );
}