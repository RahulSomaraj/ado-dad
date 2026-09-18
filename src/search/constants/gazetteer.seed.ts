import { LocationKind } from '../schemas/location-term.schema';

/**
 * The Kerala gazetteer. This is what turns "in kollam" into a filter instead of
 * a text token, and it is the piece a generic search library would get wrong:
 * half of Kerala's places are typed under their colonial-era names (Quilon,
 * Trichur, Calicut) or their romanized short forms (TVM, EKM).
 *
 * `slug` is the canonical key. Every alias of a place shares one slug, and that
 * same slug is written onto `Ad.districtSlug` / `Ad.citySlug` in phase S3 — so a
 * match here becomes an equality filter on an indexed field.
 *
 * Coverage note: districts are complete; the town layer lists the places that
 * actually carry ad volume today. Phase S6 mines `search_events` for unmatched
 * location-shaped tokens and proposes additions, so this list grows from real
 * queries rather than guesswork.
 */
export interface SeedLocation {
  slug: string;
  displayName: string;
  kind: LocationKind;
  /** Every spelling users type, including the canonical one. */
  aliases: string[];
  district?: string;
  state?: string;
  /** [longitude, latitude] */
  centroid?: [number, number];
  radiusKmHint?: number;
}

export const STATE_LOCATIONS: SeedLocation[] = [
  {
    slug: 'kerala',
    displayName: 'Kerala',
    kind: LocationKind.STATE,
    aliases: ['kerala', 'keralam', 'kerela'],
    centroid: [76.2711, 10.8505],
    radiusKmHint: 250,
  },
];

export const KERALA_DISTRICTS: SeedLocation[] = [
  {
    slug: 'thiruvananthapuram',
    displayName: 'Thiruvananthapuram',
    kind: LocationKind.DISTRICT,
    aliases: ['thiruvananthapuram', 'trivandrum', 'tvm', 'tvpm', 'anantapuri', 'thiruvanathapuram'],
    state: 'kerala',
    centroid: [76.9366, 8.5241],
    radiusKmHint: 40,
  },
  {
    slug: 'kollam',
    displayName: 'Kollam',
    kind: LocationKind.DISTRICT,
    aliases: ['kollam', 'quilon', 'kollam district', 'kolam'],
    state: 'kerala',
    centroid: [76.6141, 8.8932],
    radiusKmHint: 35,
  },
  {
    slug: 'pathanamthitta',
    displayName: 'Pathanamthitta',
    kind: LocationKind.DISTRICT,
    aliases: ['pathanamthitta', 'pathanpuram district', 'pta'],
    state: 'kerala',
    centroid: [76.787, 9.2648],
    radiusKmHint: 35,
  },
  {
    slug: 'alappuzha',
    displayName: 'Alappuzha',
    kind: LocationKind.DISTRICT,
    aliases: ['alappuzha', 'alleppey', 'allepey', 'alapuzha'],
    state: 'kerala',
    centroid: [76.3388, 9.4981],
    radiusKmHint: 30,
  },
  {
    slug: 'kottayam',
    displayName: 'Kottayam',
    kind: LocationKind.DISTRICT,
    aliases: ['kottayam', 'kotayam', 'ktm'],
    state: 'kerala',
    centroid: [76.5222, 9.5916],
    radiusKmHint: 35,
  },
  {
    slug: 'idukki',
    displayName: 'Idukki',
    kind: LocationKind.DISTRICT,
    aliases: ['idukki', 'iduki'],
    state: 'kerala',
    centroid: [76.972, 9.8497],
    radiusKmHint: 50,
  },
  {
    slug: 'ernakulam',
    displayName: 'Ernakulam',
    kind: LocationKind.DISTRICT,
    aliases: ['ernakulam', 'kochi', 'cochin', 'ekm', 'eranakulam', 'cochi', 'kochin'],
    state: 'kerala',
    centroid: [76.2673, 9.9312],
    radiusKmHint: 40,
  },
  {
    slug: 'thrissur',
    displayName: 'Thrissur',
    kind: LocationKind.DISTRICT,
    aliases: ['thrissur', 'trichur', 'thrissoor', 'trissur'],
    state: 'kerala',
    centroid: [76.2144, 10.5276],
    radiusKmHint: 40,
  },
  {
    slug: 'palakkad',
    displayName: 'Palakkad',
    kind: LocationKind.DISTRICT,
    aliases: ['palakkad', 'palghat', 'pallakad'],
    state: 'kerala',
    centroid: [76.6548, 10.7867],
    radiusKmHint: 45,
  },
  {
    slug: 'malappuram',
    displayName: 'Malappuram',
    kind: LocationKind.DISTRICT,
    aliases: ['malappuram', 'malapuram'],
    state: 'kerala',
    centroid: [76.0711, 11.0509],
    radiusKmHint: 45,
  },
  {
    slug: 'kozhikode',
    displayName: 'Kozhikode',
    kind: LocationKind.DISTRICT,
    aliases: ['kozhikode', 'calicut', 'kozhikkode', 'calicutt'],
    state: 'kerala',
    centroid: [75.7804, 11.2588],
    radiusKmHint: 40,
  },
  {
    slug: 'wayanad',
    displayName: 'Wayanad',
    kind: LocationKind.DISTRICT,
    aliases: ['wayanad', 'wynad', 'vayanad'],
    state: 'kerala',
    centroid: [76.132, 11.6854],
    radiusKmHint: 40,
  },
  {
    slug: 'kannur',
    displayName: 'Kannur',
    kind: LocationKind.DISTRICT,
    aliases: ['kannur', 'cannanore', 'kanur'],
    state: 'kerala',
    centroid: [75.3704, 11.8745],
    radiusKmHint: 40,
  },
  {
    slug: 'kasaragod',
    displayName: 'Kasaragod',
    kind: LocationKind.DISTRICT,
    aliases: ['kasaragod', 'kasargod', 'kasaragode', 'kasargode'],
    state: 'kerala',
    centroid: [75.0, 12.4996],
    radiusKmHint: 40,
  },
];

