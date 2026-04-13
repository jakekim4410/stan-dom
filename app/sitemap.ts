import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = 'https://standom.online'

    // 1. 고정된 페이지들 (이미지 파일 구조 참고)
    const routes = [
        '',
        '/login',
        '/privacy',
        '/terms',
        '/auth',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: route === '' ? 1 : 0.8,
    }))

    // 2. 만약 아티스트별 상세 페이지가 있다면?
    // 여기서 DB 데이터를 가져와서(fetch) 배열에 추가하면 수천 개 페이지도 자동 생성됩니다.
    /*
    const artists = await getArtists(); // 예시
    const artistRoutes = artists.map(artist => ({
      url: `${baseUrl}/artist/${artist.id}`,
      lastModified: new Date(),
    }));
    return [...routes, ...artistRoutes];
    */

    return routes
}