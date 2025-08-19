interface Milestone {
  year: number;
  title: string;
  description: string;
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
    description: "Almona was established as Egypt's first authorized dealer of YILMAZ machines, marking the beginning of our journey in industrial equipment.",
    media: [
      {
        type: 'image',
        url: '/images/company/founding-1991.jpg',
        thumbnail: '/images/company/founding-1991-thumb.jpg'
      }
    ]
  },
  {
    year: 2000,
    title: "YILMAZ Partnership Expansion",
    description: "Strengthened our partnership with YILMAZ, becoming the exclusive distributor for Egypt and expanding our product portfolio significantly.",
    media: [
      {
        type: 'image',
        url: '/images/company/yilmaz-partnership-2000.jpg',
        thumbnail: '/images/company/yilmaz-partnership-2000-thumb.jpg'
      }
    ]
  },
  {
    year: 2010,
    title: "ALFAPEN Profiles Partnership",
    description: "Added ALFAPEN profiles to our product line, providing comprehensive solutions for aluminum and UPVC manufacturing.",
    comparison: {
      before: '/images/company/before-alfapen.jpg',
      after: '/images/company/after-alfapen.jpg'
    }
  },
  {
    year: 2015,
    title: "Digital Transformation",
    description: "Launched our first digital platform and began integrating modern technology into our operations and customer service.",
    media: [
      {
        type: 'video',
        url: '/videos/company/digital-transformation-2015.mp4',
        thumbnail: '/videos/company/digital-transformation-2015-thumb.jpg'
      }
    ]
  },
  {
    year: 2020,
    title: "AI Integration",
    description: "Introduced AI-powered equipment advisory and predictive maintenance solutions, revolutionizing customer support.",
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
