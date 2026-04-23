"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  SavedSearch, UserSettings, DEFAULT_SETTINGS,
  ScoredApartment, FeedbackTag, ChatMessage, ChatAction, StructuredFilters,
  AgentSettings, GlobalHiddenEntry,
} from "@/lib/types";
import {
  getAllSearches, getSearchById, upsertSearch, deleteSearch as deleteSearchStorage,
  newSearch, getActiveSearchId, setActiveSearchId,
  setFeedback as setFeedbackStorage, hideApartment as hideAptStorage, hideMany as hideManyStorage,
  unhideAll, mergeResults, getSettings, saveSettings, migrateV1IfNeeded, addChatMessage, genId,
  updateSearch, getAgentSettings, saveAgentSettings, updateLearnedInsights,
  getGlobalHidden, addToGlobalHidden, removeFromGlobalHidden, getGlobalHiddenIds,
} from "@/lib/storage";
import { applySettings, watchSystemTheme } from "@/lib/theme";
import { buildFeedbackSummary } from "@/lib/constants";
import { subscribeToPush, unsubscribeFromPush, getSubscriptionStatus } from "@/lib/push";
import SearchesList from "@/components/SearchesList";
import SearchForm from "@/components/SearchForm";
import SettingsPanel from "@/components/SettingsPanel";
import ChatPanel from "@/components/ChatPanel";
import ApartmentCard from "@/components/ApartmentCard";
import AgentSettingsScreen from "@/components/AgentSettingsScreen";

type View = "list" | "new" | "edit" | "search" | "agent";

