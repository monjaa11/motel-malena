# Motel Malena Rezervacije: postavljanje (za Nedima)

Postavljanje traje 30–45 minuta i radi se samo jednom. Programiranje nije potrebno.

**Šta dobijaš na kraju:** aplikaciju na adresi tipa `motel-malena-rez.netlify.app`, koju Recepcija, Almin i Radnik instaliraju na kompjuter i telefone. Svi rezervacije vide uživo. Mjesečni trošak je 0 KM.

**Kako radi:**
- **GitHub** čuva kod.
- **Netlify** isporučuje aplikaciju na uređaje.
- **Supabase** čuva sve podatke: sobe, goste i rezervacije. Također šalje promjene na sve uređaje u roku od sekunde.

---

## 1. GitHub: postavi kod

1. Napravi nalog na github.com s **growdigital.ba@gmail.com**.
2. Desno gore klikni **+ → New repository**.
   - Repository name: `motel-malena`
   - Odaberi **Private** (obavezno).
   - Klikni **Create repository**.
3. Na stranici repozitorija klikni **uploading an existing file**.
4. Raspakuj `motel-malena.zip`. Prevuci **sav sadržaj foldera** (ne sam folder) u prozor preglednika, pa klikni **Commit changes**.
   - Provjeri da su uploadani `package.json`, `netlify.toml`, folder `src`, folder `public` i folder `supabase`.
   - Folder `.github` služi za automatski backup. Ako se ne uploada, aplikacija i dalje radi, samo nema backupa (vidi korak 6).

## 2. Supabase: baza podataka

1. Na supabase.com klikni **Start your project** i prijavi se preko **Continue with GitHub**.
2. Klikni **New project** i popuni:
   - Name: `motel-malena`
   - Database Password: klikni **Generate** i **sačuvaj tu šifru** negdje sigurno.
   - Region: **Central EU (Frankfurt)**, najbliži BiH.
   - Klikni **Create new project** i sačekaj 1–2 minute.
3. **Napravi tabele:** u lijevom meniju otvori **SQL Editor** i klikni **New query**. Otvori fajl `supabase/schema.sql`, kopiraj cijeli sadržaj, zalijepi ga i klikni **Run**. Treba se pojaviti poruka *Success*.
   - Provjera: u meniju **Table Editor** trebaju postojati tabele `rooms` (sa 18 soba), `guests`, `reservations` i `activity_log`.
4. **Zaključaj registraciju:** otvori **Authentication → Sign In / Providers** (u nekim verzijama **Authentication → Providers / Settings**).
   - Isključi **Allow new users to sign up**.
   - Provjeri da je **Allow anonymous sign-ins** isključeno.
   - Klikni **Save**.
5. **Napravi tri korisnika:** otvori **Authentication → Users → Add user → Create new user** i ponovi postupak za svakog korisnika iz tabele. Svaki put uključi **Auto Confirm User** i klikni **Create user**.

   | Korisnik u aplikaciji | Email (upiši tačno ovako) | Password u Supabaseu | Lozinka koju kucaju u aplikaciji |
   |---|---|---|---|
   | Recepcija | `recepcija@motelmalena.app` | `Malena-4325` | `4325` |
   | Almin | `almin@motelmalena.app` | `Malena-5432` | `5432` |
   | Radnik | `radnik@motelmalena.app` | `Malena-6789` | `6789` |

   - Emailovi ne moraju postojati, služe samo kao korisničko ime.
   - Supabase ne prima lozinku kraću od 6 znakova. Zato aplikacija sama dodaje `Malena-` ispred lozinke: korisnik kuca samo `4325`, a u Supabaseu je lozinka `Malena-4325`.
6. **Kopiraj ključeve:** otvori **Project Settings → API** (ili **Data API / API Keys**) i zapiši dvije vrijednosti:
   - **Project URL**, npr. `https://abcdxyz.supabase.co`
   - **anon public** ključ, ili **Publishable key** ako ga nova verzija tako zove

## 3. Netlify: objavi aplikaciju

1. Na netlify.com se prijavi preko **GitHuba**.
2. Klikni **Add new site → Import an existing project → GitHub** i odaberi repozitorij `motel-malena`.
3. Build postavke se popune same iz `netlify.toml`: `npm run build` i `dist`. Ne mijenjaj ih.
4. **PRIJE nego klikneš Deploy**, otvori **Add environment variables** i dodaj dvije varijable:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL iz Supabasea |
   | `VITE_SUPABASE_ANON_KEY` | anon / publishable ključ |

5. Klikni **Deploy**. Za 1–2 minute aplikacija je online.
6. Promijeni adresu u nešto kraće: **Site configuration → Change site name**, npr. `motel-malena-rez`. Adresa tada postaje `https://motel-malena-rez.netlify.app`.

