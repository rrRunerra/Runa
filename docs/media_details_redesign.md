# Runa Media Details Pages Redesign & Migration Roadmap

This document outlines the architectural changes, component redesigns, and database modifications completed for the **Anime Details Page** (`AnimeDetailsClient.tsx`), along with the exact step-by-step roadmap for migrating other media types (**Manga**, **Games**, **TV Shows**, **Movies**).

---

## 1. Summary of Completed Changes (Anime & Core Shared Components)

### A. Stats Sidebar & Metadata
- **Top Key Stat Cards**:
  - Replaced text rows for Score, Favorites, and Popularity with visual cards at the top of the sidebar.
  - **Average Score Card**: Full-width highlight card displaying score out of 10 (`7.7 / 10`) with vertical hierarchy (Icon badge + stacked label and prominent hero score value). Uses theme `primary` colors (`bg-primary/10`, `border-primary/20`, `text-primary`).
  - **Favorites & Popularity Cards**: 2-column grid with compact number formatting (e.g. `346.3k`, `2k`, `100k`) and full number hover tooltips. Favorites retains Rose (`rose-500`) theme and Popularity retains Blue (`blue-500`) theme.
  - Removed duplicate score, favorites, and popularity rows from the `Information` metadata list.
- **Responsive Metadata Collapse**:
  - Information rows are hidden under a **Show More / Show Less** button on mobile devices (`< lg`).
  - Always **fully expanded** on desktop screens (`lg:` and above), with the toggle button hidden (`lg:hidden`).

### B. Mobile Header Overhaul
- Updated mobile header (< `lg`): Cover image (`w-28 sm:w-36`) sits bottom-left overlapping the banner with action buttons to its right.
- Title renders directly below the cover/actions header row (matching AniList mobile layout).
- Removed attribution badge from banner.

### C. Description Section
- **Renamed Header**: Changed section title from "Synopsis" to **"Description"**.
- **Positioning**: Moved **Description** directly under the desktop title header in the right column.
- **Responsive Heights & Fade Overlay**:
  - Collapsed height: `max-h-20 sm:max-h-28 md:max-h-48 lg:max-h-56` (~8–10 lines of text on desktop).
  - Bottom gradient fade mask (`bg-linear-to-t from-card via-card/70 to-transparent`) and a **Show More $\downarrow$** / **Show Less $\uparrow$** button.

### D. Characters & Voice Actors (`RrMediaCharacters.tsx`)
- **Main Role Priority**: Characters with the **`MAIN`** role are sorted to the top of the list automatically.
- **Responsive Item Limits**:
  - **Mobile (`< md`)**: Displays top 5 characters by default, with **Show More** appearing if character count > 5.
  - **Desktop (`md:`)**: Displays top 10 characters by default, with **Show More** appearing if character count > 10.
- **Un-crammed Spacing**: Expanded grid breakpoints (`grid-cols-1 lg:grid-cols-2`), improved flex weights, and added native hover title tooltips.

### E. Related Media (`RrMediaRelations.tsx`)
- **Mobile Horizontal Scrolling**: Related Anime, Manga, and Other Relations render as **horizontally scrollable rows** (`overflow-x-auto no-scrollbar snap-x snap-mandatory`) on smaller screens (`< sm`) with `w-[260px]` card items, preventing excessive vertical scrolling.
- **Desktop Grid**: Automatically expands into a 2-column grid layout (`sm:grid sm:grid-cols-2`) on tablet/desktop screens (`sm:` and above).

### F. Distribution Charts & Bottom Layout
- Moved **Status & Score Distribution** charts (`RrMediaStatsDashboard`) to the bottom of the right column (below Relations).
- Created **`RrMediaTrailer`** component (`rrMediaTrailer.tsx`) featuring a 16:9 aspect ratio video container, YouTube poster preview, and interactive play button.
- Positioned **Trailer** (`RrMediaTrailer`) and **Friends Activity** (`RrMediaFriendsProgress`) side-by-side in a 2-column grid directly under the distribution charts.
- Restructured **Friends Activity** rows:
  - **Left**: Avatar & Username
  - **Middle**: Centered status & progress badge (e.g. `Watching • Ep 8`)
  - **Right**: User score badge (e.g. `★ 8`)
- Removed duplicate Friends Activity widget from the left sidebar.

### G. Page Footer (`RrMediaFooter.tsx`)
- Created reusable **`RrMediaFooter`**:
  - **Left**: `Data provided by [providers]` (comma-separated links to external media pages like AniList, MyAnimeList).
  - **Right**: `Last updated: [date]`.
- Removed old "Back to Top" button.

