"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import ApartmentCard from "@/components/ApartmentCard";
import { ScoredApartment, FeedbackMap, FeedbackTag } from "@/lib/types";
import { buildFeedbackSummary, SEARCH_INTERVAL_MS } from "@/lib/constants";
import { subscribeToPush, unsubscribeFromPush, getSubscriptionStatus } from "@/lib/push";

const LS = {
  get: <T,>(k: string): T | null => { if (typeof window === "undefined") return null; try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (k: string, v: unknown) => { if (typeof window === "undefined") return; try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

export default function Home() {
  const [screen, setScreen] = useState<"setup"|"hunting">("setup");
  const [query, setQuery] = useState("");
  const [savedQuery, setSavedQuery] = useState("");
  const [results, setResults] = useState<ScoredApartment[]>([]);
  const [newAlerts, setNewAlerts] = useState<ScoredApartment[]>([]);
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [insights, setInsights] = useState("");
  const [showInsights, setShowInsights] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearched, setLastSearched] = useState<Date|null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState<string|null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const autoRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const cdRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    const q = LS.get<string>("apt_query");
    const fb = LS.get<FeedbackMap>("apt_feedback");
    const res = LS.get<ScoredApartment[]>("apt_results");
    const ins = LS.get<string>("apt_insights");
    if (q) { setSavedQuery(q); setQuery(q); setScreen("hunting"); }
    if (fb) setFeedback(fb);
    if (res) setResults(res);
    if (ins) setInsights(ins);
    getSubscriptionStatus().then(setPushEnabled);
  }, []);

  useEffect(() => {
    if (autoRef.current) clearInterval(autoRef.current);
    if (cdRef.current) clearInterval(cdRef.current);
    if (autoEnabled && screen === "hunting") {
      setCountdown(SEARCH_INTERVAL_MS / 1000);
      cdRef.current = setInterval(() => setCountdown(c => c <= 1 ? SEARCH_INTERVAL_MS / 1000 : c - 1), 1000);
      autoRef.current = setInterval(() => runSearch(), SEARCH_INTERVAL_MS);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); if (cdRef.current) clearInterval(cdRef.current); };
  }, [autoEnabled, screen]); // eslint-disable-line

  const runSearch = useCallback(async () => {
    if (isSearching) return;
    const q = savedQuery || LS.get<string>("apt_query");
    if (!q) return;
    setIsSearching(true); setError(null);
    const fb = LS.get<FeedbackMap>("apt_feedback") || {};
    const ins = LS.get<string>("apt_insights") || "";
    try {
      const res = await fetch("/api/search", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userQuery: q, feedbackSummary: buildFeedbackSummary(fb), previousInsights: ins }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const fresh: ScoredApartment[] = (data.apartments || []).map((a: ScoredApartment) => a);
      const prevSeen = LS.get<string[]>("apt_seen") || [];
      const seenSet = new Set(prevSeen);
      const newOnes = fresh.filter(a => !seenSet.has(a.id));
      const updatedSeen = [...seenSet, ...fresh.map(a => a.id)];
      LS.set("apt_seen", updatedSeen);

      setResults(prev => {
        const merged = [...newOnes, ...prev].slice(0, 60);
        LS.set("apt_results", merged);
        return merged;
      });
      if (newOnes.length > 0) setNewAlerts(prev => [...newOnes, ...prev].slice(0, 20));
      if (data.learned_insights) { setInsights(data.learned_insights); LS.set("apt_insights", data.learned_insights); }
      setLastSearched(new Date());
      setSearchCount(c => c + 1);
    } catch (e: any) { setError(e.message); } finally { setIsSearching(false); }
  }, [isSearching, savedQuery]);

  const handleStart = () => {
    if (!query.trim()) return;
    setSavedQuery(query.trim()); LS.set("apt_query", query.trim());
    setScreen("hunting"); setTimeout(runSearch, 200);
  };

  const handleFeedback = (id: string, tag: FeedbackTag) => {
    setFeedback(prev => {
      const cur = prev[id] || [];
      const next = { ...prev, [id]: cur.includes(tag) ? cur.filter(t => t !== tag) : [...cur, tag] };
      LS.set("apt_feedback", next); return next;
    });
  };

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) { await unsubscribeFromPush(); setPushEnabled(false); }
      else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { setError("מפתח VAPID לא מוגדר"); return; }
        const ok = await subscribeToPush(vapidKey, savedQuery);
        setPushEnabled(ok);
        if (!ok) setError("אישור התראות נדחה או לא נתמך");
      }
    } finally { setPushLoading(false); }
  };

  const fmtCD = (s: number) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  if (screen === "setup") return (
    <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>🏠</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: 8 }}>סוכן חיפוש דירות</h1>
          <p style={{ color: "#64748b", fontSize: 14 }}>ספר לי מה אתה מחפש — אחפש ואתריע כשמצאתי</p>
        </div>
        <div style={{ background: "#161f30", borderRadius: 20, padding: "24px 20px", border: "1px solid #1e293b" }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8", display: "block", marginBottom: 10 }}>📝 תאר את הדירה</label>
          <textarea value={query} onChange={e => setQuery(e.target.value)}
            placeholder={"לדוגמה:\nדירת 3 חדרים בתל אביב, אזור הצפון הישן\nעד 8,000 ש״ח, עם חניה ומעלית"}
            rows={5}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid #1e293b", background: "#0c1220", color: "#e2e8f0", fontSize: 16, lineHeight: 1.6, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
            {["3 חד׳ בת״א עד 8,000₪", "2 חד׳ ירושלים עד 6,500₪", "4 חד׳ הרצליה עם גינה"].map(ex => (
              <button key={ex} onClick={() => setQuery(ex)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 20, border: "1px solid #334155", background: "transparent", color: "#64748b", cursor: "pointer" }}>{ex}</button>
            ))}
          </div>
          <button onClick={handleStart} disabled={!query.trim()}
            style={{ marginTop: 18, width: "100%", padding: "15px 24px", borderRadius: 12, border: "none", background: query.trim() ? "linear-gradient(135deg,#16a34a,#2563eb)" : "#1e293b", color: query.trim() ? "white" : "#475569", fontSize: 16, fontWeight: 700, cursor: query.trim() ? "pointer" : "not-allowed" }}>
            🚀 התחל לחפש
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100dvh" }}>
      <div className="safe-top" style={{ background: "#161f30", borderBottom: "1px solid #1e293b", padding: "12px 16px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: 22 }}>🏠</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>סוכן דירות</div>
              <div style={{ fontSize: 11, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lastSearched ? `עודכן ${lastSearched.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}` : "ממתין"}
                {searchCount > 0 && ` · ${searchCount} חיפושים`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button onClick={runSearch} disabled={isSearching}
              style={{ padding: "10px 16px", borderRadius: 20, border: "none", fontSize: 13, fontWeight: 700, cursor: isSearching ? "not-allowed" : "pointer", background: isSearching ? "#1e293b" : "linear-gradient(135deg,#16a34a,#2563eb)", color: isSearching ? "#475569" : "white", display: "flex", alignItems: "center", gap: 5 }}>
              {isSearching ? <span style={{ animation: "spin 1s linear infinite" }}>⟳</span> : "🔍 חפש"}
            </button>
            <button onClick={() => setShowMenu(v => !v)} style={{ padding: "10px 12px", borderRadius: 20, border: "1px solid #334155", background: "transparent", color: "#94a3b8", fontSize: 16, cursor: "pointer" }}>⋯</button>
          </div>
        </div>
      </div>

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{ position: "sticky", top: 60, zIndex: 95, maxWidth: 680, margin: "0 auto", padding: "0 16px" }}>
            <div style={{ background: "#161f30", border: "1px solid #1e293b", borderRadius: 14, padding: 6, boxShadow: "0 8px 20px rgba(0,0,0,0.3)", animation: "slideDown 0.2s ease" }}>
              <button onClick={togglePush} disabled={pushLoading}
                style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", color: pushEnabled ? "#4ade80" : "#e2e8f0", fontSize: 14, fontWeight: 600, textAlign: "right", cursor: "pointer", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>🔔 התראות פוש</span>
                <span style={{ fontSize: 12 }}>{pushLoading ? "..." : pushEnabled ? "פעיל ✓" : "כבוי"}</span>
              </button>
              <button onClick={() => setAutoEnabled(v => !v)}
                style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", color: autoEnabled ? "#4ade80" : "#e2e8f0", fontSize: 14, fontWeight: 600, textAlign: "right", cursor: "pointer", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>⏱ חיפוש אוטומטי</span>
                <span style={{ fontSize: 12 }}>{autoEnabled ? `פעיל · ${fmtCD(countdown)}` : "כבוי"}</span>
              </button>
              <button onClick={() => { setScreen("setup"); setShowMenu(false); }}
                style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", color: "#e2e8f0", fontSize: 14, fontWeight: 600, textAlign: "right", cursor: "pointer", borderRadius: 10 }}>
                ✏️ ערוך את החיפוש
              </button>
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        <div style={{ background: "#161f30", border: "1px solid #1e293b", borderRadius: 12, padding: "11px 14px", marginBottom: 12, fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
          🔎 <strong style={{ color: "#e2e8f0" }}>מחפש: </strong>{savedQuery}
        </div>

        {!pushEnabled && savedQuery && searchCount > 0 && (
          <div style={{ background: "linear-gradient(135deg, #166534aa, #16a34a33)", border: "1px solid #16a34a", borderRadius: 12, padding: "12px 14px", marginBottom: 12, fontSize: 13 }}>
            <div style={{ color: "#86efac", marginBottom: 8 }}>🔔 רוצה לקבל התראה כשיש דירה חדשה?</div>
            <button onClick={togglePush} disabled={pushLoading} style={{ padding: "8px 14px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{pushLoading ? "..." : "הפעל התראות פוש"}</button>
          </div>
        )}

        {insights && (
          <div onClick={() => setShowInsights(v => !v)} style={{ background: "#0f2d1f", border: "1px solid #166534", borderRadius: 12, padding: "10px 14px", marginBottom: 12, cursor: "pointer", fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#4ade80", fontWeight: 600 }}>🧠 למדתי מהפידבק שלך</span>
              <span style={{ color: "#166534", fontSize: 11 }}>{showInsights ? "▲" : "▼"}</span>
            </div>
            {showInsights && <p style={{ color: "#86efac", margin: "8px 0 0", lineHeight: 1.6 }}>{insights}</p>}
          </div>
        )}

        {error && (
          <div style={{ background: "#1a0505", border: "1px solid #7f1d1d", borderRadius: 12, padding: "12px 14px", marginBottom: 12, color: "#fca5a5", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", color: "#fca5a5", fontSize: 18, cursor: "pointer" }}>✕</button>
          </div>
        )}

        {newAlerts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", marginBottom: 8 }}>🔔 {newAlerts.length} דירות חדשות!</div>
            {newAlerts.slice(0, 5).map(apt => (
              <div key={apt.id} style={{ background: "#1c1500", border: "1.5px solid #854d0e", borderRadius: 12, padding: "10px 14px", marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, animation: "slideDown 0.3s ease" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fef3c7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{apt.title}</div>
                  <div style={{ fontSize: 11, color: "#92400e" }}>{[apt.neighborhood, apt.city].filter(Boolean).join(", ")}{apt.price ? ` · ${apt.price.toLocaleString("he-IL")} ₪` : ""}</div>
                </div>
                <button onClick={() => setNewAlerts(p => p.filter(a => a.id !== apt.id))} style={{ padding: "6px 10px", background: "transparent", border: "1px solid #78350f", color: "#92400e", borderRadius: 8, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {isSearching && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#475569" }}>
            <div style={{ fontSize: 40, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }}>🔍</div>
            <div style={{ fontSize: 15, color: "#64748b" }}>מחפש בפלטפורמות...</div>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 10 }}>{results.length} דירות</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {results.map(apt => (
                <ApartmentCard key={apt.id} apt={apt} tags={feedback[apt.id] || []} onFeedback={handleFeedback} isNew={newAlerts.some(a => a.id === apt.id)} />
              ))}
            </div>
          </>
        )}

        {!isSearching && results.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#334155" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🏚️</div>
            <div style={{ fontSize: 15, color: "#475569" }}>לחץ "חפש" להתחיל</div>
          </div>
        )}
      </div>
    </div>
  );
}
