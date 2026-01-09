import {defineCollection,z,reference} from 'astro:content';


//schema che descrive il giocatore
const playerSchema=z.object({
    battleTag:z.string(),
    fullName:z.string().optional(),
    role:z.enum(['Tank','Flex DPS','Hitscan DPS','Flex Support','Main Support']),
    team:reference('teams'),
    headshot:z.string().url().optional(),
    isFeatured: z.boolean().optional(), //per indicare che si trova nella homepage
    country: z.string().optional(),
    flagUrl: z.string().url().optional(), // URL to a flag image (e.g., from Cloudinary)
    signatureHeroes:z.array(z.string()).optional(),
    settings: z.object({
      mouse: z.string().optional(),
      dpi: z.number().optional(),
      sens: z.number().optional(),
      crosshair: z.string().optional(),
      monitor: z.string().optional(),
    }).optional(),
    //featuredPovId: z.string().optional(), //POV piu nuovo in caso in cui l'auto-fetch non dia risultati sperati
    socials:z.object({
        twitter: z.string().url().optional(),
        streaming: z.string().url().optional(),
        youtube: z.string().url().optional(),
    }).optional(),
    career: z.array(
    z.object({
      date: z.string(), // e.g., "2024 - Present"
      team: z.string(),
      teamLogo: z.string().optional(),
      note: z.array(z.string()).optional(), // e.g., "Won OWCS World Finals"
    })
  ).optional(),
})

//schema che descrive il team
const teamSchema=z.object({
    name:z.string(),
    FACEITname:z.string().optional(),
    region:z.enum(['NA','EMEA','Korea','Pacific','Japan','China']),
    logo:z.string().url().optional(),
    socials:z.object({
    twitter: z.string().url().optional(),
    website: z.string().url().optional(),
    }).optional(),
    achievements: z.array(z.string()).optional(),
    banner:z.string().url().optional(),
    colour: z.string().optional(),
    coaches: z.array(
    z.object({
      name: z.string(),
      role: z.string(), // "Head Coach", "Assistant Coach", "Analyst"
      headshot: z.string().url().optional(), // Optional: Cloudinary URL
    })
  ).optional(),
})

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lastUpdated: z.date(),
    version: z.string(),
  }),
});

//rendo questi schema visibili
export const collections={
    'players':defineCollection({
        type:'content', //content vuol dire che scrivo file MD
        schema:playerSchema //indico lo schema che devo seguire
    }),
    'teams':defineCollection({
        type:'content', //content vuol dire che scrivo file MD
        schema:teamSchema //indico lo schema che devo seguire
    }),
    'docs': docsCollection
}