/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelho sangue — paleta principal
        blood: {
          50: '#fff1f1',
          100: '#ffdfdf',
          200: '#ffc5c5',
          300: '#ff9d9d',
          400: '#ff6464',
          500: '#f83a3a',
          600: '#e01b1b',
          700: '#bd1212',
          800: '#9b1212',
          900: '#7f1414',
          950: '#460606'
        },
        // Pretos / superfícies (warm near-black "tinta")
        ink: {
          950: '#0b0a09',
          900: '#121110',
          850: '#181715',
          800: '#1e1c1a',
          700: '#2a2723',
          600: '#39352f',
          500: '#56514a'
        },
        // Branco-osso / texto editorial (warm)
        paper: {
          DEFAULT: '#ece8df',
          dim: '#a7a299',
          faint: '#6d685f'
        },
        // Remapeia o cinza para uma escala quente (osso → carvão) — conceito "Almanaque".
        // Warma todo o texto/bordas existentes sem editar componente por componente.
        zinc: {
          50: '#f6f4ee',
          100: '#ece8df',
          200: '#d9d4c8',
          300: '#bbb5a8',
          400: '#928d82',
          500: '#6e695f',
          600: '#534e46',
          700: '#3a362f',
          800: '#24221d',
          900: '#161410',
          950: '#0e0d0a'
        }
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        editorial: ['"Fraunces Variable"', 'Georgia', 'serif']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(224,27,27,0.4), 0 0 24px -4px rgba(224,27,27,0.55)',
        'glow-sm': '0 0 16px -6px rgba(224,27,27,0.6)',
        card: '0 10px 30px -12px rgba(0,0,0,0.8)'
      },
      backgroundImage: {
        'blood-radial': 'radial-gradient(1200px 600px at 50% -20%, rgba(224,27,27,0.18), transparent 60%)',
        'blood-grad': 'linear-gradient(135deg, #e01b1b 0%, #7f1414 100%)'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(224,27,27,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(224,27,27,0)' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out',
        'pulse-glow': 'pulse-glow 1.6s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
