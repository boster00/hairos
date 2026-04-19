"use client";
import { useState, useEffect, useCallback } from "react";
import { ListOrdered, Plus, Loader, Trash2, Pause, Play, ChevronDown, ChevronUp, CheckCircle, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { createClient } from "@/libs/supabase/client";
import { useRouter } from "next/navigation";

function StatusBadge({ status }) {
  const map = {
    active: "bg-green-100 text-green-800",
    paused: "bg-yellow-100 text-yellow-800",
    completed: "bg-blue-100 text-blue-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function ItemStatusIcon({ status }) {
  if (status === "done") return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "failed") return <AlertCircle className="w-4 h-4 text-red-500" />;
  if (status === "processing") return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
  return <Clock className="w-4 h-4 text-gray-400" />;
}

function NewPipelineForm({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [frequencyHours, setFrequencyHours] = useState(24);
  const [icpId, setIcpId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [icps, setIcps] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lines = topicsText.split("\n").map(l => l.trim()).filter(Boolean);
    if (!name.trim()) return setError("Pipeline name is required");
    if (lines.length === 0) return setError("Add at least one topic/keyword");

    setLoading(true);
    setError(null);
    try {
      const items = lines.map(line => {
        // Support "keyword | optional title" format
        const [keyword, ...rest] = line.split("|");
        return { keyword: keyword.trim(), title: rest.join("|").trim() || null };
      });

      const res = await fetch("/api/content-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icp_id: icpId || undefined,
          offer_id: offerId || undefined,
          frequency_hours: parseInt(frequencyHours) || 24,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl p-6 mb-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4">New Pipeline</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-800 rounded p-3 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 Blog Content" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Keywords / Topics * <span className="text-gray-400 font-normal">(one per line, optionally add a title with | separator)</span>
          </label>
          <textarea
            value={topicsText}
            onChange={e => setTopicsText(e.target.value)}
            placeholder={"best CRM for startups\nhow to scale a SaaS business | The Complete Guide to Scaling SaaS\nB2B content marketing strategy"}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Format: keyword | optional title</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cadence</label>
            <select value={frequencyHours} onChange={e => setFrequencyHours(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value={1}>Every hour</option>
              <option value={6}>Every 6 hours</option>
              <option value={12}>Every 12 hours</option>
              <option value={24}>Daily (default)</option>
              <option value={48}>Every 2 days</option>
              <option value={168}>Weekly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ICP</label>
            <select value={icpId} onChange={e => setIcpId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {icps.map(icp => <option key={icp.id} value={icp.id}>{icp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Offer</label>
            <select value={offerId} onChange={e => setOfferId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">None</option>
              {offers.map(offer => <option key={offer.id} value={offer.id}>{offer.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create Pipeline
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function PipelineCard({ pipeline, onDeleted, onToggled }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/content-pipeline/${pipeline.id}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) {} finally {
      setLoadingItems(false);
    }
  }, [pipeline.id]);

  const handleExpand = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if (newExpanded) loadItems();
  };

  useEffect(() => {
    if (expanded) loadItems();
  }, [expanded, pipeline.done_items, pipeline.total_items, loadItems]);

  const handleToggle = async () => {
    setToggling(true);
    const newStatus = pipeline.status === "active" ? "paused" : "active";
    try {
      await fetch(`/api/content-pipeline/${pipeline.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onToggled(pipeline.id, newStatus);
    } catch (e) {} finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this pipeline and all its items? Articles already created will not be deleted.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/content-pipeline/${pipeline.id}`, { method: "DELETE" });
      onDeleted(pipeline.id);
    } catch (e) {} finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{pipeline.name}</h3>
              <StatusBadge status={pipeline.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
              {pipeline.icps?.name && <span>ICP: {pipeline.icps.name}</span>}
              {pipeline.offers?.name && <span>Offer: {pipeline.offers.name}</span>}
              <span>Every {pipeline.frequency_hours >= 24 ? `${pipeline.frequency_hours / 24}d` : `${pipeline.frequency_hours}h`}</span>
              <span>{pipeline.done_items ?? 0} / {pipeline.total_items ?? 0} done</span>
              {pipeline.next_run_at && pipeline.status === "active" && (
                <span>Next: {new Date(pipeline.next_run_at).toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            <button
              onClick={handleToggle}
              disabled={toggling || pipeline.status === "completed"}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {toggling ? <Loader className="w-4 h-4 animate-spin" /> : pipeline.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {pipeline.status === "active" ? "Pause" : pipeline.status === "paused" ? "Resume" : "Done"}
            </button>
            <button onClick={handleDelete} disabled={deleting} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              {deleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={handleExpand} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t">
          {loadingItems ? (
            <div className="flex items-center justify-center py-6">
              <Loader className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-medium text-gray-600 w-8">#</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Keyword</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">Title</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600 w-20">Status</th>
                  <th className="px-4 py-2 text-center font-medium text-gray-600 w-16">Article</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{item.position + 1}</td>
                    <td className="px-4 py-2 font-medium text-gray-900">{item.keyword}</td>
                    <td className="px-4 py-2 text-gray-500">{item.title || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center justify-center gap-1">
                        <ItemStatusIcon status={item.status} />
                        <span className="capitalize text-xs text-gray-500">{item.status}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      {item.article_id ? (
                        <button
                          onClick={() => router.push(`/content-magic/${item.article_id}`)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default function ContentPipelinePage() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-pipeline");
      const data = await res.json();
      if (data.success) setPipelines(data.pipelines || []);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleCreated = async () => {
    setShowForm(false);
    await loadPipelines();
  };

  const handleDeleted = (id) => {
    setPipelines(prev => prev.filter(p => p.id !== id));
  };

  const handleToggled = (id, newStatus) => {
    setPipelines(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListOrdered className="w-6 h-6" />
            Content Pipeline
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Automate article creation — set up a keyword list and let AI create articles on a schedule.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Pipeline
          </button>
        )}
      </div>

      {showForm && (
        <NewPipelineForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : pipelines.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <ListOrdered className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-lg font-medium">No pipelines yet</p>
          <p className="text-sm mt-1">Create a pipeline to start automating article creation</p>
          <button onClick={() => setShowForm(true)} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Create your first pipeline
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map(pipeline => (
            <PipelineCard
              key={pipeline.id}
              pipeline={pipeline}
              onDeleted={handleDeleted}
              onToggled={handleToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
