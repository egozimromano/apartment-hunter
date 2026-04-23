"use client";
import { useState } from "react";
import { AgentSettings, GlobalHiddenEntry } from "@/lib/types";

interface Props {
  settings: AgentSettings;
  hiddenList: GlobalHiddenEntry[];
  onSave: (s: AgentSettings) => void;
  onRemoveHidden: (id: string) => void;
  onClearHidden: () => void;
  onBack: () => void;
}

const INSTRUCTION_EXAMPLES = [
  "אל תראה לי דירות בקומה 0 (קרקע)",
  "אל תראה דירות מעל המחיר שציינתי",
  "העדפה לשכונות שקטות ולא מרכזיות",
  "דירות מעל המחיר שציינתי — שים בסוף הרשימה",
  "חשוב לי מרפסת יותר מחניה",
];

export default function AgentSettingsScreen({ settings, hiddenList, onSave, onRemoveHidden, onClearHidden, onBack }: Props) {
  const [instructions, setInstructions] = useState(settings.userInstructions);
  const [tab, setTab] = useState<"instructions" | "learned" | "hidden">("instructions");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...settings, userInstructions: instructions });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 10,
    border: "1px solid var(--border-2)", background: "var(--surface-2)",
    color: "var(--text)", fontSize: "var(--fs-base)", resize: "vertical",
    lineHeight: 1.5, fontFamily: "inherit",
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      {/* Header */}
      <div className="safe-top" style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "12px 16px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onBack}
            style={{ padding: "8px 10px", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "var(--fs-lg)", cursor: "pointer" }}>
            ←
          </button>
          <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text)" }}>🤖 הגדרות סוכן</div>
          <div style={{ width: 36 }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 4 }}>
          {([
            { id: "instructions", label: "📝 הוראות" },
            { id: "learned", label: "🧠 נלמד" },
            { id: "hidden", label: `🗑 מוסתרות (${hiddenList.length})` },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: "12px 14px", background: "transparent", border: "none",
                borderBottom: `2px solid ${tab === t.id ? "var(--primary)" : "transparent"}`,
                color: tab === t.id ? "var(--primary)" : "var(--text-muted)",
                fontSize: "var(--fs-sm)", fontWeight: tab === t.id ? 700 : 500,
                cursor: "pointer", transition: "all var(--anim-fast)",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>

        {/* ── Tab: Instructions ── */}
        {tab === "instructions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>הוראות קבועות לסוכן</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                כתוב כאן כללים שחלים על כל החיפושים. הסוכן יפעל לפיהם בכל חיפוש, בנוסף לפילטרים הספציפיים.
              </div>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={6}
                placeholder={"לדוגמה:\nאל תראה לי דירות בקומת קרקע\nדירות מעל המחיר — הצג בסוף הרשימה\nחשוב לי שיהיה מרפסת"}
                style={inputStyle}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {INSTRUCTION_EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => setInstructions((prev) => prev ? `${prev}\n${ex}` : ex)}
                    style={{ padding: "5px 11px", borderRadius: 20, border: "1px solid var(--border-2)", background: "transparent", color: "var(--text-dim)", fontSize: "var(--fs-sm)", cursor: "pointer" }}>
                    + {ex}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSave}
              style={{
                width: "100%", padding: "14px",
                background: saved ? "var(--success)" : "var(--primary)",
                color: "white", border: "none", borderRadius: 12,
                fontSize: "var(--fs-base)", fontWeight: 700, cursor: "pointer",
                transition: "background var(--anim-fast)",
              }}>
              {saved ? "✓ נשמר!" : "שמור הוראות"}
            </button>
          </div>
        )}

        {/* ── Tab: Learned ── */}
        {tab === "learned" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>🧠 מה הסוכן למד עליך</div>
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-dim)", marginBottom: 12, lineHeight: 1.6 }}>
                נצבר אוטומטית מהפידבק שנתת על דירות בכל החיפושים שלך.
              </div>
              {settings.learnedInsights ? (
                <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap", background: "var(--surface-2)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border)" }}>
                  {settings.learnedInsights}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-faint)" }}>
                  <div style={{ fontSize: "32px", marginBottom: 10 }}>🤷</div>
                  <div style={{ fontSize: "var(--fs-sm)" }}>הסוכן עדיין לא למד כלום.</div>
                  <div style={{ fontSize: "var(--fs-sm)", marginTop: 6 }}>תן פידבק על דירות — "יקר מדי", "אהבתי" וכו׳.</div>
                </div>
              )}
            </div>
            {settings.learnedInsights && (
              <button onClick={() => { if (confirm("למחוק את כל מה שנלמד?")) onSave({ ...settings, learnedInsights: "" }); }}
                style={{ padding: "11px", background: "transparent", border: "1px solid var(--danger)", color: "var(--danger-text)", borderRadius: 10, fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
                🗑 נקה מה שנלמד
              </button>
            )}
            {settings.updatedAt > 0 && (
              <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)", textAlign: "center" }}>
                עודכן לאחרונה: {new Date(settings.updatedAt).toLocaleDateString("he-IL")}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Hidden ── */}
        {tab === "hidden" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {hiddenList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
                <div style={{ fontSize: "36px", marginBottom: 10 }}>✨</div>
                <div style={{ fontSize: "var(--fs-sm)" }}>אין דירות מוסתרות</div>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-muted)" }}>{hiddenList.length} דירות מוסתרות מכל החיפושים</div>
                  <button onClick={() => { if (confirm("לבטל הסתרה של כל הדירות?")) onClearHidden(); }}
                    style={{ padding: "6px 12px", background: "transparent", border: "1px solid var(--border-2)", color: "var(--text-muted)", borderRadius: 8, fontSize: "var(--fs-sm)", cursor: "pointer" }}>
                    בטל הכל
                  </button>
                </div>
                <div className="anim-stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {hiddenList.map((entry) => (
                    <div key={entry.id} style={{
                      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                      padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "var(--fs-sm)", fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {entry.title}
                        </div>
                        <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)", marginTop: 2 }}>
                          {new Date(entry.hiddenAt).toLocaleDateString("he-IL")}
                        </div>
                      </div>
                      <button onClick={() => onRemoveHidden(entry.id)}
                        style={{ flexShrink: 0, padding: "6px 12px", background: "transparent", border: "1px solid var(--primary)", color: "var(--primary)", borderRadius: 8, fontSize: "var(--fs-sm)", fontWeight: 600, cursor: "pointer" }}>
                        הצג שוב
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
