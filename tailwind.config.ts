 
import tailwindRtl from "tailwindcss-rtl";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	safelist: [
		// Keep essential classes that might be dynamically generated
		'bg-almona-orange',
		'text-almona-orange',
		'border-almona-orange',
		'bg-almona-dark',
		'text-almona-dark',
		'border-almona-dark',
		// Green card classes for DXF Direct Import (prevent purging in production)
		'bg-green-900/20',
		'bg-green-900/30',
		'border-green-500/50',
		'text-green-400',
		'border-green-500/30',
		'from-green-500/10',
		'to-blue-500/10',
	],
	corePlugins: {
		// Keep all core plugins as they are being used
		// Disable only truly unused features
		backdropBrightness: false,
		backdropContrast: false,
		backdropGrayscale: false,
		backdropHueRotate: false,
		backdropInvert: false,
		backdropSaturate: false,
		backdropSepia: false,
		brightness: false,
		contrast: false,
		grayscale: false,
		hueRotate: false,
		invert: false,
		saturate: false,
		sepia: false,
	},
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#002D62', // Nile Deep Blue - The Authority
					foreground: '#FFFFFF',
					light: '#003D7A',
					dark: '#001D4A'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: '#D4AF37', // Royal Gold - The Standard
					foreground: '#000000',
					light: '#E5C158',
					dark: '#B8941F'
				},
				canvas: {
					DEFAULT: '#F0F0F0', // Limestone - The Workspace
					foreground: '#000000'
				},
				machine: {
					DEFAULT: '#2C3539', // Iron Grey - The Tech
					foreground: '#FFFFFF'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				almona: {
					// Dark Gold Prestige Theme - Amber/Gold accents
					amber: {
						light: "#fcd34d",    // Amber 300
						DEFAULT: "#fbbf24",   // Amber 400 (Primary prestige accent)
						dark: "#f59e0b",       // Amber 500
						darker: "#d97706"     // Amber 600
					},
					// Legacy orange (deprecated - use amber instead)
					orange: {
						light: "#FF8C00",
						DEFAULT: "#FF5F1F",
						dark: "#E14A00"
					},
					yellow: {
						light: "#FFD54F",
						DEFAULT: "#FFC107",
						dark: "#FFA000"
					},
					dark: {
						lighter: "#242424",
						light: "#1A1A1A",
						DEFAULT: "#121212",
						dark: "#0A0A0A"
					},
				},
				// Semantic Color System (WCAG 2.1 AA)
				'bg-primary': 'rgb(var(--color-bg-primary) / <alpha-value>)',
				'bg-secondary': 'rgb(var(--color-bg-secondary) / <alpha-value>)',
				'bg-card': 'rgb(var(--color-bg-card) / <alpha-value>)',
				'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
				'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
				'text-tertiary': 'rgb(var(--color-text-tertiary) / <alpha-value>)',
				'text-helper': 'rgb(var(--color-text-helper) / <alpha-value>)',
				'border-primary': 'rgb(var(--color-border-primary) / <alpha-value>)',
				'border-accent': 'rgb(var(--color-border-accent) / <alpha-value>)',
				'status-success': 'rgb(var(--color-status-success) / <alpha-value>)',
				'status-warning': 'rgb(var(--color-status-warning) / <alpha-value>)',
				'status-error': 'rgb(var(--color-status-error) / <alpha-value>)',
				'status-info': 'rgb(var(--color-status-info) / <alpha-value>)',
			},
			boxShadow: {
				xs: 'var(--shadow-xs)',
				sm: 'var(--shadow-sm)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				xl: 'var(--shadow-xl)',
				'2xl': 'var(--shadow-xl)', // Fallback to xl for now
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'slide-in': {
					'0%': { transform: 'translateX(-10px)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'stone-slide': {
					'0%': { transform: 'translateY(20px)', opacity: '0', scale: '0.98' },
					'100%': { transform: 'translateY(0)', opacity: '1', scale: '1' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'slide-in': 'slide-in 0.3s ease-out',
				'stone-slide': 'stone-slide 0.5s cubic-bezier(0.4, 0, 0.2, 1)', // Heavy and Precise
			},
			fontFamily: {
				'cairo': ['Cairo', 'sans-serif'], // Headings - Authority
				'mono': ['JetBrains Mono', 'monospace'], // Data - Precision
			},
			backgroundImage: {
				'gradient-orange': 'linear-gradient(90deg, #FF5F1F 0%, #FF8C00 100%)',
				'gradient-dark': 'linear-gradient(180deg, #1A1A1A 0%, #0A0A0A 100%)',
				// Dark Gold Prestige Gradients
				'gradient-gold': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
				'gradient-gold-dark': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
				'gradient-gold-light': 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',
				'gradient-cyan-gold': 'linear-gradient(135deg, #22d3ee 0%, #fbbf24 100%)',
			}
		}
	},
	plugins: [tailwindRtl],
} satisfies Config;
