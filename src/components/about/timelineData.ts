interface Milestone {
  year: number;
  title: string;
  description: string;
  details?: string[];
  impact?: string[];
  media?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  comparison?: {
    before: string;
    after: string;
  };
}

export const timelineData = [
  {
    date: "1995-01-01",
    title: "Founded",
    description: "Almona is founded with a vision to provide top-quality industrial machinery.",
  },
  {
    date: "2005-01-01",
    title: "Expansion",
    description: "Expanded our operations to include a wider range of machinery and services.",
  },
  {
    date: "2015-01-01",
    title: "Innovation",
    description: "Introduced new technologies and a state-of-the-art manufacturing process.",
  },
  {
    date: "2023-01-01",
    title: "Digital Transformation",
    description: "Launched our new website and digital platform to better serve our clients.",
  },
];

export const MILESTONES: Milestone[] = [
  {
    year: 1991,
    title: "Company Founded",
    description: "Almona was established in Egypt, setting the foundation for trusted industrial equipment supply and the relationships that would later anchor our YILMAZ partnership.",
    details: [
      "Founded as a local industrial equipment supplier with a quality-first mindset",
      "Laid the groundwork for long-term OEM partnerships across Europe and Asia",
    ],
    impact: [
      "Built early market trust that enabled future exclusive agreements",
      "Created the service DNA that still guides post-sales support today",
    ]
    // Note: Media removed - image file doesn't exist. Add /images/company/founding-1991.jpg if needed.
  },
  {
    year: 1995,
    title: "Global Import Footprint",
    description: "Expanded imports across Slovenia, Malta, Japan, Germany, France, Spain, India and more, bringing diverse industrial brands to Egypt ahead of the YILMAZ era.",
    details: [
      "Diversified sourcing across Slovenia, Malta, Japan, Germany, France, Spain, India, and other hubs",
      "Introduced multiple niche brands to serve specialized fabrication needs",
    ],
    impact: [
      "Broadened catalog coverage and reduced supply risk",
      "Learned multi-brand integration patterns that later benefited the YILMAZ rollout",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/global-imports-1995.jpg',
        thumbnail: '/images/company/global-imports-1995-thumb.jpg'
      }
    ]
  },
  {
    year: 2000,
    title: "YILMAZ Anchor Through Headwinds",
    description: "Weathered the early-2000 economic wave and doubled down on YILMAZ as our core brand, rebuilding momentum with resilient partnerships.",
    details: [
      "Consolidated core lineup around YILMAZ to ensure reliability and parts availability",
      "Strengthened service playbooks during economic turbulence to protect customers",
    ],
    impact: [
      "Stabilized supply during currency shocks and demand dips",
      "Set the stage for long-term exclusive positioning in Egypt",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/yilmaz-resilience-2000.jpg',
        thumbnail: '/images/company/yilmaz-resilience-2000-thumb.jpg'
      }
    ]
  },
  {
    year: 2009,
    title: "Hard Lessons (2008–2010)",
    description: "Faced turbulence with UPVC profile sales via a Turkish partner; emerged with stricter quality gates and a sharper focus on dependable OEMs.",
    details: [
      "Experienced setbacks with a Turkish UPVC profile partner and reinforced QA checks",
      "Refined vendor onboarding and post-sale validation to avoid repeat issues",
    ],
    impact: [
      "Raised quality thresholds for all future partners",
      "Improved customer protection policies and escalation paths",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/lessons-2009.jpg',
        thumbnail: '/images/company/lessons-2009-thumb.jpg'
      }
    ]
  },
  {
    year: 2015,
    title: "Digital Transformation",
    description: "Launched our first digital platform and began integrating modern technology into our operations and customer service.",
    details: [
      "Rolled out the first digital portal for sales and service visibility",
      "Began standardizing data flows for inventory, service, and customer engagement",
    ],
    impact: [
      "Cut service response times and improved inventory accuracy",
      "Created the baseline for later AI- and analytics-enabled workflows",
    ],
    media: [
      {
        type: 'video',
        url: '/videos/company/digital-transformation-2015.mp4',
        thumbnail: '/videos/company/digital-transformation-2015-thumb.jpg'
      }
    ]
  },
  {
    year: 2019,
    title: "Refactoring & Resilience",
    description: "Navigated Egypt’s refactoring waves and the COVID era by tightening operations, protecting service uptime, and preparing for AI-enabled support.",
    details: [
      "Hardened supply and service operations ahead of COVID disruptions",
      "Refactored internal tooling to keep field service responsive under constraints",
    ],
    impact: [
      "Maintained high service uptime despite logistics volatility",
      "Enabled fast pivot to remote-first engagement during COVID",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/resilience-2019.jpg',
        thumbnail: '/images/company/resilience-2019-thumb.jpg'
      }
    ]
  },
  {
    year: 2020,
    title: "AI Integration",
    description: "Introduced AI-powered equipment advisory and predictive maintenance solutions, revolutionizing customer support.",
    details: [
      "Launched AI advisory for equipment selection and maintenance predictions",
      "Started telemetry-driven support for proactive issue detection",
    ],
    impact: [
      "Reduced downtime through predictive maintenance recommendations",
      "Improved equipment fit and ROI via AI-guided advisory",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/ai-integration-2020.jpg',
        thumbnail: '/images/company/ai-integration-2020-thumb.jpg'
      }
    ]
  },
  {
    year: 2024,
    title: "Modern Portfolio Platform",
    description: "Launched our comprehensive digital portfolio with 3D visualization, AR capabilities, and advanced e-commerce features.",
    details: [
      "Delivered 3D/AR product experiences and advanced e-commerce flows",
      "Unified sales, service, and analytics into a single customer portal",
    ],
    impact: [
      "Accelerated customer decision cycles with immersive previews",
      "Streamlined cross-team workflows across sales, service, and operations",
    ],
    media: [
      {
        type: 'image',
        url: '/images/company/modern-platform-2024.jpg',
        thumbnail: '/images/company/modern-platform-2024-thumb.jpg'
      },
      {
        type: 'video',
        url: '/videos/company/platform-demo-2024.mp4',
        thumbnail: '/videos/company/platform-demo-2024-thumb.jpg'
      }
    ]
  }
];
