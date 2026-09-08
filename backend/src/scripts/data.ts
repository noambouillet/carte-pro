export const REF_DATE = new Date("2026-06-01T06:00:00Z");
export const WINDOW_DAYS = 90;

export const SEED = "cartepro-recette-2026-09-05";

export const FIRST_NAMES = [
  "Camille", "Julien", "Amandine", "Karim", "Lucie", "Mehdi", "Sophie", "Thibault",
  "Nadia", "Antoine", "Chloe", "Yanis", "Marion", "Romain", "Fatima", "Baptiste",
  "Aurelie", "Nicolas", "Sarah", "Hugo", "Leila", "Maxime", "Celine", "Pierre",
  "Ines", "Vincent", "Manon", "Kevin", "Elodie", "David",
] as const;

export const LAST_NAMES = [
  "Lefebvre", "Bernard", "Moreau", "Girard", "Rousseau", "Fontaine", "Chevalier",
  "Robin", "Masson", "Sanchez", "Perrin", "Morel", "Fournier", "Andre", "Mercier",
  "Blanc", "Guerin", "Boyer", "Garnier", "Chevallier", "Francois", "Legrand",
  "Gauthier", "Garcia", "Perez", "Roussel", "Henry", "Klein", "Aubert", "Dumont",
] as const;

export const EMAIL_DOMAIN = "ministere-exemple.test";

export type PartnerCategory = "restauration" | "alimentation" | "culture" | "sante" | "mobilite" | "sport";
export interface PartnerSeed {
  name: string;
  category: PartnerCategory;
  region: string;
  objetSocial: string;
}

export const PARTNERS: PartnerSeed[] = [
  {
    name: "Le Comptoir du Midi",
    category: "restauration",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Restauration sur place et vente de repas à emporter",
  },
  {
    name: "Épicerie Sainte-Claire",
    category: "alimentation",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Commerce de détail de produits alimentaires",
  },
  {
    name: "Librairie Vasseur",
    category: "culture",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Vente de livres, presse et fournitures culturelles",
  },
  {
    name: "Pharmacie du Parc",
    category: "sante",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Commerce de détail de produits pharmaceutiques et de santé",
  },
  {
    name: "Transports Régionaux Unifiés",
    category: "mobilite",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Services de transport régional de voyageurs",
  },
  {
    name: "Sport Loisirs Aubagne",
    category: "sport",
    region: "Provence-Alpes-Côte d'Azur",
    objetSocial:
      "Activités sportives et de loisirs",
  },
];

export interface AdminAgentSeed {
  firstName: string;
  lastName: string;
  email: string;
}

export const ADMIN_AGENTS: AdminAgentSeed[] = [
  { firstName: "Claire", lastName: "Marchand", email: `claire.marchand@${EMAIL_DOMAIN}` },
  { firstName: "Samuel", lastName: "Delattre", email: `samuel.delattre@${EMAIL_DOMAIN}` },
];

export const EMPLOYEE_COUNT = 50;
export const TRANSACTIONS_PER_EMPLOYEE = 4;
export const REFUSED_ATTEMPT_COUNT = 5;

export const ZERO_BALANCE_EMPLOYEE_INDICES = [3, 17, 41];
export const LOW_BALANCE_EMPLOYEE_INDICES = [8, 29];
