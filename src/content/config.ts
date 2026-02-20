import {defineCollection,z,reference} from 'astro:content';

const docsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    lastUpdated: z.date(),
    version: z.string(),
  }),
});


export const collections={
    'docs': docsCollection
}