"use client";
import { useState, useEffect, useRef } from "react";
import { X, Zap, Loader, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/libs/supabase/client";

const LOADING_MESSAGES = [
  "Warming up the research engines...",
  "Scouting the competitive landscape...",
  "Interviewing the SERPs for clues...",
  "Unearthing long-tail opportunities...",
  "Running keywords through the relevance filter...",
  "Mapping content gaps against your ICP...",
  "Sketching the article outline...",
  "Putting words to work...",
];

export default function FullAgenticModal({ isOpen, onClose }) {
  const router = useRouter();
  const [step, setStep] = useState("form"); // form | loading | done | error
  const [title, setTitle] = useState("");
  const [mainKeyword, setMainKeyword] = useState("");
  const [icpId, setIcpId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [icps, setIcps] = useState([]);
  const [offers, setOffers] = useState([]);
  const [phaseMessage, setPhaseMessage] = useState("");
  const [rotatingMsg, setRotatingMsg] = useState(LOADING_MESSAGES[0]);
  const [articleId, setArticleId] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const rotateRef = useRef(null);
  const msgIndexRef = useRef(0);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      Promise.all([
        supabase.from("icps").select("id, name").eq("user_id", user.id).eq("status", "active"),
        supabase.from("offers").select("id, name").eq("user_id", user.id),
      ]).then(([icpRes, offerRes]) => {
        setIcps(icpRes.data || []);
        setOffers(offerRes.data || []);
      });
    });
  }, [isOpen]);

  useEffect(() => {
    if (step !== "loading") {
      clearInterval(rotateRef.current);
      return;
    }
    rotateRef.current = setInterval(() => {
      msgIndexRef.current = (msgIndexRef.current + 1) % LOADING_MESSAGES.length;
      setRotatingMsg(LOADING_MESSAGES[msgIndexRef.current]);
    }, 4000);
    return () => clearInterval(rotateRef.current);
  }, [step]);

  const startPolling = (id) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/content-magic/full-agentic/status?articleId=${id}`);
        const data = await res.json();
        if (data.phaseMessage) setPhaseMessage(data.phaseMessage);
        if (data.isDone) {
          clearInterval(pollRef.current);
          setStep("done");
        }
      } catch (e) {}
    }, 3000);
  };

  const handleStart = async () => {
    if (!mainKeyword.trim()) return;
    setError(null);
    setStep("loading");
    setPhaseMessage("Starting full agentic creation...");
    try {
      const res = await fetch("/api/content-magic/full-agentic/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          mainKeyword: mainKeyword.trim(),
          icp_id: icpId || undefined,
          offer_id: offerId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.articleId) throw new Error(data.error || "Failed to start");
      setArticleId(data.articleId);
      startPolling(data.articleId);
    } catch (e) {
      setError(e.message);
      setStep("error");
    }
  };

  const handleClose = () => {
    clearInterval(pollRef.current);
    clearInterval(rotateRef.current);
    setStep("form");
    setTitle("");
    setMainKeyword("");
    setIcpId("");
    setOfferId("");
    setPhaseMessage("");
    setArticleId(null);
    setError(null);
    onClose();
  };

  const handleOpenArticle = () => {
    handleClose();
    router.push(`/content-magic/${articleId}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={handleClose}
          disabled={step === "loading"}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded disabled:opacity-30"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-100 rounded-lg p-2">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Full Agentic Creation</h2>
            <p className="text-sm text-gray-500">AI handles everything from research to draft</p>
          </div>
        </div>

        {step === "form" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Main Keyword <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={mainKeyword}
                onChange={(e) => setMainKeyword(e.target.value)}
                placeholder="e.g. best CRM for startups"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Article Title <span className="text-gray-400 text-xs">(optional — AI will generate one if blank)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The 10 Best CRMs for Startups in 2025"
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ICP</label>
                <select
                  value={icpId}
                  onChange={(e) => setIcpId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">None</option>
                  {icps.map((icp) => (
                    <option key={icp.id} value={icp.id}>{icp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Offer</label>
                <select
                  value={offerId}
                  onChange={(e) => setOfferId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="">None</option>
                  {offers.map((offer) => (
                    <option key={offer.id} value={offer.id}>{offer.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800">
              <strong>What happens next:</strong> The AI will research competitors, discover relevant keywords, evaluate them against your ICP, then generate a complete article draft. You can edit it freely once done.
            </div>

            <button
              onClick={handleStart}
              disabled={!mainKeyword.trim()}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              <Zap className="w-4 h-4" />
              Start Agentic Creation
            </button>
          </div>
        )}

        {step === "loading" && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-4">
              <Loader className="w-12 h-12 text-purple-600 animate-spin" />
            </div>
            <p className="font-medium text-gray-900 mb-2">
              {phaseMessage || "Working on your article..."}
            </p>
            <p className="text-sm text-gray-400 italic transition-all duration-500">
              {rotatingMsg}
            </p>
            <p className="text-xs text-gray-400 mt-4">
              This usually takes 1–3 minutes. You can close this dialog and we'll keep working in the background.
            </p>
          </div>
        )}

        {step === "done" && (
          <div className="py-6 text-center">
            <div className="flex justify-center mb-3">
              <CheckCircle className="w-14 h-14 text-green-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Article Ready!</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your article has been researched and drafted. Open it to review and refine.
            </p>
            <button
              onClick={handleOpenArticle}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              Open Article
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="py-6 text-center">
            <div className="flex justify-center mb-3">
              <AlertCircle className="w-14 h-14 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Something went wrong</h3>
            <p className="text-sm text-gray-500 mb-2">{error}</p>
            <button
              onClick={() => setStep("form")}
              className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