### H. Translations & Internationalization (`aquila.*`)
- Added 11 new `aquila.*` translation keys (`averageScore`, `favorites`, `popularity`, `showMore`, `description`, `friendsActivity`, `dataProvidedBy`, `trailer`, `lastUpdated`, `genres`, `planning`) across all **16 supported languages** in `rrScripts/locales/*.js`.
- Automated build scripts (`generate-locales.js`, `check-locales.js`) to mirror translations to `apps/frontend/src/locales/*.json` and `public/locales/*/translation.json`, ensuring 100% language key parity.

### I. Codebase & Database Cleanup (`tags` Removal)
- Completely removed `tags` column from Prisma schemas (`AquilaAnime`, `AquilaManga`, `AquilaGame`) and pushed changes to database (`prisma db push --accept-data-loss`).
- Cleaned up backend services, GraphQL queries, entities, repositories, DTOs, types, and test specs.
- Updated `RrMediaGenres.tsx` to render only **Genres**.
- Removed translation default fallback arguments from `t(...)` calls across all modified files.

---

## 2. Roadmap for Other Media Types

### 1. Manga Details Page (`MangaDetailsClient.tsx`)

#### Tasks to Complete:
- [ ] **Sidebar Key Stats Block**:
  - Add full-width **Average Score** card and 2-column **Favorites & Popularity** grid at the top of sidebar.
  - Make `Information` section collapsible on mobile (`< lg`) and fully shown on desktop (`lg:`).
- [ ] **Mobile Header**:
  - Update cover image position to bottom-left overlapping banner, action buttons to right, title below header row.
- [ ] **Right Column Reordering**:
  - Reorder components: Header $\rightarrow$ Description $\rightarrow$ Genres $\rightarrow$ Characters $\rightarrow$ Relations $\rightarrow$ Status & Score Distribution $\rightarrow$ Friends Activity.
- [ ] **Footer Integration**:
  - Replace inline footer with `<RrMediaFooter providers={mangaProviders} updatedAt={manga.updatedAt} />`.

---

### 2. Game Details Page (`GameDetailsClient.tsx`)

#### Tasks to Complete:
- [ ] **Sidebar Key Stats Block**:
  - Adapt top stat cards for game metrics:
    - **Metacritic Score Card**: Full-width card (`Metacritic / 100`).
    - **Rating & Popularity Grid**: 2-column grid for RAWG rating (`★ 4.2`) and Added count (`Popularity`).
  - Move Game Info (Release Date, Developers, Publishers, Platforms, ESRB) under Information section.
- [ ] **Description & Footer**:
  - Use `RrMediaDescription` with description text and gradient fade toggle.
  - Add `RrMediaFooter` with provider link to RAWG (`https://rawg.io/games/${game.slug}`).

---

### 3. TV Shows & Movies Details Pages (`TvDetailsClient.tsx` / `MovieDetailsClient.tsx`)

#### Tasks to Complete:
- [ ] **Sidebar Key Stats Block**:
  - Adapt top stat cards for TMDB metrics:
    - **TMDB Vote Average Card**: Full-width score card (`7.8 / 10`).
    - **Popularity & Vote Count Grid**: 2-column grid.
  - Move metadata (Status, Seasons/Episodes for TV, Runtime, Budget, Revenue for Movies, Production Companies) into Information section.
- [ ] **Trailer & Friends Activity**:
  - Fetch TMDB YouTube trailer key and pass to `<RrMediaTrailer trailer={{ id: tv.trailerKey, site: "youtube" }} />`.
  - Place `RrMediaTrailer` and `RrMediaFriendsProgress` side-by-side in a 2-column grid below status/score distribution.
- [ ] **Footer**:
  - Add `RrMediaFooter` with provider link to TMDB (`https://www.themoviedb.org`).

---

## 3. Checklist of Reusable Details Components

| Component | File Path | Status |
| :--- | :--- | :--- |
| `RrMediaTrailer` | [`rrMediaTrailer.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaTrailer.tsx) | ✅ Completed |
| `RrMediaFooter` | [`rrMediaFooter.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaFooter.tsx) | ✅ Completed |
| `RrMediaDescription` | [`rrMediaDescription.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaDescription.tsx) | ✅ Completed |
| `RrMediaCharacters` | [`rrMediaCharacters.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaCharacters.tsx) | ✅ Completed |
| `RrMediaStatsDashboard` | [`rrMediaStatsDashboard.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaStatsDashboard.tsx) | ✅ Completed |
| `RrMediaFriendsProgress` | [`rrMediaFriendsProgress.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaFriendsProgress.tsx) | ✅ Completed |
| `RrMediaGenres` | [`rrMediaGenres.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaGenres.tsx) | ✅ Completed |
| `RrMediaRelations` | [`rrMediaRelations.tsx`](file:///c:/Users/akari/OneDrive/Documents/GitHub/Runa-Realm/apps/frontend/src/components/rrComponents/aquila/details/rrMediaRelations.tsx) | ✅ Completed |
