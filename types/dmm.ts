import { z } from 'zod'

// ------------------------------------
// 共通パーツ
// ------------------------------------
const InfoItemSchema = z.object({
  id: z.number().optional(),
  ruby: z.string().optional(),
  name: z.string().optional(),
})

// ------------------------------------
// DmmItem
// ------------------------------------
export const DmmItemSchema = z.object({
  content_id: z.string(),
  product_id: z.string().optional(),
  title: z.string(),
  volume: z.string().optional(),
  number: z.string().optional(),
  URL: z.string().optional(),
  affiliateURL: z.string(),
  URLsp: z.string().optional(),
  affiliateURLsp: z.string().optional(),
  imageURL: z.object({
    list: z.string().optional(),
    small: z.string().optional(),
    large: z.string().optional(),
  }),
  sampleImageURL: z
    .object({
      sample_s: z.object({ image: z.array(z.string()) }).optional(),
      sample_l: z.object({ image: z.array(z.string()) }).optional(),
    })
    .optional(),
  sampleMovieURL: z
    .object({
      size_476_306: z.string().optional(),
      size_560_360: z.string().optional(),
      size_644_414: z.string().optional(),
      size_720_480: z.string().optional(),
    })
    .optional(),
  prices: z.object({
    price: z.string().optional(),
    list_price: z.string().optional(),
    deliveries: z
      .object({
        delivery: z
          .array(z.object({ type: z.string(), price: z.string() }))
          .optional(),
      })
      .optional(),
  }),
  date: z.string().optional(),
  date_end: z.string().optional(),
  service_code: z.string().optional(),
  service_name: z.string().optional(),
  floor_code: z.string().optional(),
  floor_name: z.string().optional(),
  category_name: z.string().optional(),
  review: z
    .object({
      count: z.number().optional(),
      average: z.string().optional(),
    })
    .optional(),
  iteminfo: z
    .object({
      actress: z.array(InfoItemSchema).optional(),
      genre: z.array(InfoItemSchema).optional(),
      maker: z.array(InfoItemSchema).optional(),
      series: z.array(InfoItemSchema).optional(),
      director: z.array(InfoItemSchema).optional(),
      label: z.array(InfoItemSchema).optional(),
    })
    .optional(),
  campaign: z
    .array(
      z.object({
        date_begin: z.string(),
        date_end: z.string(),
        title: z.string(),
      })
    )
    .optional(),
  jancode: z.string().optional(),
  stock: z.string().optional(),
})

export type DmmItem = z.infer<typeof DmmItemSchema>

export const DmmItemListResponseSchema = z.object({
  result: z.object({
    status: z.number().optional(),
    result_count: z.number(),
    total_count: z.number(),
    first_position: z.number(),
    items: z.array(DmmItemSchema),
  }),
})

export type DmmItemListResponse = z.infer<typeof DmmItemListResponseSchema>

// ------------------------------------
// DmmActress
// ------------------------------------
export const DmmActressSchema = z.object({
  id: z.string(),
  name: z.string(),
  ruby: z.string().optional(),
  bust: z.string().optional(),
  cup: z.string().optional(),
  waist: z.string().optional(),
  hip: z.string().optional(),
  height: z.string().optional(),
  birthday: z.string().optional(),
  blood_type: z.string().optional(),
  hobby: z.string().optional(),
  prefectures: z.string().optional(),
  imageURL: z
    .object({
      small: z.string().optional(),
      large: z.string().optional(),
    })
    .optional(),
  listURL: z
    .object({
      digital: z.string().optional(),
      mono: z.string().optional(),
      monthly: z.string().optional(),
      ppm: z.string().optional(),
      rental: z.string().optional(),
    })
    .optional(),
})

export type DmmActress = z.infer<typeof DmmActressSchema>

export const DmmActressResponseSchema = z.object({
  result: z.object({
    status: z.number().optional(),
    result_count: z.number(),
    total_count: z.number(),
    first_position: z.number(),
    actress: z.array(DmmActressSchema),
  }),
})

export type DmmActressResponse = z.infer<typeof DmmActressResponseSchema>

// ------------------------------------
// Floor
// ------------------------------------
export const DmmFloorSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
})

export const DmmFloorListResponseSchema = z.object({
  result: z.object({
    status: z.number().optional(),
    site: z.array(
      z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        service: z.array(
          z.object({
            id: z.string(),
            code: z.string(),
            name: z.string(),
            floor: z.array(DmmFloorSchema),
          })
        ),
      })
    ),
  }),
})

export type DmmFloorListResponse = z.infer<typeof DmmFloorListResponseSchema>

// ------------------------------------
// Route Handler 用クエリパラメータスキーマ
// ------------------------------------

export const ItemSortSchema = z.enum(['rank', 'date', 'price', '-price', 'review', 'match'])
export type ItemSort = z.infer<typeof ItemSortSchema>

export const ArticleSchema = z.enum(['actress', 'author', 'genre', 'series', 'maker'])
export type Article = z.infer<typeof ArticleSchema>

export const ActressSortSchema = z.enum([
  'id', '-id', 'name', '-name',
  'bust', '-bust', 'waist', '-waist', 'hip', '-hip',
  'height', '-height', 'birthday', '-birthday',
])
export type ActressSort = z.infer<typeof ActressSortSchema>

export const ItemListQuerySchema = z.object({
  site: z.string().default('FANZA'),
  service: z.string().optional(),
  floor: z.string().optional(),
  hits: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(1).max(50000).default(1),
  sort: ItemSortSchema.default('rank'),
  keyword: z.string().optional(),
  cid: z.string().optional(),
  article: ArticleSchema.optional(),
  article_id: z.coerce.number().optional(),
  gte_date: z.string().optional(),
  lte_date: z.string().optional(),
  mono_stock: z.enum(['stock', 'reserve', 'reserve_empty', 'mono']).optional(),
})

export const ActressListQuerySchema = z.object({
  hits: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(1).max(50000).default(1),
  sort: ActressSortSchema.default('id'),
  initial: z.string().optional(),
  keyword: z.string().optional(),
  actress_id: z.coerce.number().optional(),
  gte_bust: z.coerce.number().optional(),
  lte_bust: z.coerce.number().optional(),
  gte_waist: z.coerce.number().optional(),
  lte_waist: z.coerce.number().optional(),
  gte_hip: z.coerce.number().optional(),
  lte_hip: z.coerce.number().optional(),
  gte_height: z.coerce.number().optional(),
  lte_height: z.coerce.number().optional(),
  gte_birthday: z.string().optional(),
  lte_birthday: z.string().optional(),
})
