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

    socials:z.object({
        twitter: z.string().url().optional(),
        streaming: z.string().url().optional(),
        youtube: z.string().url().optional(),
    }).optional(),

    career: z.array(
    z.object({
      date: z.string(), // e.g., "2024 - Present"
      team: z.string(),
      note: z.array(z.string()).optional(), // e.g., "Won OWCS World Finals"
    })
  ).optional(),

})

//schema che descrive il team
const teamSchema=z.object({
    name:z.string(),
    liquipediaName:z.string().optional(),
    region:z.enum(['NA','EMEA','Korea','Pacific','Japan','China']),
    logo:z.string().url().optional(),
    socials:z.object({
    twitter: z.string().url().optional(),
    website: z.string().url().optional(),
    }).optional(),
    achievements: z.array(z.string()).optional(),
})

//rendo questi schema visibili
export const collections={
    'players':defineCollection({
        type:'content', //content vuol dire che scrivo file MD
        schema:playerSchema //indico lo schema che devo seguire
    }),
    'teams':defineCollection({
        type:'content', //content vuol dire che scrivo file MD
        schema:teamSchema //indico lo schema che devo seguire
    })
}