export default function Home() {
  const [view, setView] = useState<View>("list");
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [agentSettings, setAgentSettings] = useState<AgentSettings>({ userInstructions: "", learnedInsights: "", updatedAt: 0 });
  const [globalHidden, setGlobalHidden] = useState<GlobalHiddenEntry[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushLoading, setPushLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load
  useEffect(() => {
    const s = getSettings();
    setSettings(s);
    applySettings(s);
    migrateV1IfNeeded();
    const list = getAllSearches();
    setSearches(list);
    const aid = getActiveSearchId();
    if (aid && list.find((x) => x.id === aid)) {
      setActiveId(aid);
      setView("search");
    }
    setAgentSettings(getAgentSettings());
    setGlobalHidden(getGlobalHidden());
    setHydrated(true);
  }, []);

  // Re-apply theme whenever settings change; also watch OS preference if auto
  useEffect(() => {
    applySettings(settings);
    return watchSystemTheme(settings, () => applySettings(settings));
  }, [settings]);

  const refreshSearches = () => setSearches(getAllSearches());
  const activeSearch: SavedSearch | null = activeId ? searches.find((s) => s.id === activeId) || null : null;
  const editingSearch: SavedSearch | null = editingId ? searches.find((s) => s.id === editingId) || null : null;

  // ─── Settings ──────────────────────────────────────────────
  const handleSettingsChange = (s: UserSettings) => {
    setSettings(s);
    saveSettings(s);
  };

  // ─── Navigation ────────────────────────────────────────────
  const goHome = () => {
    setView("list");
    setActiveId(null);
    setActiveSearchId(null);
    setShowChat(false);
    setShowMenu(false);

    refreshSearches();
  };

  const openSearch = (id: string) => {
    setActiveId(id);
    setActiveSearchId(id);
    setView("search");

    // Auto-search if never searched before
    const s = getSearchById(id);
    if (s && s.searchCount === 0) {
      setTimeout(() => runSearchFor(id), 200);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setView("new");
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setView("edit");
  };

  // ─── CRUD ──────────────────────────────────────────────────
  const handleSaveNew = (name: string, freeText: string, filters: StructuredFilters) => {
    const s = newSearch(name, freeText, filters);
    upsertSearch(s);
    refreshSearches();
    setActiveId(s.id);
    setActiveSearchId(s.id);
    setView("search");
    setTimeout(() => runSearchFor(s.id), 300);
  };

  const handleSaveEdit = (name: string, freeText: string, filters: StructuredFilters) => {
    if (!editingSearch) return;
    updateSearch(editingSearch.id, { name, freeText, filters });
    refreshSearches();
    setEditingId(null);
    setView(activeId ? "search" : "list");
  };

  const handleDelete = (id: string) => {
    deleteSearchStorage(id);
    if (activeId === id) {
      setActiveId(null);
      setActiveSearchId(null);
    }
    refreshSearches();
  };

  // ─── Search execution ──────────────────────────────────────
  const runSearchFor = useCallback(async (id: string) => {
    const s = getSearchById(id);
    if (!s || isSearching) return;
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: s.freeText,
          filters: s.filters,
          feedbackSummary: buildFeedbackSummary(s.feedback),
          previousInsights: s.insights,
          globalHiddenIds: Array.from(getGlobalHiddenIds()),
          globalInstructions: getAgentSettings().userInstructions,
          globalLearnedInsights: getAgentSettings().learnedInsights,
        }),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const fresh: ScoredApartment[] = data.apartments || [];
      const { newOnes } = mergeResults(id, fresh);
      if (data.learned_insights) {
        updateSearch(id, { insights: data.learned_insights });
        updateLearnedInsights(data.learned_insights);
        setAgentSettings(getAgentSettings());
      }
      refreshSearches();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSearching(false);
    }
  }, [isSearching]);

  const runActiveSearch = () => { if (activeId) runSearchFor(activeId); };

  // ─── Agent settings ────────────────────────────────────────
  const handleSaveAgentSettings = (s: AgentSettings) => {
    saveAgentSettings(s);
    setAgentSettings(s);
  };

  const handleRemoveHidden = (id: string) => {
    removeFromGlobalHidden(id);
    setGlobalHidden(getGlobalHidden());
  };

  const handleClearHidden = () => {
    getGlobalHidden().forEach((e) => removeFromGlobalHidden(e.id));
    setGlobalHidden([]);
  };

  // ─── Feedback / hide ───────────────────────────────────────
  const handleFeedback = (aptId: string, tag: FeedbackTag) => {
    if (!activeId) return;
    setFeedbackStorage(activeId, aptId, tag);
    refreshSearches();
  };

  const handleHide = (aptId: string) => {
    if (!activeId) return;
    hideAptStorage(activeId, aptId);
    // Also add to global hidden list
    const s = getSearchById(activeId);
    const apt = s?.results.find((a) => a.id === aptId);
    if (apt) {
      addToGlobalHidden({ id: apt.id, title: apt.title, url: apt.url });
      setGlobalHidden(getGlobalHidden());
    }
    refreshSearches();
  };

  // ─── Chat actions ──────────────────────────────────────────
  const applyChatActions = async (actions: ChatAction[]) => {
    if (!activeId || !activeSearch) return;
    let shouldRunSearch = false;
    let updatedFilters = { ...activeSearch.filters };

    for (const a of actions) {
      switch (a.type) {
        case "updateFilters":
          updatedFilters = { ...updatedFilters, ...a.filters };
          break;
        case "runSearch":
          shouldRunSearch = true;
          break;
        case "hideApartment":
          hideAptStorage(activeId, a.aptId);
          break;
        case "hideMany":
          hideManyStorage(activeId, a.aptIds);
          break;
        case "clearHidden":
          unhideAll(activeId);
          break;
      }
    }

    if (JSON.stringify(updatedFilters) !== JSON.stringify(activeSearch.filters)) {
      updateSearch(activeId, { filters: updatedFilters });
    }
    refreshSearches();

    if (shouldRunSearch) {
      await runSearchFor(activeId);
    }
  };

  const handleChatSend = async (text: string) => {
    if (!activeId || !activeSearch) return;
    setIsChatSending(true);

    const userMsg: ChatMessage = { id: genId(), role: "user", text, timestamp: Date.now() };
    addChatMessage(activeId, userMsg);
    refreshSearches();

    try {
      const visibleApts = (activeSearch.results || [])
        .filter((a) => !activeSearch.hiddenIds.includes(a.id))
        .slice(0, 20)
        .map((a) => ({ id: a.id, title: a.title, price: a.price, rooms: a.rooms, neighborhood: a.neighborhood, city: a.city }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: text,
          history: activeSearch.chatHistory,
          currentFilters: activeSearch.filters,
          currentFreeText: activeSearch.freeText,
          visibleApartments: visibleApts,
        }),
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: genId(),
        role: "assistant",
        text: data.reply || "בוצע.",
        timestamp: Date.now(),
        actions: data.actions || [],
      };
      addChatMessage(activeId, assistantMsg);
      refreshSearches();

      if (Array.isArray(data.actions) && data.actions.length > 0) {
        await applyChatActions(data.actions);
      }
    } catch (e: any) {
      const errMsg: ChatMessage = { id: genId(), role: "assistant", text: `שגיאה: ${e.message}`, timestamp: Date.now() };
      addChatMessage(activeId, errMsg);
      refreshSearches();
    } finally {
      setIsChatSending(false);
    }
  };

  // ─── Push ──────────────────────────────────────────────────
  const togglePush = async () => {
    if (!activeSearch) return;
    setPushLoading(true);
    try {
      if (activeSearch.pushEnabled) {
        await unsubscribeFromPush();
        updateSearch(activeSearch.id, { pushEnabled: false });
      } else {
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) { setError("מפתח VAPID לא מוגדר"); return; }
        const ok = await subscribeToPush(vapidKey, activeSearch.freeText || activeSearch.name);
        if (ok) updateSearch(activeSearch.id, { pushEnabled: true });
        else setError("אישור התראות נדחה או לא נתמך");
      }
      refreshSearches();
    } finally {
      setPushLoading(false);
    }
  };

  // ─── Renders ───────────────────────────────────────────────
  if (!hydrated) {
    return <div style={{ minHeight: "100dvh", background: "var(--bg)" }} />;
  }

  return (
    <>
      {view === "list" && (
        <SearchesList
          searches={searches}
          onOpen={openSearch}
          onEdit={openEdit}
          onDelete={handleDelete}
          onNew={openNew}
          onSettings={() => setShowSettings(true)}
          onAgentSettings={() => setView("agent")}
        />
      )}

      {view === "agent" && (
        <AgentSettingsScreen
          settings={agentSettings}
          hiddenList={globalHidden}
          onSave={handleSaveAgentSettings}
          onRemoveHidden={handleRemoveHidden}
          onClearHidden={handleClearHidden}
          onBack={() => setView("list")}
        />
      )}

      {view === "new" && (
        <SearchForm
          onSave={handleSaveNew}
          onCancel={() => setView(activeId ? "search" : "list")}
        />
      )}

      {view === "edit" && editingSearch && (
        <SearchForm
          initial={editingSearch}
          onSave={handleSaveEdit}
          onCancel={() => { setEditingId(null); setView(activeId ? "search" : "list"); }}
        />
      )}

      {view === "search" && activeSearch && (
        <SearchView
          search={activeSearch}
          isSearching={isSearching}
          error={error}
          pushLoading={pushLoading}
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onBack={goHome}
          onSearch={runActiveSearch}
          onEdit={() => openEdit(activeSearch.id)}
          onOpenChat={() => setShowChat(true)}
          onFeedback={handleFeedback}
          onHide={handleHide}
          onDismissError={() => setError(null)}
          onTogglePush={togglePush}
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showChat && activeSearch && (
        <ChatPanel
          history={activeSearch.chatHistory}
          onSend={handleChatSend}
          onClose={() => setShowChat(false)}
          isSending={isChatSending}
        />
      )}
    </>
  );
}

