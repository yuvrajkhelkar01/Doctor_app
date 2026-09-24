# Clinic Care — Architecture Guide

A complete tour of how this app is built, written so that someone seeing the project for the
first time can follow it end to end. No prior knowledge of Expo or Supabase is assumed.

> **Reading tip:** the diagrams are written in [Mermaid](https://mermaid.js.org). GitHub, GitLab
> and most Markdown previews (including VS Code's) render them as real pictures. If you see raw
> text instead, your viewer doesn't support Mermaid — paste the block into
> [mermaid.live](https://mermaid.live) to see it drawn.

---

## 1. What the app does

**Clinic Care** is a mobile app for a **single doctor running their own practice**. It is *not* a
patient-facing app — patients never log in. The doctor signs up, and from then on the app is their
private workspace:

| The doctor can… | Where in the app |
| --- | --- |
| Sign up, confirm their email, sign in | `login`, `register`, `confirm-signup` (`reset-password` is still a placeholder) |
| See a day-by-day appointment calendar | `dashboard` |
| Add patients, with a case study photo and/or notes | `add-patient` |
| Search patients by name or phone number | `dashboard` |
| Open a patient's profile, call them, record a "visit" (clock in) | `patients/[id]` |
| Review a patient's visit history and details | `patients/[id]/visits`, `patients/[id]/details` |
| Schedule, reschedule and delete appointments | `dashboard` → schedule sheets |
| Share a public booking link, and accept or decline the requests it brings in | `account`, `dashboard` |
| Edit their profile, change email/password, delete the account | `account` |

The **one public page** is the booking form at `/book/<token>`. Anyone with the link can ask for an
appointment. They cannot see any patient data — they can only leave a request that the doctor
reviews later.

---

## 2. The 30-second version

```mermaid
flowchart LR
    subgraph Client["📱 The app — one codebase, three platforms"]
        direction TB
        iOS["iOS"]
        Android["Android"]
        Web["Web browser"]
    end

    subgraph Expo["Expo / React Native"]
        RN["React 19 components<br/>+ Expo Router screens"]
    end

    subgraph Backend["☁️ Supabase — the entire backend"]
        direction TB
        Auth["Auth<br/>accounts, sessions, emails"]
        DB[("PostgreSQL<br/>tables + RLS rules")]
        Storage["Storage<br/>case photos, avatars"]
        RPC["SQL functions<br/>booking, delete account"]
    end

    Patient["🧑 Patient with a booking link"]

    iOS --> RN
    Android --> RN
    Web --> RN
    RN -- "supabase-js over HTTPS" --> Auth
    RN --> DB
    RN --> Storage
    RN --> RPC
    Patient -- "public /book/token page" --> RPC
    RPC --> DB
```

Two sentences worth remembering:

1. **There is no server of our own.** No Node backend, no Express, no API routes. The app talks
   straight to Supabase, and the *database itself* enforces who may read or write what.
2. **One codebase runs everywhere.** The same React components render as native iOS/Android views
   and as a web page.

---

## 3. Tech stack

| Layer | Choice | What it actually does here | Why this one |
| --- | --- | --- | --- |
| App framework | **Expo SDK 57** (React Native 0.86, React 19.2) | Turns React code into real native apps | Handles native builds, updates and hundreds of device APIs so we never open Xcode |
| Language | **TypeScript 6** (`strict`) | Types every prop, row and function | Catches "this column can be null" bugs before the app runs |
| Navigation | **Expo Router 57** | File-based routing: a file in `src/app/` *is* a screen | Same mental model as Next.js; gives us deep links and web URLs for free |
| Backend | **Supabase** (Postgres 17, Auth, Storage) | Database, login, file uploads, server-side functions | One managed service replaces a whole backend team's worth of plumbing |
| DB client | **@supabase/supabase-js 2** | Type-safe queries, session handling, auto token refresh | Official client; generated types line up with our schema |
| Session storage | **expo-sqlite** (native) / `window.localStorage` (web) | Remembers the login between app launches | SQLite-backed storage is Expo's recommended native option |
| Styling | **React Native `StyleSheet` + a custom theme** | Colors come from `src/constants/theme.ts` via a context | No CSS framework needed; light/dark handled in one place |
| Icons & images | `@expo/vector-icons` (Ionicons), `expo-image` | Icons and cached remote images | Ship with Expo, work on all three platforms |
| Animation | **Reanimated 4** + `Animated` | Intro heartbeat animation, drawer slide | Reanimated runs animations on the UI thread |
| Media | `expo-image-picker`, `expo-file-system` | Camera/library photo picking and reading bytes | Needed for case-study photos and avatars |
| Compiler | **React Compiler** (`experiments.reactCompiler`) | Auto-memoizes components | Fewer re-renders without hand-written `useMemo` |
| Lint / typecheck | ESLint (`eslint-config-expo`), `tsc --noEmit` | Quality gates | Run both before calling any task done |
| Build & release | **EAS** (planned) | Cloud builds, store submission, OTA updates | No local Android Studio / Xcode required |

> **Why "no backend" is safe:** the key shipped inside the app (`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
> is *meant* to be public. It grants nothing by itself. Every request carries the signed-in doctor's
> token, and Postgres **Row Level Security** decides row by row what that token may touch. See §7.

---

## 4. How the pieces fit together

The app code is layered. Each layer only talks to the one below it.

```mermaid
flowchart TD
    subgraph L1["1 · Screens — src/app/"]
        S["dashboard.tsx · patients/[id].tsx · account.tsx · book/[token].tsx …<br/><i>What the user sees. Holds form state and navigation.</i>"]
    end

    subgraph L2["2 · Components — src/components/"]
        C["Button · TextInput · BottomSheet · DayCalendar · …Sheet<br/><i>Reusable, screen-agnostic UI.</i>"]
    end

    subgraph L3["3 · Hooks — src/hooks/"]
        H["use-patient · use-day-appointments · use-doctor-profile · …<br/><i>Read data. Loading + error + reload, nothing else.</i>"]
    end

    subgraph L4["4 · Lib — src/lib/"]
        LB["patients.ts · appointments.ts · booking.ts · account.ts · visits.ts<br/><i>Write data. One function per user action.</i>"]
        SUP["supabase.ts — the single configured client"]
    end

    subgraph L5["5 · Cross-cutting"]
        P["providers/ — AuthProvider, ThemeProvider"]
        U["utils/ — dates, validators"]
        K["constants/ — theme, countries"]
        T["lib/database.types.ts — generated from the real schema"]
    end

    SB[("Supabase")]

    S --> C
    S --> H
    S --> LB
    C --> H
    C --> LB
    H --> SUP
    LB --> SUP
    SUP --> SB
    P -.provides session & colors.-> S
    P -.-> C
    U -.-> S
    K -.-> C
    T -.types every query.-> SUP
```

**The rules that keep this tidy:**

- `src/app/` contains **routes only**. Every file there is a screen. Anything reusable lives outside it.
- **Hooks read, lib writes.** If you need a list on screen, it's a hook. If the user pressed a button
  that changes something, it's a `lib/` function.
- **One Supabase client**, created once in `src/lib/supabase.ts` and imported everywhere.
- Imports use the `@/` alias (`@/lib/supabase` → `src/lib/supabase`), configured in `tsconfig.json`.

### Repository map

```
doctor-app/
├── src/
│   ├── app/                   # ROUTES ONLY — every file is a screen
│   │   ├── _layout.tsx        # Root: AuthProvider → ThemeProvider → Stack navigator
│   │   ├── index.tsx          # Animated intro, then redirects to /dashboard or /login
│   │   ├── login.tsx  register.tsx  reset-password.tsx  confirm-signup.tsx
│   │   ├── dashboard.tsx      # Home: greeting, search, quick actions, day calendar, drawer
│   │   ├── add-patient.tsx
│   │   ├── account.tsx        # Profile, photo, password, email, booking link, delete
│   │   ├── patients/
│   │   │   ├── index.tsx      # Patient list (uses the patient_overview view)
│   │   │   ├── [id].tsx       # Patient profile + "Clock in"
│   │   │   └── [id]/details.tsx, [id]/visits.tsx
│   │   └── book/[token].tsx   # 🌐 PUBLIC booking form — no sign-in
│   ├── components/            # 24 reusable pieces: inputs, sheets, calendar, top bar…
│   ├── hooks/                 # 9 data-reading hooks
│   ├── lib/                   # Supabase client + all write operations + generated types
│   ├── providers/             # auth-provider.tsx, theme-provider.tsx
│   ├── constants/             # theme.ts (palettes), countries.ts (dial codes)
│   └── utils/                 # dates.ts, validators.ts
├── supabase/
│   ├── migrations/            # 12 .sql files — the database's entire history
│   ├── templates/             # confirm-signup.html (the sign-up email)
│   └── config.toml            # Supabase CLI settings for local development
├── assets/                    # Icons, splash images, logo
├── app.json                   # Expo config: plugins, permissions, icons, experiments
└── package.json
```

`android/` and `ios/` are **generated** (Continuous Native Generation) and git-ignored. Never edit
them by hand — change `app.json` instead and let Expo regenerate them.

---

## 5. Screens and navigation

Expo Router maps the file tree to URLs. `src/app/patients/[id].tsx` becomes `/patients/abc-123`,
and `[id]` is read with `useLocalSearchParams()`.

```mermaid
flowchart TD
    Start(["App launches"]) --> Intro["index.tsx<br/>heartbeat intro animation"]
    Intro --> Check{"Session found<br/>in storage?"}
    Check -- No --> Login["login.tsx"]
    Check -- Yes --> Dash["dashboard.tsx"]

    Login -- "Sign up" --> Register["register.tsx"]
    Login -- "Forgot password" --> Reset["reset-password.tsx"]
    Register -- "email confirmed" --> Confirm["confirm-signup.tsx"]
    Login -- "signed in" --> Dash
    Confirm --> Dash

    Dash -- "drawer" --> Account["account.tsx"]
    Dash -- "drawer" --> PatientList["patients/index.tsx"]
    Dash -- "Quick action" --> AddPatient["add-patient.tsx"]
    Dash -- "tap search result<br/>or calendar block" --> Patient["patients/[id].tsx"]
    PatientList --> Patient
    Patient --> Visits["patients/[id]/visits.tsx"]
    Patient --> Details["patients/[id]/details.tsx"]

    Public(["🌐 Someone opens the shared link"]) --> Book["book/[token].tsx"]
    Book -. "creates a request<br/>the doctor reviews" .-> Dash

    classDef guarded fill:#ede9fe,stroke:#6F63D6,color:#1B1A33
    classDef open fill:#fff7ed,stroke:#B45309,color:#1B1A33
    class Dash,Account,PatientList,AddPatient,Patient,Visits,Details guarded
    class Book,Login,Register,Reset,Confirm open
```

Purple screens are **guarded**: each one calls `useAuth()` and renders
`<Redirect href="/login" />` when there is no session. That guard is deliberately repeated per
screen rather than hidden in the layout, so a screen is never half-rendered with no user.

The dashboard's "drawer" is a `Modal` with an animated slide-in panel, not a navigator — it holds
navigation links, the theme toggle and Sign out.

---

## 6. The database

### Entity-relationship diagram

```mermaid
erDiagram
    auth_users ||--|| doctor_profiles : "1:1, created by trigger"
    auth_users ||--o{ patients : "doctor owns"
    auth_users ||--o{ appointments : "doctor owns"
    auth_users ||--o{ visits : "doctor owns"
    auth_users ||--o{ booking_requests : "sent to doctor"
    patients ||--o{ appointments : "is booked for"
    patients ||--o{ visits : "has come in"
    booking_requests |o--o| patients : "became, once accepted"

    auth_users {
        uuid id PK "managed by Supabase Auth"
        text email
        timestamptz email_confirmed_at
        jsonb raw_user_meta_data "sign-up form fields"
    }

    doctor_profiles {
        uuid id PK "same value as the auth user id"
        text first_name
        text last_name
        text email "mirrored from auth, read-only"
        text mobile_number
        text specialization
        text license_number
        text profile_photo_url "public URL in the avatars bucket"
        uuid booking_token UK "the secret in the public booking link"
        timestamptz created_at
        timestamptz updated_at "kept current by a trigger"
    }

    patients {
        uuid id PK
        uuid doctor_id FK
        text first_name "required"
        text last_name "optional"
        text email
        text mobile_number
        date date_of_birth
        text medical_history
        text case_notes "notes or photo required"
        text case_photo_path "path in the private case-photos bucket"
        timestamptz created_at
    }

    appointments {
        uuid id PK
        uuid doctor_id FK
        uuid patient_id FK
        timestamptz appointment_date "start time"
        integer duration_minutes "5-480, default 30"
        text status "scheduled / completed / cancelled / no_show"
        text notes
        timestamptz created_at
    }

    visits {
        uuid id PK
        uuid doctor_id FK "defaults to auth.uid()"
        uuid patient_id FK
        timestamptz visited_at
        timestamptz created_at
    }

    booking_requests {
        uuid id PK
        uuid doctor_id FK
        text full_name
        text mobile_number
        timestamptz preferred_at
        text note
        text status "pending / accepted / declined"
        uuid patient_id FK "set when accepted"
        timestamptz created_at
    }

    booking_throttle {
        uuid doctor_id FK
        text ip_hash "md5 of IP + doctor id, never the raw IP"
        timestamptz attempted_at
    }
```

**Appointment vs visit — the distinction that confuses everyone first time:**

- An **appointment** is a *plan*: "Ravi, Thursday 4:30 PM, 30 minutes." It lives on the calendar.
- A **visit** is a *fact*: "Ravi walked in at 4:34 PM." It is created by the "Clock in" button and
  builds the patient's history. A visit needs no appointment, and an appointment may never become one.

### Table notes

- **`doctor_profiles`** shares its primary key with `auth.users`. A doctor's id *is* their user id,
  which is why `doctor_id` everywhere points at `auth.users`.
- **`email` is mirrored, not authoritative.** Triggers copy it from `auth.users` at sign-up and on
  every email change, and a column-level grant means the app cannot write it directly.
- **Every child row cascades.** Delete the auth user → profile, patients, visits, appointments and
  booking requests all go with it. Storage files do *not* cascade (see §8, Delete account).
- **`booking_throttle` is deliberately forgetful.** Rows older than an hour are deleted on the next
  write, so it never becomes a log of who visited which doctor's form.

### The view

`patient_overview` is the patient list's query, kept in SQL instead of the client:

```sql
select p.id, p.first_name, p.last_name, p.mobile_number, p.created_at,
       count(v.id)::integer as visit_count,
       max(v.visited_at)   as last_visit_at
from patients p
left join visits v on v.patient_id = p.id
group by p.id;
```

It is created `with (security_invoker = true)` — meaning it runs with **the caller's** permissions,
not the view owner's, so RLS still applies and no doctor can see another's patients through it.
Forgetting that flag is one of the classic Postgres data leaks.

### Triggers and functions

```mermaid
flowchart LR
    subgraph Triggers["Triggers — fire automatically"]
        T1["on_auth_user_created<br/>→ handle_new_user()"] --> D1["Creates the doctor_profiles row<br/>from the sign-up form's metadata"]
        T2["on_auth_user_email_changed<br/>→ handle_user_email_change()"] --> D2["Copies the new email into doctor_profiles"]
        T3["doctor_profiles_set_updated_at<br/>→ set_updated_at()"] --> D3["Stamps updated_at on every edit"]
    end

    subgraph RPC["RPC functions — the app calls these by name"]
        R1["cancel_signup(token_hash)"] --> E1["Deletes an unconfirmed account<br/>🔓 anon + authenticated"]
        R2["booking_form_doctor(token)"] --> E2["Name + specialization for the form header<br/>🔓 anon + authenticated"]
        R3["submit_booking_request(…)"] --> E3["Validates, rate-limits, inserts the request<br/>🔓 anon + authenticated"]
        R4["regenerate_booking_token()"] --> E4["New link; the old one dies<br/>🔒 authenticated"]
        R5["delete_account()"] --> E5["Deletes the signed-in auth user<br/>🔒 authenticated"]
        R6["caller_ip()"] --> E6["Reads the request's IP header<br/>⛔ internal only"]
    end
```

Every one of these is `security definer`, meaning **it runs with the owner's rights, not the
caller's** — that's how an anonymous visitor can insert a booking request without having any
permission on the `booking_requests` table. Each also sets `search_path = ''` and is explicitly
`revoke`d from `public` before being granted to just the roles that need it. That trio
(`security definer` + empty search path + narrow grants) is the standard safe recipe.

---

## 7. The security model — Row Level Security

This is the most important idea in the project, so here it is slowly.

Normally an app protects data in its backend code: "if user.id != patient.doctor_id, return 403."
We have no backend code to put that check in. Instead, **the rules live in the database** as RLS
policies, and Postgres applies them to every single query — even one typed by hand into a SQL
console with a stolen key.

A policy is just a SQL condition attached to a table:

```sql
create policy "Doctors read own patients" on public.patients
  for select to authenticated
  using ((select auth.uid()) = doctor_id);
```

`auth.uid()` is the user id taken from the JWT that supabase-js attached to the request. So the
query `select * from patients` silently becomes `select * from patients where doctor_id = <me>`.
There is no way to opt out of it from the client.

```mermaid
flowchart TD
    A["Any request arrives"] --> B{"Which key/token?"}
    B -- "anon key,<br/>no session" --> C["Role: anon"]
    B -- "publishable key +<br/>signed-in JWT" --> D["Role: authenticated<br/>auth.uid() = doctor's id"]

    C --> E["❌ All table access revoked"]
    E --> F["✅ Only 3 RPC functions:<br/>booking_form_doctor,<br/>submit_booking_request,<br/>cancel_signup"]
    F --> G["Those run as their owner<br/>and write only what they're told to"]

    D --> H{"RLS policy on the table"}
    H -- "row.doctor_id = auth.uid()" --> I["✅ Row visible / writable"]
    H -- "anything else" --> J["❌ Row simply doesn't exist<br/>for this request"]

    I --> K["Extra check on appointments & visits:<br/>the patient must also belong to you"]

    classDef ok fill:#ecfdf5,stroke:#059669,color:#064e3b
    classDef no fill:#fef2f2,stroke:#dc2626,color:#7f1d1d
    class F,G,I,K ok
    class E,J no
```

Four layers of defence, from outside in:

1. **Role grants.** `revoke all … from anon` — a signed-out visitor has no table access at all.
2. **RLS policies.** Per-row ownership checks on every table, for select/insert/update/delete
   separately. `appointments` and `visits` go further: their insert/update policies also require
   that the referenced patient belongs to you, so you cannot attach an appointment to a stranger.
3. **Column grants.** `doctor_profiles` update is granted only on the six editable columns —
   `email`, `id` and the timestamps are not writable by the app at all.
4. **Function boundaries.** Public actions happen only through `security definer` functions that
   validate their input, so the public surface is three named functions instead of a table.

### Storage buckets

| Bucket | Public? | Limit | Holds | Path convention |
| --- | --- | --- | --- | --- |
| `case-photos` | **Private** | 10 MB, images only | Patient case-study photos | `<doctor_id>/<random>.jpg` |
| `avatars` | Public | 5 MB, images only | Doctor profile photos | `<doctor_id>/avatar-<timestamp>.jpg` |

Case photos are uploaded and deleted by the app, but nothing reads one back yet — the patient
details screen shows the case *notes* only. Displaying the photo will need a signed URL, since
the bucket is private. Avatars are in a public bucket precisely because the profile photo is
rendered from a plain URL stored in `doctor_profiles.profile_photo_url`.

Storage policies match on the **first folder segment** of the object path:

```sql
using (bucket_id = 'case-photos'
       and (storage.foldername(name))[1] = (select auth.uid())::text)
```

So the folder name *is* the permission. A doctor can only read, write or delete inside the folder
named after their own user id.

### Rate limiting the public form

The booking form is the only door open to the internet, so `submit_booking_request` guards it twice:

- **Per phone number:** at most 3 *pending* requests to one doctor.
- **Per IP, per doctor:** at most 30 per hour, counted in `booking_throttle`.

The IP is never stored raw — it is `md5(ip || doctor_id)`, so the same visitor hashes differently
for each doctor and the rows cannot be joined into a browsing history. The IP itself is read from
`cf-connecting-ip` (set by Cloudflare's edge, un-spoofable) falling back to the **rightmost** entry
of `x-forwarded-for` — the leftmost entry is attacker-controlled, a detail that trips up most
hand-rolled rate limiters.

---

## 8. Key flows, step by step

### 8.1 Sign-up and email confirmation

```mermaid
sequenceDiagram
    actor D as Doctor
    participant App as "register.tsx"
    participant Auth as Supabase Auth
    participant Mail as Email
    participant DB as Postgres

    D->>App: Fills name, email, phone, password
    App->>App: Client-side validators (utils/validators.ts)
    App->>Auth: signUp(email, password, {data: {first_name, last_name, mobile_number},<br/>emailRedirectTo: createURL('/confirm-signup')})
    Auth->>DB: insert into auth.users
    DB-->>DB: TRIGGER handle_new_user()<br/>creates the doctor_profiles row
    Auth->>Mail: Sends the confirm-signup.html email
    Auth-->>App: No session yet
    App-->>D: "We sent an email to …"

    alt Doctor taps Confirm
        D->>Mail: Taps Confirm
        Mail->>App: Opens doctorapp://confirm-signup?token_hash=…
        App->>Auth: verifyOtp({token_hash, type: 'email'})
        Auth-->>App: Session ✅
        App->>D: Redirect to /dashboard
    else Doctor taps Cancel ("this wasn't me")
        D->>Mail: Taps Cancel
        Mail->>App: Opens …/confirm-signup?action=cancel&token_hash=…
        App-->>D: Asks for one more tap to confirm
        D->>App: Confirms
        App->>DB: rpc('cancel_signup', {token_hash})
        DB-->>DB: Deletes the unconfirmed auth user (profile cascades)
    end
```

Two details worth copying into your own projects:

- **Nothing happens on a plain link fetch.** Corporate mail scanners follow every link in an email.
  Confirmation runs in the app, and cancelling needs a second tap, so a scanner can't confirm or
  destroy an account by accident.
- **Tokens are single-use**, so `confirm-signup.tsx` keeps a `useRef` guard to survive React's
  development-mode double-run of effects.

### 8.2 Sessions — staying signed in

```mermaid
flowchart LR
    A["supabase.auth.signInWithPassword()"] --> B["Session: access token + refresh token"]
    B --> C{"Platform?"}
    C -- "iOS / Android" --> D["expo-sqlite's localStorage shim<br/>(lib/auth-storage.ts)"]
    C -- "Web" --> E["window.localStorage<br/>(lib/auth-storage.web.ts)"]
    D --> F["AuthProvider reads it on launch"]
    E --> F
    F --> G["session in React context<br/>useAuth() everywhere"]
    G --> H["Auto-refresh while the app is<br/>in the foreground only (AppState)"]
```

`AuthProvider` also solves a subtle problem: when a doctor changes their email, the confirmation
happens in *Supabase*, not in the app, so the stored session never hears about it. While a change
is pending the provider polls `getUser()` every 10 seconds (and whenever the app returns to the
foreground), refreshes the session once the address differs, and raises `emailChangedTo` so
`EmailChangedModal` can announce it.

### 8.3 Adding a patient with a case photo

```mermaid
sequenceDiagram
    actor D as Doctor
    participant Screen as "add-patient.tsx"
    participant Lib as "lib/patients.ts"
    participant St as "Storage (case-photos)"
    participant DB as patients table

    D->>Screen: Name, phone, notes and/or a photo
    Screen->>Lib: addPatient({doctorId, firstName, mobileNumber, caseNotes, casePhoto})
    alt A photo was chosen
        Lib->>Lib: readImage(asset) — platform-specific (§9)
        Lib->>St: upload to doctorId/random.jpg
        St-->>Lib: ok / error
    end
    Lib->>DB: insert patient row with case_photo_path
    alt Insert fails
        Lib->>St: remove the just-uploaded photo
        Note over Lib: No orphaned file left behind
    end
    Lib-->>Screen: '' on success, else a message
    Screen->>D: Goes back to the dashboard
```

The database enforces the business rule with a `check` constraint: a patient must have **case notes
or a case photo** — an empty record is rejected by Postgres, not just by the form.

### 8.4 Scheduling an appointment (clash detection)

```mermaid
flowchart TD
    A["Doctor taps an empty 30-min slot<br/>on the day calendar"] --> B["ScheduleAppointmentSheet opens"]
    B --> C["Pick patient, start time, duration"]
    C --> D["useBookedSlots(from, to) loads<br/>nearby appointments"]
    D --> E["Query looks back 60 minutes<br/>— the longest bookable appointment"]
    E --> F["clashingSlots&#40;&#41;: keep any slot that starts<br/>before the block ends AND ends after it starts"]
    F --> G{"Any overlap?"}
    G -- Yes --> H["⚠️ Warn: 'runs into Ravi Kumar's appointment'"]
    G -- No --> I["addAppointment() inserts the row"]
    H --> J["Doctor changes the time,<br/>or books anyway"]
    J --> I
    I --> K["reload() — the calendar refetches"]

    classDef warn fill:#fef6e7,stroke:#B45309,color:#1B1A33
    class H,J warn
```

**Why look back an hour?** A 60-minute appointment starting at 3:30 overlaps a 4:00 slot even
though its *start* is outside the window. Querying only `start >= windowStart` would miss it. This
is the classic interval-overlap bug, and the fix is the standard overlap test shown above —
note that appointments which merely touch end-to-start are *not* a clash.

### 8.5 The public booking form, end to end

```mermaid
sequenceDiagram
    actor P as Patient (not signed in)
    participant Form as "book/[token].tsx"
    participant Fn as "submit_booking_request()"
    participant BR as booking_requests
    actor D as Doctor
    participant Dash as "Dashboard"
    participant Accept as "acceptBookingRequest()"

    D->>Dash: Account → Booking form link → shares the URL
    P->>Form: Opens /book/TOKEN
    Form->>Fn: booking_form_doctor(token)
    Fn-->>Form: "Dr. Priya Sharma · Dermatology"
    P->>Form: Name, phone, preferred time, note
    Form->>Fn: submit_booking_request(...)
    Fn->>Fn: Valid token? Sensible time? Under both rate limits?
    Fn->>BR: insert (status = 'pending')
    Fn-->>Form: true
    Form-->>P: "Request sent"

    Note over Dash: Next time the dashboard is focused
    Dash->>BR: select pending requests
    Dash-->>D: Banner: "2 appointment requests"
    D->>Dash: Reviews one, picks a time and duration
    Dash->>Accept: acceptBookingRequest(request, doctorId, start, duration)
    Accept->>Accept: Find the patient by phone, or create one
    Accept->>Accept: Insert the appointment
    Accept->>BR: status = 'accepted', patient_id = …
```

Request lifecycle:

```mermaid
stateDiagram-v2
    [*] --> pending: patient submits the form
    pending --> accepted: doctor books a time<br/>(patient + appointment created)
    pending --> declined: doctor declines
    accepted --> [*]
    declined --> [*]
```

And an appointment's own states, from the `check` constraint on `appointments.status`:

```mermaid
stateDiagram-v2
    [*] --> scheduled
    scheduled --> completed: the patient was seen
    scheduled --> cancelled: called off
    scheduled --> no_show: didn't turn up
    note right of cancelled
        Calendar queries filter with
        .neq('status', 'cancelled')
    end note
```

Regenerating the token (Account → Booking form link → Regenerate) issues a new UUID, which
instantly kills every copy of the old link — useful if it ends up somewhere it shouldn't.

### 8.6 Deleting the account

```mermaid
flowchart TD
    A["Doctor confirms deletion"] --> B["Re-enter password"]
    B --> C["verifyPassword(): sign in again with it"]
    C -- wrong --> D["❌ 'Your current password is incorrect.'"]
    C -- correct --> E["Delete every file in the doctor case-photos folder"]
    E --> F["Delete every file in the doctor avatars folder"]
    F --> G["rpc('delete_account') → deletes the auth user"]
    G --> H["Postgres cascade removes profile,<br/>patients, visits, appointments, requests"]
    H --> I["signOut({scope: 'local'}) clears the dead session"]

    classDef warn fill:#fef2f2,stroke:#dc2626,color:#7f1d1d
    class D warn
```

**Storage first, database second** — and this order is not optional. SQL cannot delete storage
objects, so once the auth user is gone the app has no permission to reach those folders and the
files would be stranded forever.

Sensitive actions (change password, change email, delete account) all re-verify the password by
signing in again. It costs one request and stops someone using an unlocked, unattended phone.

---

## 9. Cross-platform: how one codebase serves three platforms

React Native's bundler picks `foo.web.ts` over `foo.ts` when building for web. The project uses
this twice, and both times for the same reason — a native module simply doesn't exist in a browser:

| Concern | `*.ts` (iOS/Android) | `*.web.ts` (browser) |
| --- | --- | --- |
| Session storage | `expo-sqlite`'s `localStorage` shim | `window.localStorage`, guarded because there is no `window` during static rendering |
| Reading a picked image | `expo-file-system`'s `File(...).arrayBuffer()` | The browser `File` object the picker hands back, or `fetch(uri).blob()` |

Elsewhere, `Platform.OS` handles smaller differences inline — for example `bookingFormUrl()` falls
back to `window.location.origin` on web when `EXPO_PUBLIC_WEB_URL` isn't set.

Web output is configured as `static` in `app.json`, which is what makes `/book/<token>` a real,
shareable, server-rendered URL rather than something that only exists inside a running app.

---

## 10. State management and the data-loading pattern

There is **no Redux, Zustand or React Query here**. State is split three ways:

| Kind of state | Where it lives | Example |
| --- | --- | --- |
| Global, app-wide | React Context providers | `session` (AuthProvider), `colors`/`mode` (ThemeProvider) |
| Server data | Per-screen hooks in `src/hooks/` | the day's appointments, one patient, the profile |
| Form/UI state | `useState` in the screen | text fields, which bottom sheet is open |

Every data hook follows the same shape, and reading one means you can read all nine:

```mermaid
flowchart TD
    A["Screen calls useDayAppointments(day)"] --> B["useFocusEffect fires<br/>on mount and on every re-focus"]
    B --> C["let cancelled = false"]
    C --> D["supabase.from(...).select(...)"]
    D --> E{"cancelled?"}
    E -- "yes — screen left,<br/>or args changed" --> F["Throw the result away"]
    E -- no --> G["setResult({day, appointments, error})"]
    G --> H{"result.day === day?"}
    H -- "no — belongs to a<br/>day we've navigated past" --> I["Report loading, not stale data"]
    H -- yes --> J["Return {appointments, loading, error, reload}"]
    J --> K["reload() bumps a version counter<br/>→ refetch, old data stays on screen"]
```

Three problems that pattern solves, all of which bite real apps:

1. **Stale writes.** The `cancelled` flag stops a slow response from overwriting newer data.
2. **Mismatched results.** Storing the *argument* alongside the result (`result.day === day`) means
   yesterday's appointments never flash up under today's heading.
3. **Refresh after changes elsewhere.** `useFocusEffect` refetches when you come back to a screen,
   so deleting a patient on one screen is reflected on the calendar without any global store.

`usePatientSearch` adds a 300 ms debounce and strips characters that are special in PostgREST
filters and `LIKE` patterns before building its `or(...)` query.

---

## 11. UI, theming and components

Theming is a context, not a stylesheet. `src/constants/theme.ts` exports two palettes with
identical keys (`primary`, `background`, `surface`, `text`, `error`, …). `ThemeProvider` picks one
from the OS colour scheme, lets the user override it with the drawer toggle, and every component
reads it with `useTheme()` and applies colours inline:

```tsx
const { colors } = useTheme()
<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
```

Static layout lives in `StyleSheet.create`; only colours are dynamic. That keeps the fast path fast
while making dark mode a one-line change.

The component library, grouped by job:

```mermaid
flowchart TB
    subgraph Forms["Form building blocks"]
        TI["TextInput<br/>label + error"]
        PI["PhoneInput<br/>country dial codes"]
        BT["Button"]
        DTP["DateTimePicker"]
        DP["DurationPicker"]
    end
    subgraph Chrome["Screen chrome"]
        TB["TopBar"] 
        BB["BackButton"]
        HD["Header"]
        BG["Background"]
        LG["Logo"]
        TT["ThemeToggle"]
        HL["HeartbeatLine"]
    end
    subgraph Sheets["BottomSheet + the sheets built on it"]
        BS["BottomSheet"]
        BS --> SA["ScheduleAppointmentSheet"]
        BS --> AA["AppointmentActionsSheet"]
        BS --> BR["BookingRequestsSheet"]
        BS --> BL["BookingLinkSheet"]
        BS --> CI["ClockInSheet"]
        BS --> PA["PatientActionsSheet"]
        BS --> CE["ChangeEmailSheet"]
        BS --> CP["ChangePasswordSheet"]
        BS --> DA["DeleteAccountSheet"]
        BS --> MC["MonthCalendarSheet"]
    end
    subgraph Calendar["The calendar"]
        DC["DayCalendar<br/>24h × 30-min slots"]
        DC --> SA
        DC --> AA
        DC --> BR
        DC --> MC
    end
```

`DayCalendar` is the densest component: it lays out a full 24-hour day as 48 half-hour slots of
fixed height, positions each appointment as an absolutely-placed block from its start time and
duration, splits overlapping blocks side by side, draws a live "now" line that ticks every minute,
and auto-scrolls to a sensible hour when the day changes.

---

## 12. Configuration

| File | Holds |
| --- | --- |
| `app.json` | App name, scheme (`doctorapp://`), icons, splash, Android package, plugins, permission strings, `typedRoutes` + `reactCompiler` |
| `.env.local` (git-ignored) | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL` |
| `.env.example` | The template to copy — start here |
| `tsconfig.json` | `strict` mode and the `@/*` path alias |
| `supabase/config.toml` | Local Supabase stack settings (ports, auth rules, rate limits) |

Anything prefixed `EXPO_PUBLIC_` is **inlined into the app bundle at build time**. Treat it as
public — a service-role key or any secret must never be named that way, and in this architecture
none is needed on the client at all.

The permission strings in `app.json` (camera, photo library) are the sentences iOS shows in its
permission dialog. They mention patient case studies explicitly, because a vague string is a
common App Store rejection.

---

## 13. Running, building and releasing

```bash
cp .env.example .env.local     # then fill in your Supabase URL and key
npm install
npx expo start                 # dev server: press i, a or w

npx expo lint                  # lint
npx tsc --noEmit               # typecheck   ← run both before calling anything done
npx expo-doctor                # diagnose dependency/config problems
npx expo install <package>     # ALWAYS use this, never npm add — it picks SDK-compatible versions

npm run db:types               # regenerate src/lib/database.types.ts from the linked project
npx supabase migration new <name>   # new migration file
npx supabase db push                # apply migrations to the linked project
```

```mermaid
flowchart LR
    Dev["Local dev<br/>npx expo start"] --> Check["expo lint<br/>tsc --noEmit"]
    Check --> Git["Commit"]
    Git --> Build["eas build<br/>--profile development or production"]
    Build --> CNG["Continuous Native Generation<br/>regenerates ios/ and android/ from app.json"]
    CNG --> Store["eas submit → App Store / Play Store"]
    Git --> OTA["eas update<br/>JS-only changes, no store review"]
    OTA --> Users["Installed apps"]
    Store --> Users
    Git --> Web["expo export --platform web<br/>→ static hosting (this is where /book lives)"]
```

Two Expo rules this project lives by:

- **Never edit `ios/` or `android/` by hand.** They're regenerated from `app.json` on every build,
  so hand edits vanish. Native behaviour is configured through config plugins instead.
- **Expo Go isn't enough.** It only bundles Expo's own native modules. Because this app uses
  `expo-sqlite`, `expo-image-picker` and friends, day-to-day work needs a **development build**
  (`npx expo run:android` locally, or `eas build --profile development`).

Database changes ship as **migrations**: numbered SQL files in `supabase/migrations/`, applied in
filename order and never edited once pushed. To change something, add a new file — the folder is
the schema's full history, and `20260923130000_booking_ip_throttle_limit.sql` (raising the IP limit
from 3 to 30 after real patients on shared clinic wifi hit it) is a good example of that discipline.

---

## 14. Adding a feature — the recipe

Say you want "prescriptions" on a patient's profile.

```mermaid
flowchart TD
    A["1 · Migration<br/>supabase/migrations/TIMESTAMP_prescriptions.sql<br/>table + indexes + RLS policies"] --> B["2 · Push + regenerate types<br/>supabase db push && npm run db:types"]
    B --> C["3 · Read path<br/>src/hooks/use-prescriptions.ts<br/>copy the pattern from use-patient-visits"]
    C --> D["4 · Write path<br/>src/lib/prescriptions.ts<br/>one function per action, returns '' or an error message"]
    D --> E["5 · Screen<br/>src/app/patients/[id]/prescriptions.tsx<br/>+ a link row on patients/[id].tsx"]
    E --> F["6 · UI<br/>reuse Button, TextInput, BottomSheet"]
    F --> G["7 · Verify<br/>npx expo lint && npx tsc --noEmit"]
```

Conventions to match while you're in there:

- RLS on from the first migration — `enable row level security` plus four policies, and
  `revoke all … from anon`. A table without policies is either invisible or wide open; neither is
  what you want to discover later.
- Write functions return `''` on success and an error *message* on failure, so screens can render
  the string directly without try/catch ceremony.
- Hooks return `{ data, loading, error, reload }` — never throw.
- Files, folders and route segments are `kebab-case`; components are `PascalCase`.

---

## 15. What isn't built yet

Honest list, so nobody hunts for code that doesn't exist:

- **No tests.** No Jest, no Detox, no CI pipeline.
- **No EAS config.** `eas.json` and build profiles still need setting up.
- **Google sign-up is a placeholder** — the button shows "coming soon".
- **Password reset is a placeholder.** `reset-password.tsx` exists only so the login screen's
  link resolves; it renders "coming soon".
- **Case-study photos are write-only.** They upload and delete correctly, but no screen displays one.
- **Several tiles are stubs:** Appointments and Settings in the drawer, and the action tiles on the
  patient profile, show "Coming soon".
- **Compliance work is untouched.** This app stores health data, so HIPAA/DPDP obligations,
  at-rest encryption choices, audit logging and data-retention rules are all still open questions.
- **`patients.email`, `date_of_birth` and `medical_history` exist in the schema** but nothing in the
  UI writes them yet.
- **No push notifications** for new booking requests — the dashboard only finds out on focus.
