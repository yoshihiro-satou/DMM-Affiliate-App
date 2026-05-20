import 'server-only'

const GRAPHQL_ENDPOINT = 'https://api.video.dmm.co.jp/graphql'

// video.dmm.co.jp が実際に送信しているクエリをそのまま使用（簡略化すると 422 になる）
const QUERY = `query AvSearch($limit: Int!, $offset: Int, $floor: PPVFloor, $sort: ContentSearchPPVSort!, $queryWord: String, $filter: ContentSearchPPVFilterInput, $facetLimit: Int!, $hasFacet: Boolean!, $hasGenreDescription: Boolean!, $legacyProductType: LegacyProductType = DOWNLOAD, $hasLegacyProductType: Boolean!, $isLoggedIn: Boolean!, $excludeUndelivered: Boolean!, $shouldFetchGenreRelatedWords: Boolean!, $shouldFetchDirectorRelatedWords: Boolean!, $shouldFetchLabelRelatedWords: Boolean!, $shouldFetchSeriesRelatedWords: Boolean!, $shouldFetchActressRelatedWords: Boolean!, $shouldFetchMakerRelatedWords: Boolean!, $shouldFetchHistrionRelatedWords: Boolean!, $shouldGetBookmark: Boolean!) {
  legacySearchPPV(
    limit: $limit
    offset: $offset
    floor: $floor
    sort: $sort
    queryWord: $queryWord
    filter: $filter
    facetLimit: $facetLimit
    includeExplicit: true
    excludeUndelivered: $excludeUndelivered
  ) {
    result {
      contents {
        ...searchContent
        contentType
        actresses {
          id
          name
          __typename
        }
        maker {
          id
          name
          __typename
        }
        isInWishList @include(if: $shouldGetBookmark)
        __typename
      }
      facet @include(if: $hasFacet) {
        ...contentSearchFacet
        __typename
      }
      pageInfo {
        ...paginationFragment
        __typename
      }
      isNoIndex
      searchCriteria {
        ...contentSearchCriteria
        __typename
      }
      osusumeGalleryLinks {
        text
        url
        __typename
      }
      __typename
    }
    __typename
  }
}
fragment searchContent on PPVContentSearchContent {
  id
  title
  packageImage {
    mediumUrl
    largeUrl
    __typename
  }
  sampleImages {
    number
    largeUrl
    __typename
  }
  sampleMovie {
    hlsUrl
    mp4Url
    vrUrl
    __typename
  }
  releaseStatus
  review {
    average
    count
    __typename
  }
  isExclusiveDelivery
  bookmarkCount
  salesInfo {
    lowestPrice {
      productId
      price
      discountPrice
      legacyProductType
      __typename
    }
    priceByLegacyProductType(legacyProductType: $legacyProductType) @include(if: $hasLegacyProductType) {
      discountPrice
      price
      legacyProductType
      __typename
    }
    campaign {
      name
      endAt
      __typename
    }
    pointRewardCampaign {
      name
      __typename
    }
    hasMultiplePrices
    __typename
  }
  isOnSale
  deliveryStartAt
  utilizationStatus @include(if: $isLoggedIn)
  __typename
}
fragment contentSearchFacet on PPVContentSearchFacet {
  floor {
    items {
      floor
      count
      __typename
    }
    __typename
  }
  actress {
    items {
      id
      name
      count
      __typename
    }
    __typename
  }
  maker {
    items {
      id
      name
      count
      __typename
    }
    __typename
  }
  label {
    items {
      id
      name
      count
      __typename
    }
    __typename
  }
  series {
    items {
      id
      name
      count
      __typename
    }
    __typename
  }
  genreAndCampaignCombined {
    items {
      ... on GenreFacetItem {
        count
        id
        name
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
}
fragment paginationFragment on OffsetPageInfoWithTotal {
  offset
  limit
  hasNext
  totalCount
  __typename
}
fragment contentSearchCriteria on PPVContentSearchCriteria {
  sort
  filter {
    actressIds {
      ids {
        id
        name
        nameRuby
        relatedWords @include(if: $shouldFetchActressRelatedWords)
        __typename
      }
      op
      __typename
    }
    authorIds {
      ids {
        id
        name
        nameRuby
        __typename
      }
      op
      __typename
    }
    directorIds {
      ids {
        id
        name
        nameRuby
        relatedWords @include(if: $shouldFetchDirectorRelatedWords)
        __typename
      }
      op
      __typename
    }
    genreIds {
      ids {
        id
        name
        relatedWords @include(if: $shouldFetchGenreRelatedWords)
        description @include(if: $hasGenreDescription)
        __typename
      }
      op
      __typename
    }
    histrionIds {
      ids {
        id
        name
        nameRuby
        relatedWords @include(if: $shouldFetchHistrionRelatedWords)
        __typename
      }
      op
      __typename
    }
    labelIds {
      ids {
        id
        name
        relatedWords @include(if: $shouldFetchLabelRelatedWords)
        __typename
      }
      op
      __typename
    }
    makerIds {
      ids {
        id
        name
        relatedWords @include(if: $shouldFetchMakerRelatedWords)
        __typename
      }
      op
      __typename
    }
    seriesIds {
      ids {
        id
        name
        relatedWords @include(if: $shouldFetchSeriesRelatedWords)
        __typename
      }
      op
      __typename
    }
    saleIds {
      ids {
        id
        name
        __typename
      }
      op
      __typename
    }
    pointRewardCampaignIds {
      ids {
        id
        name
        __typename
      }
      op
      __typename
    }
    contentTagIds {
      ids {
        id
        name
        __typename
      }
      op
      __typename
    }
    isSaleItemsOnly
    __typename
  }
  __typename
}`

