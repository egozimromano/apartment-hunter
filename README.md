# 🏠 סוכן חיפוש דירות — גרסה 100% חינמית

חיפוש דירות להשכרה בישראל עם AI — יד2, הומלס, מדלן, פייסבוק ועוד.
**כל השירותים חינם. אפס עלויות.**

---

## ✨ איך זה עובד


```
┌────────────────────────────────────────────────────────────┐
│  1. אתה כותב בחופשיות מה אתה מחפש (עברית)                │
│     "3 חדרים בתל אביב עד 8,000, עם חניה"                   │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│  2. Gemini (AI חינמי) מחלץ פילטרים מובנים                 │
│     { city: "תל אביב", rooms_max: 3, price_max: 8000 }     │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│  3. Brave Search מחפש בפלטפורמות:                         │
│     site:yad2.co.il · site:homeless.co.il · site:madlan    │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│  4. Gemini מחלץ נתוני דירה מכל תוצאה                       │
│     { price, rooms, neighborhood, features, url }          │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│  5. Gemini מדרג כל דירה לפי הפידבק שלך (0-100%)           │
│     לומד: "הוא סימן יקר מדי ב-9000+" → מוריד ציון          │
└────────────────────────────────────────────────────────────┘
                          ▼
┌────────────────────────────────────────────────────────────┐
│  6. שולח התראת פוש לטלפון אם יש דירה חדשה טובה 🔔         │
└────────────────────────────────────────────────────────────┘
```

---

## 💰 עלויות

| שירות | תוכנית חינם | השימוש שלנו |
|-------|---------|-------------|
| Vercel | חינם לפרויקטים פרטיים | ✓ עומד בתוכנית |
| Brave Search API | 2,000 חיפושים/חודש | ~1,440/חודש (30 דק׳) |
| Gemini 2.0 Flash | 1,500 קריאות/יום | ~100/יום |
| Upstash Redis | 10,000 פקודות/יום | ~200/יום |
| Web Push | חינם | ✓ |

**סה״כ: $0/חודש** 🎉

---

## 🚀 הגדרה (30 דקות פעם אחת)

### שלב 1 — הכן את ה-API Keys (15 דק׳)

