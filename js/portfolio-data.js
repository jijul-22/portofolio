/**
 * Portfolio Data Model for Jidan Juliana
 * Professional Identity: Front-End Developer
 */
const portfolioData = {
  profile: {
    name: "Jidan Juliana",
    shortName: "JIDAN",
    title: "Front-End Developer",
    tagline: "I build modern, responsive, and user-focused web interfaces with a strong interest in clean design, usability, and interactive digital experiences.",
    keywords: ["Front-End Development", "Responsive Web Design", "UI Implementation", "JavaScript", "UI/UX", "Interactive Web Experiences"],
    about: {
      lead: "I'm Jidan Juliana, a Front-End Developer with a background in Information Systems. I enjoy turning designs and ideas into responsive, interactive, and user-friendly web interfaces.",
      body: "My main focus is front-end development, particularly building interfaces that are visually clean, responsive, and comfortable to use. Alongside front-end projects, I have also developed several real-world web applications, giving me practical experience with application architecture, databases, and backend technologies."
    },
    stats: [
      { num: "04+", label: "Projects Built", sub: "Web & UI Systems" },
      { num: "100%", label: "Responsive Design", sub: "Mobile First" },
      { num: "02", label: "Certifications", sub: "Dicoding Indonesia" },
      { num: "∞", label: "Attention to Detail", sub: "User Centered" }
    ],
    pillars: [
      {
        id: "01",
        title: "Front-End Development",
        tag: "Core Focus",
        desc: "Building responsive and interactive web interfaces using modern web technologies with attention to usability, structure, and visual consistency."
      },
      {
        id: "02",
        title: "UI Implementation",
        tag: "Design to Code",
        desc: "Translating designs and concepts into functional interfaces while maintaining responsive layouts and consistent user experiences."
      },
      {
        id: "03",
        title: "Web Applications",
        tag: "Full Systems",
        desc: "Developing practical web applications and information systems when a project requires more than a front-end interface."
      }
    ]
  },

  experience: [
    {
      period: "Internship",
      role: "Web Development Internship",
      company: "BBWS Cimanuk Cisanggarung",
      description: "During my internship at BBWS Cimanuk Cisanggarung, I worked on several web-based projects, including an e-archive application and a personnel website. My responsibilities included interface development, UI/UX implementation, system development, and database integration.",
      focusAreas: [
        "Front-End Development",
        "Website Development",
        "UI/UX Implementation",
        "E-Archive Application Development",
        "Database Integration",
        "Web Application Development"
      ]
    }
  ],

  projects: [
    {
      id: "e-arsip",
      number: "01",
      title: "E-Arsip BBWS Cimanuk Cisanggarung",
      category: "Web Application",
      badge: "Enterprise System",
      role: "Full Stack Developer",
      description: "A web-based archive management application developed to organize archive data, archive locations, electronic documents, and archive borrowing processes.",
      technologies: ["HTML", "CSS", "JavaScript", "PHP", "Laravel", "MySQL"],
      features: [
        "Archive management",
        "Active, inactive, and vital archive categorization",
        "Archive location management",
        "Electronic archive management",
        "Archive borrowing",
        "Archive return management",
        "Search functionality",
        "User and admin roles"
      ],
      github: "",
      demo: "",
      previewType: "app-arch"
    },
    {
      id: "raden-madura",
      number: "02",
      title: "Raden Madura Distro",
      category: "E-Commerce / UMKM Website",
      badge: "Commerce UI",
      role: "Full Stack Developer",
      description: "A web-based clothing sales application developed for Raden Madura Distro, an UMKM business. The project focuses on presenting products through a structured interface and supporting the online purchasing process.",
      technologies: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
      features: [
        "Product catalog",
        "Product detail presentation",
        "Shopping flow",
        "Transaction management",
        "Product management",
        "Responsive interface",
        "User interaction flow"
      ],
      github: "",
      demo: "",
      previewType: "ecommerce"
    },
    {
      id: "cashier-app",
      number: "03",
      title: "Cashier Application",
      category: "Point of Sale",
      badge: "Business Tool",
      role: "Full Stack Developer",
      description: "A web-based cashier application developed to support product management and transaction processes with a streamlined, fast-paced checkout interface.",
      technologies: ["HTML", "CSS", "JavaScript", "PHP", "MySQL"],
      features: [
        "Product management",
        "Transaction interface",
        "Sales records",
        "Cashier workflow",
        "Quick calculation and invoicing"
      ],
      github: "",
      demo: "",
      previewType: "pos"
    },
    {
      id: "frontend-projects",
      number: "04",
      title: "Front-End Projects & UI Experiments",
      category: "Front-End Development",
      badge: "Primary Focus",
      role: "Front-End Developer & UI Engineer",
      description: "A collection of front-end projects focused on responsive layouts, interface design, interaction, and translating visual concepts into functional, high-performance websites.",
      technologies: ["HTML5", "CSS3", "JavaScript", "Figma", "DOM Manipulation", "Responsive Design"],
      features: [
        "Landing page architectures",
        "Company & profile websites",
        "Modern responsive layouts",
        "Pixel-perfect UI implementations",
        "Figma-to-code translations",
        "Interactive JavaScript web experiences"
      ],
      github: "",
      demo: "",
      previewType: "ui-showcase"
    }
  ],

  skills: {
    primary: [
      { name: "HTML5", level: "Semantic Markup & Accessibility", category: "front-end" },
      { name: "CSS3", level: "Flexbox, Grid, Animations, Custom Properties", category: "front-end" },
      { name: "JavaScript", level: "ES6+, DOM Manipulation, Async Logic", category: "front-end" },
      { name: "Responsive Web Design", level: "Mobile-First, Adaptive Systems", category: "front-end" },
      { name: "DOM Manipulation", level: "Dynamic State & Event Handling", category: "front-end" },
      { name: "UI Implementation", level: "Design Fidelity & Micro-Interactions", category: "front-end" }
    ],
    design: [
      { name: "Figma", level: "UI Prototyping & Component Systems", category: "ui-ux" },
      { name: "Wireframing", level: "Information Architecture & Layouts", category: "ui-ux" },
      { name: "Prototyping", level: "Interactive User Flow Validation", category: "ui-ux" },
      { name: "Interface Design", level: "Visual Hierarchy & Typography", category: "ui-ux" },
      { name: "User Experience", level: "Usability & Accessibility Focus", category: "ui-ux" }
    ],
    supporting: [
      { name: "PHP", level: "Server-side script execution", category: "backend" },
      { name: "Laravel", level: "MVC Web Architecture & Routing", category: "backend" },
      { name: "MySQL", level: "Relational Database Design & Queries", category: "backend" }
    ],
    tools: [
      { name: "Visual Studio Code", level: "Primary Development Environment", category: "tools" },
      { name: "Git", level: "Version Control & Branch Management", category: "tools" },
      { name: "GitHub", level: "Repository Hosting & Collaboration", category: "tools" },
      { name: "Laragon", level: "Local Development Server Environment", category: "tools" }
    ]
  },

  certifications: [
    {
      title: "Front-End Web Developer",
      issuer: "Dicoding Indonesia",
      description: "Comprehensive certification covering HTML5, CSS3, responsive web layouts, flexbox, grid, and accessibility standards."
    },
    {
      title: "JavaScript Programming",
      issuer: "Dicoding Indonesia",
      description: "In-depth validation of core JavaScript programming, ES6+ features, functional paradigm, object-oriented concepts, and DOM interactions."
    }
  ],

  education: {
    institution: "Universitas Catur Insan Cendekia",
    program: "Information Systems",
    degree: "Bachelor's Degree Background",
    description: "Academic foundation in information systems architecture, database management, software modeling, and business system analysis, serving as strong analytical backing for front-end engineering."
  },

  contact: {
    heading: "Let's Build Something",
    subtext: "Have a project, collaboration, or opportunity in mind? I'd love to hear about it.",
    email: "jidanjuliana42@gmail.com",
    github: "https://github.com/jijul-22",
    whatsapp: "https://wa.me/6285794282319",
    instagram: "https://instagram.com/jidanjg"
  }
};

if (typeof window !== 'undefined') {
  window.portfolioData = portfolioData;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { portfolioData };
}
