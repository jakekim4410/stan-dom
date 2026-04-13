import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/private/', // 검색에 노출되면 안 되는 폴더가 있다면 설정
    },
    sitemap: 'https://standom.online/sitemap.xml',
  }
}