/**
 * Town / city layer. Matching one of these is *more* specific than its district,
 * which is what drives the relaxation ladder's city → district rung.
 */
export const KERALA_TOWNS: SeedLocation[] = [
  // Kollam district — the reported query's district, so covered densely.
  { slug: 'kollam-town', displayName: 'Kollam Town', kind: LocationKind.CITY, aliases: ['kollam town', 'chinnakada', 'chinnakkada'], district: 'kollam', state: 'kerala', centroid: [76.5917, 8.8932], radiusKmHint: 8 },
  { slug: 'karunagappally', displayName: 'Karunagappally', kind: LocationKind.CITY, aliases: ['karunagappally', 'karunagapally'], district: 'kollam', state: 'kerala', centroid: [76.5361, 9.0544], radiusKmHint: 10 },
  { slug: 'punalur', displayName: 'Punalur', kind: LocationKind.CITY, aliases: ['punalur', 'punaloor'], district: 'kollam', state: 'kerala', centroid: [76.9224, 9.0111], radiusKmHint: 10 },
  { slug: 'kottarakkara', displayName: 'Kottarakkara', kind: LocationKind.CITY, aliases: ['kottarakkara', 'kottarakara'], district: 'kollam', state: 'kerala', centroid: [76.7789, 9.0], radiusKmHint: 10 },
  { slug: 'paravur-kollam', displayName: 'Paravur', kind: LocationKind.CITY, aliases: ['paravur', 'paravoor'], district: 'kollam', state: 'kerala', centroid: [76.6667, 8.8167], radiusKmHint: 8 },
  { slug: 'chavara', displayName: 'Chavara', kind: LocationKind.CITY, aliases: ['chavara'], district: 'kollam', state: 'kerala', centroid: [76.5333, 8.9833], radiusKmHint: 8 },
  { slug: 'kundara', displayName: 'Kundara', kind: LocationKind.CITY, aliases: ['kundara'], district: 'kollam', state: 'kerala', centroid: [76.6833, 8.9333], radiusKmHint: 8 },

  // High-volume towns elsewhere.
  { slug: 'kazhakkoottam', displayName: 'Kazhakkoottam', kind: LocationKind.CITY, aliases: ['kazhakkoottam', 'kazhakootam', 'technopark'], district: 'thiruvananthapuram', state: 'kerala', centroid: [76.8747, 8.5667], radiusKmHint: 8 },
  { slug: 'neyyattinkara', displayName: 'Neyyattinkara', kind: LocationKind.CITY, aliases: ['neyyattinkara'], district: 'thiruvananthapuram', state: 'kerala', centroid: [77.0856, 8.3989], radiusKmHint: 8 },
  { slug: 'attingal', displayName: 'Attingal', kind: LocationKind.CITY, aliases: ['attingal'], district: 'thiruvananthapuram', state: 'kerala', centroid: [76.8158, 8.6961], radiusKmHint: 8 },
  { slug: 'kakkanad', displayName: 'Kakkanad', kind: LocationKind.CITY, aliases: ['kakkanad', 'infopark'], district: 'ernakulam', state: 'kerala', centroid: [76.3419, 10.0158], radiusKmHint: 8 },
  { slug: 'aluva', displayName: 'Aluva', kind: LocationKind.CITY, aliases: ['aluva', 'alwaye'], district: 'ernakulam', state: 'kerala', centroid: [76.3517, 10.1081], radiusKmHint: 8 },
  { slug: 'perumbavoor', displayName: 'Perumbavoor', kind: LocationKind.CITY, aliases: ['perumbavoor', 'perumbavur'], district: 'ernakulam', state: 'kerala', centroid: [76.4747, 10.1072], radiusKmHint: 8 },
  { slug: 'thodupuzha', displayName: 'Thodupuzha', kind: LocationKind.CITY, aliases: ['thodupuzha'], district: 'idukki', state: 'kerala', centroid: [76.7167, 9.8956], radiusKmHint: 10 },
  { slug: 'changanassery', displayName: 'Changanassery', kind: LocationKind.CITY, aliases: ['changanassery', 'changanacherry'], district: 'kottayam', state: 'kerala', centroid: [76.5372, 9.4452], radiusKmHint: 8 },
  { slug: 'pala', displayName: 'Pala', kind: LocationKind.CITY, aliases: ['pala', 'palai'], district: 'kottayam', state: 'kerala', centroid: [76.6833, 9.7111], radiusKmHint: 8 },
  { slug: 'cherthala', displayName: 'Cherthala', kind: LocationKind.CITY, aliases: ['cherthala', 'sherthallai'], district: 'alappuzha', state: 'kerala', centroid: [76.3361, 9.6842], radiusKmHint: 8 },
  { slug: 'guruvayur', displayName: 'Guruvayur', kind: LocationKind.CITY, aliases: ['guruvayur', 'guruvayoor'], district: 'thrissur', state: 'kerala', centroid: [76.0409, 10.5946], radiusKmHint: 8 },
  { slug: 'chalakudy', displayName: 'Chalakudy', kind: LocationKind.CITY, aliases: ['chalakudy', 'chalakkudy'], district: 'thrissur', state: 'kerala', centroid: [76.3344, 10.3], radiusKmHint: 8 },
  { slug: 'ottapalam', displayName: 'Ottapalam', kind: LocationKind.CITY, aliases: ['ottapalam'], district: 'palakkad', state: 'kerala', centroid: [76.3775, 10.7703], radiusKmHint: 8 },
  { slug: 'manjeri', displayName: 'Manjeri', kind: LocationKind.CITY, aliases: ['manjeri'], district: 'malappuram', state: 'kerala', centroid: [76.1194, 11.1204], radiusKmHint: 8 },
  { slug: 'tirur', displayName: 'Tirur', kind: LocationKind.CITY, aliases: ['tirur', 'thirur'], district: 'malappuram', state: 'kerala', centroid: [75.9222, 10.9139], radiusKmHint: 8 },
  { slug: 'vadakara', displayName: 'Vadakara', kind: LocationKind.CITY, aliases: ['vadakara', 'vatakara', 'badagara'], district: 'kozhikode', state: 'kerala', centroid: [75.5983, 11.6006], radiusKmHint: 8 },
  { slug: 'kalpetta', displayName: 'Kalpetta', kind: LocationKind.CITY, aliases: ['kalpetta'], district: 'wayanad', state: 'kerala', centroid: [76.0833, 11.6104], radiusKmHint: 10 },
  { slug: 'thalassery', displayName: 'Thalassery', kind: LocationKind.CITY, aliases: ['thalassery', 'tellicherry'], district: 'kannur', state: 'kerala', centroid: [75.4909, 11.7481], radiusKmHint: 8 },
  { slug: 'kanhangad', displayName: 'Kanhangad', kind: LocationKind.CITY, aliases: ['kanhangad'], district: 'kasaragod', state: 'kerala', centroid: [75.0667, 12.3167], radiusKmHint: 8 },
];

export const ALL_SEED_LOCATIONS: SeedLocation[] = [
  ...STATE_LOCATIONS,
  ...KERALA_DISTRICTS,
  ...KERALA_TOWNS,
];

/**
 * Guard against a silent conflict: a place alias that is also a lexicon word
 * would make "auto in <place>" ambiguous. The seeder asserts this list stays
 * empty — see seed-search.ts.
 */
export const KNOWN_AMBIGUOUS_ALIASES: readonly string[] = [
  // 'pala' is both a Kottayam town and nothing else in the lexicon today.
  // Add entries here (with a comment) when a genuine collision is accepted.
];