> ⚠️ **Ako aplikacija prikazuje poruku "Aplikacija nije povezana s bazom"**, varijable iz koraka 4 nisu upisane ili su upisane pogrešno. Popravi ih u **Site configuration → Environment variables**, pa klikni **Deploys → Trigger deploy → Deploy site**.

## 4. Test prije predaje klijentu

1. Otvori adresu na svom kompjuteru, odaberi **Recepcija** i upiši lozinku `4325`.
2. Napravi jednu probnu rezervaciju.
3. Otvori adresu i na svom telefonu, kao **Almin** s lozinkom `5432`. Rezervacija se mora vidjeti.
4. Provjeri i prijavu kao **Radnik** (`6789`), pa se odjavi (meni ☰ → Odjavi se).
5. Izmijeni rezervaciju na telefonu. Na kompjuteru se izmjena mora pojaviti za 1–2 sekunde, bez osvježavanja.
6. Pokušaj napraviti drugu rezervaciju za **istu sobu u iste dane**. Soba mora biti označena kao zauzeta.
7. Obriši probne rezervacije i goste.

## 5. Instalacija kod klijenta

Pogledaj **UPUTSTVO-ZA-MOTEL.md**. Najbolje je da instalaciju na sva tri uređaja odradiš sam, na licu mjesta. Traje oko 5 minuta.

## 6. Automatski dnevni backup (preporučeno)

Besplatni Supabase plan nema automatske backupe koje možeš preuzeti. Zato GitHub svaki dan u 04:30 preuzme sve podatke i čuva ih 90 dana.

1. Na GitHubu otvori repozitorij **motel-malena → Settings → Secrets and variables → Actions → New repository secret** i dodaj tri secreta:
   - `VITE_SUPABASE_URL`: isto kao na Netlifyju
   - `VITE_SUPABASE_ANON_KEY`: isto kao na Netlifyju
   - `BACKUP_PIN`: `4325` (backup se prijavljuje kao Recepcija)
2. Otvori **Actions → Dnevni backup → Run workflow** da odmah testiraš. Treba se pojaviti zelena kvačica.
3. Backupi se nalaze u **Actions → (pokretanje) → Artifacts**.

Backup ujedno svaki dan "budi" bazu. Supabase pauzira besplatne projekte nakon otprilike sedmicu dana bez korištenja, pa ni to neće biti problem.

> Ako se folder `.github` nije uploadao u koraku 1: na GitHubu klikni **Add file → Create new file**, upiši naziv `.github/workflows/backup.yml`, zalijepi sadržaj tog fajla iz zipa i klikni **Commit**.

## 7. Održavanje: česte situacije

**Izgubljen telefon, nova lozinka ili radnik više ne radi:**
1. U Supabaseu otvori **Authentication → Users**, obriši tog korisnika (npr. `radnik@motelmalena.app`) i napravi ga ponovo (korak 2.5) s novom lozinkom (`Malena-` + nove 4 cifre). Rezervacije ostaju netaknute jer su u bazi, a ne u korisniku.
2. Uređaj na kojem je taj korisnik bio prijavljen gubi pristup. Na novom uređaju se prijavi novom lozinkom.
3. Ako mijenjaš lozinku za **Recepciju**, na GitHubu promijeni i secret `BACKUP_PIN`.

**Novi korisnik:** napravi ga u Supabaseu kao u koraku 2.5 i dodaj ga u fajl `src/config.js` (ime i email), pa uploadaj na GitHub.

**Vraćanje slučajno obrisane rezervacije:**
U Supabaseu otvori **Table Editor → activity_log**. Svako brisanje je zapisano s imenom korisnika i svim podacima rezervacije, pa je možeš ručno vratiti.

**Klijent želi izmjenu** (nova soba, novo polje…):
- **Soba:** u **Table Editor → rooms** dodaj red. Polje `id` je broj sobe, a `capacity` broj osoba.
- **Ostale izmjene:** urade se u kodu i uploadaju na GitHub. Netlify sam objavi novu verziju, a uređaji je dobiju pri sljedećem otvaranju.

**Lokalno pokretanje** (opcionalno, ako instaliraš Node.js):
```
npm install
cp .env.example .env   # pa upiši svoje Supabase podatke
npm run dev
```

---

### Tehnički sažetak
- React + Vite, PWA (instalira se na Android, iPhone i Windows; ima offline keš same aplikacije)
- Supabase Postgres:
  - Zaštita od duple rezervacije je u bazi (`EXCLUDE` ograničenje na sobu i period).
  - RLS: pristup ima samo prijavljeni korisnik.
  - Realtime za rezervacije i goste.
  - Dnevnik svih izmjena ide u `activity_log` putem triggera.
- Prijava: tri korisnika (Recepcija, Almin, Radnik) s lozinkom od 4 cifre. Prijava se radi jednom po uređaju i ostaje zapamćena.