// ─── Search View (inline component) ──────────────────────────
interface SearchViewProps {
  search: SavedSearch;
  isSearching: boolean;
  error: string | null;
  pushLoading: boolean;
  showMenu: boolean;
  setShowMenu: (v: boolean) => void;
  onBack: () => void;
  onSearch: () => void;
  onEdit: () => void;
  onOpenChat: () => void;
  onFeedback: (aptId: string, tag: FeedbackTag) => void;
  onHide: (aptId: string) => void;
  onDismissError: () => void;
  onTogglePush: () => void;
}

function SearchView(p: SearchViewProps) {
  const { search, isSearching, error, pushLoading, showMenu, setShowMenu } = p;

  // Sort order is computed once per results change — NOT on every feedback update.
  // This prevents cards from jumping around while the user interacts with them.
  const visibleResults = useMemo(() => {
    const base = search.results.filter((a) => !search.hiddenIds.includes(a.id));
    // Snapshot which IDs are already "seen" at the time results load
    const seenIds = new Set(
      Object.entries(search.feedback)
        .filter(([, tags]) => tags.includes("seen" as any))
        .map(([id]) => id)
    );
    return [...base].sort((a, b) => {
      const aSeen = seenIds.has(a.id) ? 1 : 0;
      const bSeen = seenIds.has(b.id) ? 1 : 0;
      return aSeen - bSeen;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.results, search.hiddenIds]);
  // Note: intentionally excludes search.feedback from deps so marking "seen"
  // doesn't re-sort mid-interaction. Order updates on next search run.

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div className="safe-top" style={{
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "12px 16px", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button onClick={p.onBack}
            style={{ padding: "8px 10px", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "var(--fs-lg)", cursor: "pointer", flexShrink: 0 }}>
            ←
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{search.name}</div>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {search.lastSearchedAt ? `עודכן ${new Date(search.lastSearchedAt).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}` : "ממתין"}
              {search.searchCount > 0 && ` · ${search.searchCount} חיפושים`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            <button onClick={p.onSearch} disabled={isSearching}
              style={{ padding: "10px 14px", borderRadius: 20, border: "none", fontSize: "var(--fs-sm)", fontWeight: 700, cursor: isSearching ? "not-allowed" : "pointer", background: isSearching ? "var(--surface-2)" : "var(--primary)", color: isSearching ? "var(--text-faint)" : "white", display: "flex", alignItems: "center", gap: 5 }}>
              {isSearching ? <span style={{ animation: "spin 1s linear infinite" }}>⟳</span> : "🔍"}
            </button>
            <button onClick={p.onOpenChat}
              style={{ padding: "10px 12px", borderRadius: 20, border: "1px solid var(--border-2)", background: "transparent", color: "var(--text-muted)", fontSize: "var(--fs-base)", cursor: "pointer" }}>
              💬
            </button>
            <button onClick={() => setShowMenu(!showMenu)}
              style={{ padding: "10px 12px", borderRadius: 20, border: "1px solid var(--border-2)", background: "transparent", color: "var(--text-muted)", fontSize: "var(--fs-base)", cursor: "pointer" }}>
              ⋯
            </button>
          </div>
        </div>
      </div>

      {showMenu && (
        <>
          <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{ position: "sticky", top: 60, zIndex: 95, maxWidth: 680, margin: "0 auto", padding: "0 16px" }}>
            <div className="anim-slide-down" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 6, boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>
              <MenuButton onClick={() => { p.onTogglePush(); setShowMenu(false); }} disabled={pushLoading}
                label={`🔔 התראות פוש`} right={pushLoading ? "..." : search.pushEnabled ? "פעיל ✓" : "כבוי"}
                active={search.pushEnabled} />
              <MenuButton onClick={() => { p.onEdit(); setShowMenu(false); }}
                label="✏️ ערוך חיפוש" />
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px" }}>
        {search.freeText && (
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px", marginBottom: 12, fontSize: "var(--fs-sm)", color: "var(--text-muted)", lineHeight: 1.5 }}>
            🔎 <strong style={{ color: "var(--text)" }}>מחפש: </strong>{search.freeText}
          </div>
        )}

        {search.insights && (
          <div style={{ background: "var(--primary-tint)", border: "1px solid var(--primary)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: "var(--fs-sm)" }}>
            <div style={{ color: "var(--primary)", fontWeight: 600, marginBottom: 4 }}>🧠 למדתי מהפידבק שלך</div>
            <div style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{search.insights}</div>
          </div>
        )}

        {error && (
          <div style={{ background: "var(--danger)22", border: "1px solid var(--danger)", borderRadius: 12, padding: "12px 14px", marginBottom: 12, color: "var(--danger-text)", fontSize: "var(--fs-sm)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <span>⚠️ {error}</span>
            <button onClick={p.onDismissError} style={{ background: "transparent", border: "none", color: "var(--danger-text)", fontSize: "18px", cursor: "pointer" }}>✕</button>
          </div>
        )}

        {isSearching && visibleResults.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
            <div style={{ fontSize: "40px", marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }}>🔍</div>
            <div style={{ fontSize: "var(--fs-base)", color: "var(--text-dim)" }}>מחפש בפלטפורמות...</div>
          </div>
        )}

        {visibleResults.length > 0 && (
          <>
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-faint)", marginBottom: 10 }}>
              {visibleResults.length} דירות
              {search.hiddenIds.length > 0 && ` · ${search.hiddenIds.length} מוסתרות`}
            </div>
            <div className="anim-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {visibleResults.map((apt) => (
                <ApartmentCard
                  key={apt.id}
                  apt={apt}
                  tags={search.feedback[apt.id] || []}
                  onFeedback={p.onFeedback}
                  onHide={p.onHide}
                />
              ))}
            </div>
          </>
        )}

        {!isSearching && visibleResults.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-faint)" }}>
            <div style={{ fontSize: "44px", marginBottom: 12 }}>🏚️</div>
            <div style={{ fontSize: "var(--fs-base)", color: "var(--text-dim)" }}>לחץ על 🔍 להתחיל</div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({ label, right, onClick, disabled, active }: { label: string; right?: string; onClick: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: "100%", padding: "12px 14px", border: "none", background: "transparent", color: active ? "var(--success-text)" : "var(--text)", fontSize: "var(--fs-base)", fontWeight: 600, textAlign: "start", cursor: disabled ? "not-allowed" : "pointer", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span>{label}</span>
      {right && <span style={{ fontSize: "var(--fs-sm)" }}>{right}</span>}
    </button>
  );
}
