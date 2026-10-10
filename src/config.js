// Korisnici aplikacije. Lozinke se podešavaju u Supabase (Authentication -> Users).
export const USERS = [
  { name: 'Recepcija', email: 'recepcija@motelmalena.app' },
  { name: 'Almin', email: 'almin@motelmalena.app' },
  { name: 'Radnik', email: 'radnik@motelmalena.app' },
]

// Supabase traži lozinku od najmanje 6 znakova, pa se ispred lozinke od 4 cifre
// automatski dodaje "Malena-". Korisnik kuca samo 4325, a u Supabase je lozinka "Malena-4325".
export const toPassword = (pin) => `Malena-${String(pin).trim()}`
