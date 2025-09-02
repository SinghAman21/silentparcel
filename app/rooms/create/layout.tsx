import type { Metadata } from 'next'
import { headers } from 'next/headers'

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || 'silentparcel.com'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`

  return {
    title: {
      template: '%s | Create Room - SilentParcel',
      default: 'Create Anonymous Chat Room & Collaborative Coding Session - SilentParcel'
    },
    description: 'Create secure, anonymous chat rooms and collaborative coding sessions instantly. No registration required. Choose from real-time messaging or live code editing with multi-language support. Ephemeral rooms with end-to-end encryption.',
    keywords: [
      'create anonymous chat room',
      'create collaborative coding session',
      'anonymous room creator',
      'secure chat room generator',
      'ephemeral messaging room',
      'live code collaboration',
      'private chat room maker',
      'instant room creation',
      'no registration chat',
      'secure room generator',
      'collaborative development room',
      'real-time coding session',
      'temporary chat room',
      'encrypted messaging room',
      'anonymous collaboration tool'
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
      url: `${baseUrl}/rooms/create`,
      siteName: 'SilentParcel',
      title: 'Create Anonymous Chat Room & Collaborative Coding Session - SilentParcel',
      description: 'Instantly create secure, ephemeral chat rooms and collaborative coding sessions. No registration required. Real-time messaging and live code editing with end-to-end encryption.',
      images: [
        {
          url: `${baseUrl}/api/og?type=create-room`,
          width: 1200,
          height: 630,
          alt: 'Create Anonymous Chat Room and Collaborative Coding Session - SilentParcel',
          type: 'image/png',
        },
        {
          url: `${baseUrl}/api/og?type=room-creator`,
          width: 1200,
          height: 630,
          alt: 'Anonymous Room Creator - SilentParcel',
          type: 'image/png',
        },
        {
          url: `${baseUrl}/api/og?type=instant-collaboration`,
          width: 1200,
          height: 630,
          alt: 'Instant Collaboration Platform - SilentParcel',
          type: 'image/png',
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@silentparcel',
      creator: '@silentparcel',
      title: 'Create Anonymous Chat Room & Collaborative Coding Session',
      description: 'Instantly create secure, ephemeral rooms for anonymous chat and collaborative coding. No registration required.',
      images: [`${baseUrl}/api/og?type=create-room`],
    },
    alternates: {
      canonical: `${baseUrl}/rooms/create`,
      languages: {
        'en-US': `${baseUrl}/rooms/create`,
        'x-default': `${baseUrl}/rooms/create`,
      },
    },
    other: {
      'application-name': 'SilentParcel Room Creator',
      'apple-mobile-web-app-title': 'Room Creator',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'format-detection': 'telephone=no',
      'mobile-web-app-capable': 'yes',
      'msapplication-TileColor': '#000000',
      'theme-color': '#000000',
      'og:image:alt': 'Create secure anonymous chat rooms and collaborative coding sessions',
    },
    // verification: {
    //   google: process.env.GOOGLE_SITE_VERIFICATION,
    //   yandex: process.env.YANDEX_SITE_VERIFICATION,
    //   bing: process.env.BING_SITE_VERIFICATION,
    // },
    category: 'Room Creation Tool',
    classification: 'Anonymous Communication Platform',
    appLinks: {
      web: {
        url: `${baseUrl}/rooms/create`,
        should_fallback: true,
      },
    },
  }
}

interface CreateRoomLayoutProps {
  children: React.ReactNode
}

export default function CreateRoomLayout({ children }: CreateRoomLayoutProps) {
  return (
    <>
      {/* Room Creation Tool Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'SilentParcel Room Creator',
            description: 'Instant room creation tool for anonymous chat and collaborative coding sessions with end-to-end encryption and ephemeral storage.',
            url: 'https://silentparcel.com/rooms/create',
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Web Browser',
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
              description: 'Free anonymous room creation service'
            },
            featureList: [
              'Instant room creation',
              'Anonymous chat rooms',
              'Collaborative coding sessions',
              'No registration required',
              'End-to-end encryption',
              'Ephemeral sessions',
              'Multi-language code support',
              'Self-destructing rooms',
              'Real-time collaboration',
              'WebRTC communication'
            ],
            screenshot: 'https://silentparcel.com/api/og?type=create-room',
            potentialAction: [
              {
                '@type': 'CreateAction',
                name: 'Create Chat Room',
                description: 'Create a new anonymous chat room',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://silentparcel.com/rooms/create?type=chat'
                }
              },
              {
                '@type': 'CreateAction',
                name: 'Create Coding Session',
                description: 'Create a new collaborative coding session',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://silentparcel.com/rooms/create?type=code'
                }
              }
            ]
          })
        }}
      />

      {/* Room Creation Service Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Anonymous Room Creation Service',
            description: 'Create secure, ephemeral chat rooms and collaborative coding sessions instantly without registration.',
            provider: {
              '@type': 'Organization',
              name: 'SilentParcel'
            },
            serviceType: 'Room Creation Service',
            areaServed: 'Worldwide',
            availableChannel: {
              '@type': 'ServiceChannel',
              serviceUrl: 'https://silentparcel.com/rooms/create',
              serviceType: 'Web Application'
            },
            hasOfferCatalog: {
              '@type': 'OfferCatalog',
              name: 'Room Creation Options',
              itemListElement: [
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Anonymous Chat Room',
                    description: 'Create secure chat rooms for anonymous messaging'
                  },
                  price: '0',
                  priceCurrency: 'USD'
                },
                {
                  '@type': 'Offer',
                  itemOffered: {
                    '@type': 'Service',
                    name: 'Collaborative Coding Session',
                    description: 'Create live code editing rooms with real-time collaboration'
                  },
                  price: '0',
                  priceCurrency: 'USD'
                }
              ]
            },
            serviceOutput: {
              '@type': 'Thing',
              name: 'Secure Room Access',
              description: 'Unique room ID and direct link for secure access'
            }
          })
        }}
      />

      {/* Creation Process Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'HowTo',
            name: 'How to Create an Anonymous Chat Room or Coding Session',
            description: 'Step-by-step guide to creating secure, ephemeral rooms for anonymous communication and collaboration.',
            image: 'https://silentparcel.com/api/og?type=room-creation-guide',
            totalTime: 'PT2M',
            estimatedCost: {
              '@type': 'MonetaryAmount',
              currency: 'USD',
              value: '0'
            },
            supply: [
              {
                '@type': 'HowToSupply',
                name: 'Web Browser',
                description: 'Modern web browser with WebRTC support'
              },
              {
                '@type': 'HowToSupply',
                name: 'Internet Connection',
                description: 'Stable internet connection for real-time features'
              }
            ],
            tool: [
              {
                '@type': 'HowToTool',
                name: 'SilentParcel Platform',
                description: 'Anonymous communication and collaboration platform'
              }
            ],
            step: [
              {
                '@type': 'HowToStep',
                position: 1,
                name: 'Choose Room Type',
                text: 'Select between anonymous chat room or collaborative coding session.',
                image: 'https://silentparcel.com/api/og?type=step1-choose-type'
              },
              {
                '@type': 'HowToStep',
                position: 2,
                name: 'Configure Settings',
                text: 'Set room name (optional), expiry time, and privacy preferences.',
                image: 'https://silentparcel.com/api/og?type=step2-configure'
              },
              {
                '@type': 'HowToStep',
                position: 3,
                name: 'Create Room',
                text: 'Click create to generate your secure room with unique ID and link.',
                image: 'https://silentparcel.com/api/og?type=step3-create'
              },
              {
                '@type': 'HowToStep',
                position: 4,
                name: 'Share Access',
                text: 'Share the room ID or direct link with participants.',
                image: 'https://silentparcel.com/api/og?type=step4-share'
              }
            ]
          })
        }}
      />

      {/* Room Types Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Available Room Types',
            description: 'Different types of rooms you can create on SilentParcel',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                item: {
                  '@type': 'Product',
                  name: 'Anonymous Chat Room',
                  description: 'Secure real-time messaging with end-to-end encryption',
                  category: 'Communication',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD'
                  },
                  additionalProperty: [
                    {
                      '@type': 'PropertyValue',
                      name: 'Features',
                      value: 'Real-time messaging, Anonymous usernames, Self-destructing messages, End-to-end encryption'
                    },
                    {
                      '@type': 'PropertyValue',
                      name: 'Duration',
                      value: '30 minutes to 1 hour'
                    },
                    {
                      '@type': 'PropertyValue',
                      name: 'Participants',
                      value: 'Unlimited'
                    }
                  ]
                }
              },
              {
                '@type': 'ListItem',
                position: 2,
                item: {
                  '@type': 'Product',
                  name: 'Collaborative Coding Session',
                  description: 'Live code editing with real-time collaboration and multi-language support',
                  category: 'Development Tools',
                  offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD'
                  },
                  additionalProperty: [
                    {
                      '@type': 'PropertyValue',
                      name: 'Features',
                      value: 'Live code editing, Real-time cursor tracking, Syntax highlighting, Multi-language support, Chat integration'
                    },
                    {
                      '@type': 'PropertyValue',
                      name: 'Languages',
                      value: 'JavaScript, TypeScript, Python, Java, C++, HTML, CSS, JSON, Markdown'
                    },
                    {
                      '@type': 'PropertyValue',
                      name: 'Duration',
                      value: '30 minutes to 1 hour'
                    }
                  ]
                }
              }
            ]
          })
        }}
      />

      {/* Privacy Features Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SecurityPolicy',
            name: 'Room Creation Privacy Policy',
            description: 'Privacy and security measures implemented in room creation process',
            publisher: {
              '@type': 'Organization',
              name: 'SilentParcel'
            },
            securityMeasures: [
              'No registration required',
              'Anonymous room creation',
              'End-to-end encryption',
              'Ephemeral data storage',
              'Automatic room deletion',
              'No personal data collection',
              'Secure room ID generation',
              'WebRTC peer-to-peer communication'
            ],
            dataRetentionPolicy: 'Rooms and all associated data are automatically deleted after expiration time',
            encryptionMethod: 'AES-256 end-to-end encryption',
            anonymityFeatures: [
              'Auto-generated usernames',
              'No IP logging',
              'No message history retention',
              'Temporary session IDs'
            ]
          })
        }}
      />

      {/* Collaboration Features Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Room Creation Interface',
            description: 'User-friendly interface for creating anonymous chat rooms and collaborative coding sessions',
            applicationCategory: 'CommunicationApplication',
            operatingSystem: 'Web Browser',
            softwareVersion: '1.0',
            features: [
              'Intuitive room type selection',
              'Customizable expiry times',
              'Optional room naming',
              'Instant room generation',
              'Shareable room links',
              'Copy-to-clipboard functionality',
              'Mobile-responsive design',
              'Real-time feedback'
            ],
            userInteractionCount: {
              '@type': 'InteractionCounter',
              interactionType: 'CreateAction',
              name: 'Rooms Created'
            },
            author: {
              '@type': 'Organization',
              name: 'SilentParcel'
            }
          })
        }}
      />

      {/* FAQ Schema for Room Creation */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'How quickly can I create a room?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Room creation is instant! Simply choose your room type, configure basic settings, and click create. Your secure room will be ready in seconds with a unique ID and shareable link.'
                }
              },
              {
                '@type': 'Question',
                name: 'Do I need to register to create a room?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No registration is required. You can create anonymous chat rooms and collaborative coding sessions instantly without providing any personal information.'
                }
              },
              {
                '@type': 'Question',
                name: 'What room types can I create?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'You can create two types of rooms: Anonymous Chat Rooms for secure messaging, and Collaborative Coding Sessions for real-time code editing with multi-language support.'
                }
              },
              {
                '@type': 'Question',
                name: 'How long do created rooms last?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Rooms are ephemeral and automatically expire based on your chosen duration: 30 minutes or 1 hour. All data is permanently deleted when the room expires.'
                }
              },
              {
                '@type': 'Question',
                name: 'Can I customize room settings?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Yes! You can set a custom room name (optional), choose the expiry time, select room type, and configure privacy settings. All rooms include end-to-end encryption by default.'
                }
              },
              {
                '@type': 'Question',
                name: 'How do I share my created room?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'After creating a room, you receive a unique room ID and direct link. You can copy either one and share it with participants. The room is instantly accessible to anyone with the credentials.'
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
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Create Room',
                item: 'https://silentparcel.com/rooms/create'
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
export const revalidate = 1800 // Revalidate every 30 minutes