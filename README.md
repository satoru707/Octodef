# OctoDefender

A cybersecurity defense simulator inspired by the octopus, featuring 8 parallel AI agents for comprehensive threat analysis with stunning 3D visualization.

## ✨ New Features

- **🎨 Modern UI/UX**: Cleaner, more refined interface with Space Grotesk typography
- **🐙 Custom Octopus Logo**: Professional SVG logo with 8 tentacles representing the agents
- **🌟 Stunning 3D Simulation**: Real-time Three.js attack visualization showing threats being intercepted
- **⚡ Enhanced Animations**: Smooth transitions and interactive elements throughout

## Features

- **8 Specialized AI Agents**: Scout, Sentinel, Analyst, Isolator, Remediator, Learner, Alerter, and Orchestrator
- **Multi-Threat Analysis**: Analyze URLs, IP addresses, file hashes, network logs, and email headers
- **Real-Time Processing**: Live agent status tracking with progress bars
- **3D Attack Simulation**: Watch in real-time as the octopus defense system intercepts threats in 3D space
- **Comprehensive Reporting**: Risk scores, findings, visualizations, and remediation steps
- **Simulation Mode**: Test the system with synthetic attacks and stunning visuals
- **Authentication**: Google and GitHub OAuth integration
- **Session Sharing**: Share defense reports with team members
- **Dark Theme**: Sleek, cyberpunk-minimalist design inspired by cristianoronaldo.com

## Tech Stack

- **React** with TypeScript
- **React Router** for navigation
- **React Query** (@tanstack/react-query) for state management
- **Tailwind CSS v4** for styling
- **Three.js** for 3D visualization
- **Recharts** for data visualization
- **Socket.io** for real-time updates
- **Sonner** for toast notifications
- **Zod** for input validation
- **Space Grotesk + Inter** fonts for modern typography

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

## Project Structure

```
/
├── App.tsx                 # Main app with routing
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ThreatInputForm.tsx
│   │   ├── AgentProgressBar.tsx
│   │   ├── ThreatGraph.tsx
│   │   ├── ResultsCard.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorMessage.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/              # Page components
│   │   ├── HomePage.tsx
│   │   ├── SignInPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SessionDetailPage.tsx
│   │   ├── AboutPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── lib/                # Utilities and helpers
│   │   ├── auth.ts         # Mock authentication
│   │   ├── socket.ts       # Socket.io setup
│   │   ├── types.ts        # TypeScript types
│   │   └── mockData.ts     # Mock data generators
│   └── queries/            # React Query hooks
│       └── defenseQueries.ts
├── components/ui/          # shadcn/ui components
└── styles/
    └── globals.css         # Global styles and theme
```

## Key Components

### Dashboard
- Threat input form with validation
- 8 parallel agent progress bars
- Real-time status updates
- Results visualization
- Export and share functionality

### Authentication
- Mock Google and GitHub OAuth
- Protected routes for authenticated users
- Session persistence in localStorage

### Defense Analysis
- Multi-agent parallel processing
- Risk scoring (0-100)
- Severity levels (low, medium, high, critical)
- Threat categorization
- Remediation recommendations

## State Management

The app uses React Query for:
- Caching defense results
- Managing loading and error states
- Automatic refetching
- Mutations for defense and simulation actions

## Styling

- **Dark theme only**: Pure black (#000) backgrounds with subtle gradients
- **Accent colors**: Deep blue (#1e3a8a) and muted green (#065f46, #10b981)
- **Fully responsive**: Mobile-first design
- **Typography**: Space Grotesk for headings, Inter for body text
- **Minimal and clean**: Ample whitespace, subtle borders, rounded corners
- **Animations**: Smooth transitions, pulse effects, and 3D interactions
- **Professional polish**: Inspired by premium sports websites like cristianoronaldo.com

## Backend Integration

The frontend is designed to work with backend API routes:

- `POST /api/defend` - Submit threat for analysis
- `POST /api/simulate` - Trigger simulated attack
- `GET /api/sessions` - Fetch past defense sessions
- `GET /api/session/:id` - Get session details

Socket.io events:
- `agent-update` - Real-time agent progress updates
- `defense-complete` - Analysis completion notification

## Mock Data

Currently uses mock data for demonstration. Replace with actual API calls in production:

1. Update `src/queries/defenseQueries.ts` to call real APIs
2. Configure Socket.io connection in `src/lib/socket.ts`
3. Implement real authentication with NextAuth.js

## License

MIT

## Credits

Built with modern web technologies for cybersecurity professionals.
