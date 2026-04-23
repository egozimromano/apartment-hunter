"use client";
import { useState } from "react";
import { ScoredApartment, FeedbackTag } from "@/lib/types";
import { FEEDBACK_TAGS, SOURCE_META, formatPrice } from "@/lib/constants";

interface Props {
  apt: ScoredApartment;
  tags: FeedbackTag[];
  onFeedback: (id: string, tag: FeedbackTag) => void;
  onHide: (id: string) => void;
}

// Tags shown as badges on the card summary (not in feedback sheet)
const BADGE_TAGS: FeedbackTag[] = ["loved_it", "interested", "contacted", "too_expensive", "too_far", "too_small", "bad_area", "seen"];

export default function ApartmentCard({ apt, tags, onFeedback, onHide }: Props) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);

  const src = SOURCE_META[apt.source] || SOURCE_META.other;
  const rejected = ["too_expensive", "too_far", "too_small", "bad_area"].some((t) => tags.includes(t as FeedbackTag));
  const fav = tags.includes("loved_it") || tags.includes("interested");
  const seen = tags.includes("seen");
  const scoreColor = apt.match_score >= 80 ? "var(--success-text)" : apt.match_score >= 60 ? "var(--warning)" : "var(--danger-text)";

  // Feedback tags shown in the bottom sheet (excluding hidden_permanent which is a separate action)
  const sheetTags = FEEDBACK_TAGS.filter((t) => t.id !== "hidden_permanent");

  return (
    <>
      <div style={{
        background: fav ? "var(--primary-tint)" : rejected ? "var(--surface-2)" : "var(--surface)",
        border: `1.5px solid ${fav ? "var(--success)" : rejected ? "var(--border)" : open ? "var(--primary)" : "var(--border)"}`,
        borderRadius: 16, overflow: "hidden",
        opacity: seen && !fav ? 0.6 : rejected ? 0.72 : 1,
        transition: "all var(--anim-fast)",
      }}>
        <div onClick={() => setOpen((v) => !v)} style={{ padding: "14px 16px", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700, padding: "3px 9px", background: src.bg, color: src.color, borderRadius: 20 }}>{src.label}</span>
                {apt.rooms && <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>🛏 {apt.rooms}</span>}
                {apt.size && <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>📐 {apt.size}מ״ר</span>}
                {apt.floor && <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)" }}>🏢 ק׳{apt.floor}</span>}
                {seen && <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)" }}>👁 ראיתי</span>}
                {apt.match_score > 0 && <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: scoreColor, marginInlineStart: "auto" }}>{apt.match_score}%</span>}
              </div>
              <div style={{ fontSize: "var(--fs-base)", fontWeight: 600, color: seen ? "var(--text-muted)" : "var(--text)", lineHeight: 1.4, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {apt.title}
              </div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                📍 {[apt.neighborhood, apt.city].filter(Boolean).join(", ") || "—"}
              </div>
            </div>
            {apt.price && (
              <div style={{ flexShrink: 0, textAlign: "center", background: "var(--surface-2)", borderRadius: 10, padding: "6px 12px", border: "1px solid var(--border)" }}>
                <div style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--text)" }}>{formatPrice(apt.price)}</div>
                <div style={{ fontSize: "9px", color: "var(--text-faint)" }}>לחודש</div>
              </div>
            )}
          </div>

          {/* Badge row — only show non-seen tags (seen shown above) */}
          {tags.filter((t) => BADGE_TAGS.includes(t) && t !== "seen").length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>
              {tags.filter((t) => BADGE_TAGS.includes(t) && t !== "seen").slice(0, 3).map((tid) => {
                const t = FEEDBACK_TAGS.find((f) => f.id === tid);
                return t ? (<span key={tid} style={{ fontSize: "var(--fs-sm)", padding: "2px 9px", borderRadius: 20, background: `${t.color}22`, color: t.color, border: `1px solid ${t.color}44` }}>{t.emoji} {t.label}</span>) : null;
              })}
            </div>
          )}
        </div>

        {open && (
          <div style={{ padding: "0 16px 14px", borderTop: "1px solid var(--border)", animation: "fadeIn var(--anim-fast) ease" }}>
            {apt.match_reasons?.length > 0 && (
              <div style={{ padding: "10px 12px", background: "var(--primary-tint)", borderRadius: 10, margin: "12px 0 10px", border: "1px solid var(--primary)" }}>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--primary)", marginBottom: 5 }}>✨ למה זה מתאים:</div>
                {apt.match_reasons.map((r, i) => <div key={i} style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>• {r}</div>)}
              </div>
            )}
            {apt.description && <p style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.6, margin: "10px 0" }}>{apt.description}</p>}
            {apt.features?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", margin: "10px 0" }}>
                {apt.features.map((f, i) => (<span key={i} style={{ fontSize: "var(--fs-sm)", padding: "3px 9px", background: "var(--surface-2)", color: "var(--text-muted)", borderRadius: 20, border: "1px solid var(--border)" }}>{f}</span>))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              {/* Mark as seen */}
              <button onClick={(e) => { e.stopPropagation(); onFeedback(apt.id, "seen"); }}
                style={{ flex: "1 1 80px", padding: "10px 12px", background: seen ? "var(--surface-2)" : "transparent", border: `1px solid ${seen ? "var(--border-2)" : "var(--border-2)"}`, color: seen ? "var(--text-faint)" : "var(--text-muted)", borderRadius: 10, fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
                {seen ? "✓ ראיתי" : "👁 סמן ראיתי"}
              </button>
              {/* Feedback sheet */}
              <button onClick={(e) => { e.stopPropagation(); setSheet(true); }}
                style={{ flex: "1 1 80px", padding: "10px 12px", background: "var(--surface-2)", border: "1px solid var(--border-2)", color: "var(--text)", borderRadius: 10, fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
                💬 פידבק
              </button>
              {/* Open listing */}
              {apt.url && (
                <a href={apt.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                  style={{ flex: "1 1 80px", padding: "10px 12px", background: "var(--primary)", color: "white", borderRadius: 10, fontSize: "var(--fs-sm)", fontWeight: 600, textDecoration: "none", textAlign: "center" }}>
                  🔗 פתח
                </a>
              )}
              {/* Permanent hide */}
              <button onClick={(e) => { e.stopPropagation(); onHide(apt.id); }}
                title="הסתר לצמיתות"
                style={{ flex: "0 0 auto", padding: "10px 14px", background: "transparent", border: "1px solid var(--danger)", color: "var(--danger-text)", borderRadius: 10, fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
                🚫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feedback sheet */}
      {sheet && (
        <>
          <div onClick={() => setSheet(false)} style={{ position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 200, animation: "fadeIn var(--anim-fast) ease" }} />
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: "var(--surface)", borderRadius: "20px 20px 0 0", padding: "16px 20px calc(20px + env(safe-area-inset-bottom))", animation: "slideUp var(--anim-duration) ease", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 -8px 24px rgba(0,0,0,0.4)" }}>
            <div style={{ width: 40, height: 4, background: "var(--border-2)", borderRadius: 10, margin: "0 auto 16px" }} />
            <div style={{ fontSize: "var(--fs-lg)", fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>מה דעתך על הדירה?</div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 16 }}>הפידבק שלך מלמד את הסוכן להביא תוצאות טובות יותר</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sheetTags.map((tag) => {
                const active = tags.includes(tag.id);
                return (
                  <button key={tag.id} onClick={() => onFeedback(apt.id, tag.id)}
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${active ? tag.color : "var(--border-2)"}`, background: active ? `${tag.color}22` : "transparent", color: active ? tag.color : "var(--text-muted)", fontSize: "var(--fs-base)", fontWeight: active ? 700 : 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, transition: "all var(--anim-fast)" }}>
                    <span style={{ fontSize: "18px" }}>{tag.emoji}</span>
                    <span>{tag.label}</span>
                    {active && <span style={{ marginInlineStart: "auto" }}>✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setSheet(false)} style={{ marginTop: 16, width: "100%", padding: "13px", background: "var(--primary)", color: "white", border: "none", borderRadius: 12, fontSize: "var(--fs-base)", fontWeight: 700, cursor: "pointer" }}>סיימתי</button>
          </div>
        </>
      )}
    </>
  );
}
