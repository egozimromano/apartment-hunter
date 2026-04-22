"use client";
import { useState } from "react";
import { ScoredApartment, FeedbackTag } from "@/lib/types";
import { FEEDBACK_TAGS, SOURCE_META, formatPrice } from "@/lib/constants";

interface Props {
  apt: ScoredApartment;
  tags: FeedbackTag[];
  onFeedback: (id: string, tag: FeedbackTag) => void;
  isNew?: boolean;
}

export default function ApartmentCard({ apt, tags, onFeedback, isNew }: Props) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const src = SOURCE_META[apt.source] || SOURCE_META.other;
  const rejected = ["too_expensive","too_far","too_small","bad_area"].some(t => tags.includes(t as FeedbackTag));
  const fav = tags.includes("loved_it") || tags.includes("interested");
  const scoreColor = apt.match_score >= 80 ? "#4ade80" : apt.match_score >= 60 ? "#fbbf24" : "#f87171";

  return (
    <>
      <div style={{
        background: fav ? "#0a1f0f" : rejected ? "#1a0f0f" : "#161f30",
        border: `1.5px solid ${fav ? "#166534" : rejected ? "#450a0a" : open ? "#2563eb" : "#1e293b"}`,
        borderRadius: 16, overflow: "hidden", opacity: rejected ? 0.72 : 1,
        transition: "all 0.2s", animation: isNew ? "slideDown 0.3s ease" : undefined,
      }}>
        <div onClick={() => setOpen(v => !v)} style={{ padding: "14px 16px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", background: src.bg, color: src.color, borderRadius: 20 }}>{src.label}</span>
                {apt.rooms && <span style={{ fontSize: 12, color: "#64748b" }}>🛏 {apt.rooms}</span>}
                {apt.size && <span style={{ fontSize: 12, color: "#64748b" }}>📐 {apt.size}מ״ר</span>}
                {apt.floor && <span style={{ fontSize: 12, color: "#64748b" }}>🏢 ק׳{apt.floor}</span>}
                {apt.match_score > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor, marginInlineStart: "auto" }}>{apt.match_score}%</span>}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", lineHeight: 1.4, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{apt.title}</div>
              <div style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                📍 {[apt.neighborhood, apt.city].filter(Boolean).join(", ") || "—"}
              </div>
            </div>
            {apt.price && (
              <div style={{ flexShrink: 0, textAlign: "center", background: "#0c1220", borderRadius: 10, padding: "6px 12px", border: "1px solid #1e293b" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#f1f5f9" }}>{formatPrice(apt.price)}</div>
                <div style={{ fontSize: 9, color: "#475569" }}>לחודש</div>
              </div>
            )}
          </div>
          {tags.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {tags.slice(0, 3).map(tid => {
                const t = FEEDBACK_TAGS.find(f => f.id === tid);
                return t ? (<span key={tid} style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}44` }}>{t.emoji} {t.label}</span>) : null;
              })}
              {tags.length > 3 && <span style={{ fontSize: 11, padding: "2px 9px", color: "#64748b" }}>+{tags.length - 3}</span>}
            </div>
          )}
        </div>

        {open && (
          <div style={{ padding: "0 16px 14px", borderTop: "1px solid #1e293b", animation: "fadeIn 0.2s ease" }}>
            {apt.match_reasons?.length > 0 && (
              <div style={{ padding: "10px 12px", background: "#0a1f0f", borderRadius: 10, margin: "12px 0 10px", border: "1px solid #166534" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4ade80", marginBottom: 5 }}>✨ למה זה מתאים:</div>
                {apt.match_reasons.map((r, i) => <div key={i} style={{ fontSize: 12, color: "#86efac", lineHeight: 1.5 }}>• {r}</div>)}
              </div>
            )}
            {apt.description && <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.6, margin: "10px 0" }}>{apt.description}</p>}
            {apt.features?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "10px 0" }}>
                {apt.features.map((f, i) => (<span key={i} style={{ fontSize: 11, padding: "3px 9px", background: "#1e293b", color: "#94a3b8", borderRadius: 20, border: "1px solid #334155" }}>{f}</span>))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={(e) => { e.stopPropagation(); setSheet(true); }}
                style={{ flex: 1, padding: "11px 14px", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                💬 תן פידבק
              </button>
              {apt.url && (
                <a href={apt.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, padding: "11px 14px", background: "#2563eb", color: "white", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  🔗 פתח מודעה
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {sheet && (
        <>
          <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, animation: "fadeIn 0.2s ease" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "#161f30", borderRadius: "20px 20px 0 0", padding: "16px 20px calc(20px + env(safe-area-inset-bottom))", animation: "slideUp 0.25s ease", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 -8px 24px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, background: "#334155", borderRadius: 10, margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 4 }}>מה דעתך על הדירה?</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>הפידבק שלך מלמד את הסוכן להביא תוצאות טובות יותר</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FEEDBACK_TAGS.map(tag => {
                const active = tags.includes(tag.id);
                return (
                  <button key={tag.id} onClick={() => onFeedback(apt.id, tag.id)}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${active ? tag.color : "#334155"}`, background: active ? `${tag.color}22` : "transparent", color: active ? tag.color : "#94a3b8", fontSize: 14, fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
                    <span style={{ fontSize: 18 }}>{tag.emoji}</span>
                    <span>{tag.label}</span>
                    {active && <span style={{ marginInlineStart: "auto", fontSize: 16 }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSheet(false)} style={{ marginTop: 16, width: "100%", padding: "13px", background: "#2563eb", color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>סיימתי</button>
          </div>
        </>
      )}
    </>
  );
}