#### Brave Search API (חינמי)
1. היכנס ל-[api.search.brave.com](https://api.search.brave.com)
2. הירשם עם Google/GitHub
3. בחר **Subscription → Free** (2,000 queries/month)
4. קבל API Key → שמור בצד

#### Google Gemini (חינמי)
1. היכנס ל-[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. לחץ **Create API key**
3. העתק את המפתח → שמור בצד

#### Upstash Redis (חינמי)
1. היכנס ל-[upstash.com](https://upstash.com) עם Google
2. Create Database → Redis → שם: `apartments`
3. בחר אזור קרוב (Frankfurt)
4. פתח את ה-DB → העתק `UPSTASH_REDIS_REST_URL` ו-`UPSTASH_REDIS_REST_TOKEN`

### שלב 2 — הכן VAPID Keys (2 דק׳)

במחשב:
```bash
cd apartment-hunter-free
npm install
npm run generate-vapid
```

תקבל פלט כזה — שמור בצד:
```
VAPID_PUBLIC_KEY=BPnXf3...
VAPID_PRIVATE_KEY=xyz...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BPnXf3...
```

### שלב 3 — פרוס ל-Vercel (10 דק׳)

#### 3a. דחוף ל-GitHub
```bash
git init
git add .
git commit -m "apartment hunter"
# צור repo ריק ב-github.com/new בשם: apartment-hunter
git remote add origin https://github.com/YOUR_USER/apartment-hunter.git
git branch -M main
git push -u origin main
```

#### 3b. פרוס ל-Vercel
1. היכנס ל-[vercel.com](https://vercel.com) עם GitHub
2. **Add New → Project** → בחר את ה-repo שלך
3. לפני Deploy, פתח **Environment Variables** והוסף:

| שם | ערך |
|---|---|
| `BRAVE_API_KEY` | מ-Brave |
| `GEMINI_API_KEY` | מ-Gemini |
| `UPSTASH_REDIS_REST_URL` | מ-Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | מ-Upstash |
| `VAPID_PUBLIC_KEY` | מ-generate-vapid |
| `VAPID_PRIVATE_KEY` | מ-generate-vapid |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | זהה ל-VAPID_PUBLIC_KEY |
| `VAPID_EMAIL` | המייל שלך |
| `CRON_SECRET` | מחרוזת רנדומלית (כל דבר) |

4. לחץ **Deploy** — תוך דקה יש לך לינק חי 🚀

### שלב 4 — התקן על הטלפון (3 דק׳)

**iPhone:**
1. פתח את הלינק ב-**Safari**
2. כפתור שיתוף ⬆️ → "הוסף למסך הבית"

**Android:**
1. פתח את הלינק ב-**Chrome**
2. תפריט ⋮ → "הוסף למסך הבית" / "Install app"

האפליקציה תופיע עם אייקון על המסך הבית 🎉

### שלב 5 — הפעל התראות פוש (1 דק׳)

1. פתח את האפליקציה מהטלפון
2. כתוב מה אתה מחפש → "התחל"
3. לחץ על כפתור "הפעל התראות פוש"
4. אשר בחלון הדפדפן

**מעכשיו — כל 30 דקות השרת יחפש עבורך וישלח התראה כשיש דירה חדשה טובה!** 🔔

---

## 🛠️ פתרון תקלות

### "BRAVE_API_KEY not set"
→ הוסף את המשתנה ב-Vercel → Settings → Environment Variables ועשה Redeploy

### אין תוצאות / 0 דירות
1. בדוק שהמפתח של Brave תקף — נסה [playground](https://api.search.brob.com/playground)
2. בדוק שלא עברת את המכסה (2,000/חודש)
3. פתח את הקונסול ב-Vercel → Logs ותראה את השגיאה

### התראות פוש לא מגיעות
1. אשר שהטלפון מאשר הרשאות התראה לאתר
2. **iOS דורש 16.4+** ו**התקנה על מסך הבית** (לא רק Safari פתוח)
3. בדוק ב-Vercel → Functions → /api/cron שה-Cron רץ

### הרבה מ-Gemini "429 Rate Limit"
→ בדוק ב-[aistudio.google.com](https://aistudio.google.com) כמה בקשות עשית היום (מוגבל ל-1,500)

### הסרת התראות
→ תפריט ⋯ באפליקציה → "התראות פוש: פעיל" → לחץ לכיבוי

---

## 📂 מבנה הפרויקט

```
apartment-hunter-free/
├── app/
│   ├── api/
│   │   ├── search/route.ts      ← חיפוש ידני (מהאפליקציה)
│   │   ├── cron/route.ts        ← חיפוש אוטומטי (Vercel Cron)
│   │   ├── subscribe/route.ts   ← רישום ל-push
│   │   └── unsubscribe/route.ts ← ביטול push
│   ├── page.tsx                 ← הממשק הראשי
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── ApartmentCard.tsx        ← כרטיס דירה עם פידבק
├── lib/
│   ├── search.ts                ← Brave Search client
│   ├── gemini.ts                ← Gemini client
│   ├── queryParser.ts           ← עברית → פילטרים
│   ├── searchExtract.ts         ← search + extract
│   ├── scorer.ts                ← דירוג עם AI
│   ├── redis.ts                 ← Upstash client
│   ├── push.ts                  ← push notifications
│   ├── types.ts
│   └── constants.ts
├── public/
│   ├── manifest.json            ← PWA manifest
│   ├── sw.js                    ← service worker
│   └── icons/                   ← אייקונים לאפליקציה
├── scripts/
│   └── generate-vapid.js        ← generate VAPID keys
├── vercel.json                  ← cron schedule (30 min)
└── package.json
```

---

## 🎯 טיפים לחיפוש טוב יותר

1. **תיאור מפורט עוזר ל-AI** — כתוב "עם חניה, מעלית, שכונה שקטה" במקום רק "3 חדרים"
2. **תן פידבק על דירות** — הסוכן לומד ממך עם הזמן
3. **תגיות שעוזרות הכי הרבה:**
   - 👎 "יקר מדי" — יוריד ציון למחירים דומים
   - 👎 "רחוק מדי" — ילמד את האזור המועדף
   - ❤️ "אהבתי" — ילמד מה אתה באמת מחפש
4. **הפעל התראות פוש** — תהיה ראשון לראות דירות חדשות

---

## ⚠️ הערות חשובות

- **התוצאות תלויות ב-Google/Brave** — אם דירה לא עלתה לאינדקס, היא לא תופיע
- **לא כל המודעות מתעדכנות מיד** — יכול להיות פיגור של שעות עד יום
- **Brave מוגבל ל-2,000 חיפושים** — אם תגיע לקצה, תצטרך להמתין לחודש הבא או לשלם
- **Gemini עלול להיות לא מדויק לפעמים** — ציוני התאמה הם הערכה, לא מוחלט

---

נבנה עם ❤️ באמצעות:
- Next.js 14 + TypeScript
- Google Gemini 2.0 Flash (חינם)
- Brave Search API (חינם)
- Upstash Redis (חינם)
- Vercel (חינם)
