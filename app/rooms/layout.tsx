import type { Metadata } from 'next'
import { headers } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || 'silentparcel.com'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`

  return {
    title: {
      template: '%s | SilentParcel Rooms',
      default: 'Anonymous Chat Rooms & Collaborative Coding - SilentParcel'
    },
    description: 'Create and join secure, anonymous chat rooms and collaborative coding sessions. Real-time messaging, live code editing, WebRTC communication with end-to-end encryption. No registration required.',
    keywords: [
      'anonymous chat rooms',
      'collaborative coding',
      'real-time chat',
      'secure messaging',
      'ephemeral chat',
      'live code editor',
      'pair programming',
      'webrtc chat',
      'private chat rooms',
      'collaborative development',
      'online code sharing',
      'real-time collaboration',
      'anonymous communication',
      'secure code editor',
      'team collaboration tools'
    ],
    authors: [{ name: 'SilentParcel Team' }],
    creator: 'SilentParcel',
    publisher: 'SilentParcel',
    robots: {
      index: true,
      follow: true,
      nocache: false,
      noarchive: false,
      nosnippet: false,
      noimageindex: false,
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: `${baseUrl}/rooms`,
      siteName: 'SilentParcel',
      title: 'Anonymous Chat Rooms & Collaborative Coding - SilentParcel',
      description: 'Create secure, ephemeral chat rooms and collaborative coding sessions. Real-time messaging and live code editing with end-to-end encryption. No registration required.',
      images: [
        {
          url: `${baseUrl}/api/og?type=rooms`,
          width: 1200,
          height: 630,
          alt: 'SilentParcel - Anonymous Chat Rooms and Collaborative Coding Platform',
          type: 'image/png',
        },
        {
          url: `${baseUrl}/api/og?type=chat-room`,
          width: 1200,
          height: 630,
          alt: 'Secure Anonymous Chat Rooms - SilentParcel',
          type: 'image/png',
        },
        {
          url: `${baseUrl}/api/og?type=code-collab`,
          width: 1200,
          height: 630,
          alt: 'Real-time Collaborative Coding - SilentParcel',
          type: 'image/png',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@silentparcel',
      creator: '@silentparcel',
      title: 'Anonymous Chat Rooms & Collaborative Coding - SilentParcel',
      description: 'Create secure, ephemeral chat rooms and collaborative coding sessions with real-time messaging and live code editing.',
      images: [`${baseUrl}/api/og?type=rooms`],
    },
    alternates: {
      canonical: `${baseUrl}/rooms`,
      languages: {
        'en-US': `${baseUrl}/rooms`,
        'x-default': `${baseUrl}/rooms`,
      },
    },
    other: {
      'application-name': 'SilentParcel Rooms',
      'apple-mobile-web-app-title': 'SilentParcel',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': '#000000',
      'theme-color': '#000000',
    },
    // verification: {
    //   google: process.env.GOOGLE_SITE_VERIFICATION,
    //   yandex: process.env.YANDEX_SITE_VERIFICATION,
    // },
    category: 'Communication & Collaboration',
    classification: 'Chat and Coding Platform',
    appLinks: {
      web: {
        url: `${baseUrl}/rooms`,
        should_fallback: true,
      },
    },
  }
}

interface RoomsLayoutProps {
  children: React.ReactNode
}

export default function RoomsLayout({ children }: RoomsLayoutProps) {
  return (
    <>
      {/* Primary Application Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'SilentParcel Chat Rooms',
            description: 'Secure, anonymous chat rooms and collaborative coding platform with real-time messaging and live code editing capabilities.',
            url: 'https://silentparcel.com/rooms',
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Web Browser',
            browserRequirements: 'Modern browser with WebRTC support',
            softwareVersion: '1.0',
            author: {
              '@type': 'Organization',
              name: 'SilentParcel',
              url: 'https://silentparcel.com'
            },
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Free anonymous chat and collaboration platform'
            },
            featureList: [
              'Anonymous chat rooms',
              'Real-time collaborative coding',
              'End-to-end encrypted messaging',
              'Live cursor tracking',
              'WebRTC communication',
              'Ephemeral sessions',
              'Multi-language code support',
              'No registration required',
              'Self-destructing rooms',
              'Real-time synchronization'
            ],
            screenshot: 'https://silentparcel.com/api/og?type=rooms',
            installUrl: 'https://silentparcel.com/rooms',
            potentialAction: [
              {
                '@type': 'CreateAction',
                name: 'Create Chat Room',
                target: 'https://silentparcel.com/rooms/create',
                description: 'Create a new anonymous chat room'
              },
              {
                '@type': 'JoinAction',
                name: 'Join Room',
                target: 'https://silentparcel.com/rooms',
                description: 'Join an existing chat room'
              }
            ]
          })
        }}
      />

      {/* Chat Room Service Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Anonymous Chat Rooms',
            description: 'Secure, ephemeral chat rooms for anonymous communication without registration or data retention.',
            provider: {
              '@type': 'Organization',
              name: 'SilentParcel'
            },
            serviceType: 'Communication Service',
            areaServed: 'Worldwide',
            availableChannel: {
              '@type': 'ServiceChannel',
              serviceUrl: 'https://silentparcel.com/rooms',
              serviceType: 'Web Application'
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Room Types',
              itemListElement: [
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Chat Room',
                    description: 'Real-time anonymous messaging'
                  }
                },
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Collaborative Coding Room',
                    description: 'Live code editing with multiple participants'
                  }
                }
              ]
            }
          })
        }}
      />

      {/* Collaborative Software Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'SilentParcel Collaborative Coding',
            description: 'Real-time collaborative code editor with live cursor tracking, syntax highlighting, and multi-language support.',
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Web Browser',
            softwareVersion: '1.0',
            programmingLanguage: [
              'JavaScript',
              'TypeScript',
              'Python',
              'Java',
              'C++',
              'HTML',
              'CSS',
              'JSON',
              'Markdown'
            ],
            features: [
              'Real-time collaborative editing',
              'Live cursor tracking',
              'Syntax highlighting',
              'Code completion',
              'Multi-language support',
              'WebRTC communication',
              'Anonymous sessions',
              'File download support'
            ],
            author: {
              '@type': 'Organization',
              name: 'SilentParcel'
            },
            screenshot: 'https://silentparcel.com/api/og?type=code-collab'
          })
        }}
      />

      {/* Privacy and Security Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DigitalDocument',
            name: 'SilentParcel Privacy Policy',
            description: 'Privacy-first approach with end-to-end encryption, anonymous sessions, and ephemeral data storage.',
            author: {
              '@type': 'Organization',
              name: 'SilentParcel'
            },
            datePublished: '2024-01-01',
            keywords: [
              'privacy',
              'end-to-end encryption',
              'anonymous chat',
              'ephemeral messaging',
              'no data retention',
              'secure communication'
            ],
            about: {
              '@type': 'Thing',
              name: 'Privacy Protection Features',
              description: 'No registration required, ephemeral sessions, end-to-end encryption, anonymous usernames, automatic data deletion'
            }
          })
        }}
      />

      {/* Room Features List Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'SilentParcel Room Features',
            description: 'Complete list of features available in SilentParcel chat rooms and collaborative coding sessions',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Anonymous Communication',
                description: 'Chat without revealing your identity or personal information'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Real-time Messaging',
                description: 'Instant message delivery with live typing indicators'
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Collaborative Code Editing',
                description: 'Live code editing with multiple participants and cursor tracking'
              },
              {
                '@type': 'ListItem',
                position: 4,
                name: 'Ephemeral Sessions',
                description: 'Rooms automatically delete after expiration time'
              },
              {
                '@type': 'ListItem',
                position: 5,
                name: 'WebRTC Communication',
                description: 'Peer-to-peer communication for low latency'
              },
              {
                '@type': 'ListItem',
                position: 6,
                name: 'Multi-language Support',
                description: 'Code editing support for 10+ programming languages'
              },
              {
                '@type': 'ListItem',
                position: 7,
                name: 'No Registration Required',
                description: 'Start chatting or coding immediately without account creation'
              },
              {
                '@type': 'ListItem',
                position: 8,
                name: 'End-to-end Encryption',
                description: 'Messages and code are encrypted for privacy and security'
              }
            ]
          })
        }}
      />

      {/* Organization Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'SilentParcel',
            description: 'Privacy-focused platform for secure file sharing, anonymous chat rooms, and collaborative coding.',
            url: 'https://silentparcel.com',
            logo: 'https://silentparcel.com/logo.png',
            foundingDate: '2024',
            sameAs: [
              'https://github.com/SinghAman21/silentparcel'
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'Support',
              url: 'https://silentparcel.com/contact'
            },
            offers: {
              '@type': 'Offer',
              itemOffered: {
                '@type': 'Service',
                name: 'Anonymous Communication Platform',
                description: 'Secure chat rooms and collaborative coding'
              },
              price: '0',
              priceCurrency: 'USD'
            }
          })
        }}
      />

      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How do I create an anonymous chat room?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Click "Create New Room" on the rooms page, choose your room type (chat or collaborative coding), set an expiration time, and share the generated room ID with others.'
                }
              },
              {
                '@type': 'Question',
                name: 'Are the chat rooms really anonymous?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, no registration is required. You can choose any username or let the system generate one. Messages are end-to-end encrypted and rooms are automatically deleted after expiration.'
                }
              },
              {
                '@type': 'Question',
                name: 'What programming languages are supported in collaborative coding?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'We support JavaScript, TypeScript, Python, Java, C++, C, HTML, CSS, JSON, Markdown, and more. The editor includes syntax highlighting and code completion for all supported languages.'
                }
              },
              {
                '@type': 'Question',
                name: 'How long do rooms last?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Rooms are ephemeral and automatically expire based on the time you set when creating them. Options include 30 minutes, 1 hour, or custom durations. All data is permanently deleted when the room expires.'
                }
              },
              {
                '@type': 'Question',
                name: 'Can multiple people edit code simultaneously?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes, collaborative coding rooms support real-time multi-user editing with live cursor tracking. You can see where other participants are typing and editing in real-time.'
                }
              }
            ]
          })
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: 'https://silentparcel.com'
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Rooms',
                item: 'https://silentparcel.com/rooms'
              }
            ]
          })
        }}
      />

      {children}
    </>
  )
}

// Export metadata for better SEO
export const dynamic = 'force-dynamic'
export const revalidate = 3600 // Revalidate every hour