export type DailyDealContent = {
  id: string
  title: string
  packageImage: { mediumUrl: string; largeUrl: string }
  sampleMovie: { mp4Url: string | null; hlsUrl: string | null } | null
  review: { average: number; count: number } | null
  salesInfo: {
    lowestPrice: { price: number; discountPrice: number | null } | null
    campaign: { name: string; endAt: string } | null
  }
  isOnSale: boolean
  deliveryStartAt: string | null
}

export async function fetchDailyDealContents(limit = 20): Promise<DailyDealContent[]> {
  try {
    const res = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://video.dmm.co.jp',
        'Referer': 'https://video.dmm.co.jp/av/list/?campaign=daily',
      },
      body: JSON.stringify({
        operationName: 'AvSearch',
        query: QUERY,
        variables: {
          excludeUndelivered: false,
          facetLimit: 1,
          filter: {
            isSaleItemsOnly: false,
            saleIds: { ids: [{ id: 'daily' }], op: 'AND' },
          },
          floor: 'AV',
          hasFacet: false,
          hasGenreDescription: false,
          hasLegacyProductType: false,
          isLoggedIn: false,
          limit,
          offset: 0,
          shouldFetchActressRelatedWords: false,
          shouldFetchDirectorRelatedWords: false,
          shouldFetchGenreRelatedWords: false,
          shouldFetchHistrionRelatedWords: false,
          shouldFetchLabelRelatedWords: false,
          shouldFetchMakerRelatedWords: false,
          shouldFetchSeriesRelatedWords: false,
          shouldGetBookmark: false,
          sort: 'RECOMMENDED',
        },
      }),
    })

    if (!res.ok) {
      console.warn('[daily-deals] GraphQL fetch failed:', res.status)
      return []
    }

    const json = await res.json() as {
      data?: { legacySearchPPV?: { result?: { contents?: DailyDealContent[] } } }
    }

    return json.data?.legacySearchPPV?.result?.contents ?? []
  } catch (err) {
    console.warn('[daily-deals] fetchDailyDealContents error:', err)
    return []
  }
}
