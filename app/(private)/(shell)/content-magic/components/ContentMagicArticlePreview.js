"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ContentMagicEditor from "./ContentMagicEditor";
import { WritingGuideProvider, useWritingGuide } from "@/libs/content-magic/context/WritingGuideContext";
import {
  getCustomCssModeFromCookie,
  setCustomCssModeCookie,
} from "@/libs/content-magic/utils/customCssModeCookie";

function PreviewBody({ customCssEnabled, setCustomCssEnabled }) {
  const { article: articleState, setEditorRef } = useWritingGuide();
  const editorRef = useRef(null);

  const handleEditorReady = useCallback(
    (ref) => {
      editorRef.current = ref;
      setEditorRef(ref);
    },
    [setEditorRef]
  );

  useEffect(() => {
    const fromCookie = getCustomCssModeFromCookie();
    if (!fromCookie) {
      setCustomCssEnabled(false);
      return;
    }
    const t = setTimeout(() => {
      const editor = editorRef.current;
      if (editor?.prepareAndEnableCustomCss) {
        editor.prepareAndEnableCustomCss();
      } else {
        setCustomCssEnabled(true);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [setCustomCssEnabled]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 p-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <p className="text-xs text-gray-500 sm:mr-auto order-2 sm:order-1">
          Preview shows saved content. Save in the editor to update this view.
        </p>
        <Link
          href={`/content-magic/${articleState.id}`}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors order-1 sm:order-2 self-end sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to editor
        </Link>
      </header>

      <div className="flex-1 flex flex-col min-h-0 w-full max-w-[100vw]">
        <ContentMagicEditor
          ref={handleEditorReady}
          onChange={() => {}}
          customCssEnabled={customCssEnabled}
          onCustomCssChange={setCustomCssEnabled}
          previewMode
        />
      </div>
    </div>
  );
}

export default function ContentMagicArticlePreview({ article }) {
  const [customCssEnabled, setCustomCssEnabledState] = useState(false);
  const setCustomCssEnabled = useCallback((next) => {
    setCustomCssEnabledState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      setCustomCssModeCookie(!!value);
      return value;
    });
  }, []);

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Geist:wght@100;200;300;400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      <WritingGuideProvider article={article} customCssEnabled={customCssEnabled}>
        <PreviewBody customCssEnabled={customCssEnabled} setCustomCssEnabled={setCustomCssEnabled} />
      </WritingGuideProvider>
    </>
  );
}
